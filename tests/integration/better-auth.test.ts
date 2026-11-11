import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { beforeAll, describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.schema";
import { buildAuthOptions } from "@/server/auth/better-auth";
import { openPendingLogin, sealPendingLogin, sendLoginCode, verifyLoginCode } from "@/server/auth/login-code";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

function makeTestAuth() {
  const options = buildAuthOptions({ db: testDb(), env: parseServerEnv(process.env) });
  return betterAuth({ ...options, plugins: [...options.plugins.filter((p) => p.id !== "next-cookies"), testUtils()] });
}

let auth: ReturnType<typeof makeTestAuth>;
let login: (userId: string) => Promise<Headers>;

beforeAll(async () => {
  auth = makeTestAuth();
  const ctx = (await auth.$context) as unknown as { test: { getAuthHeaders(o: { userId: string }): Promise<Headers> } };
  login = (userId) => ctx.test.getAuthHeaders({ userId });
});

async function businessWithOwner() {
  const [org, owner] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
  await addMember(org.id, owner.id, "OWNER");
  return { org, owner, ownerHeaders: await login(owner.id) };
}

describe("invitations (Better Auth organization plugin)", () => {
  it("OWNER invites by email; the invited user accepts and lands as LEARNER", async () => {
    const { org, ownerHeaders } = await businessWithOwner();
    const email = `new-${randomUUID()}@example.test`;
    const invitation = await auth.api.createInvitation({ headers: ownerHeaders, body: { email, role: "LEARNER", organizationId: org.id } });
    expect(invitation).toMatchObject({ email, role: "LEARNER", status: "pending" });
    expect(await testDb().auditLog.count({ where: { action: "INVITATION_CREATED", targetId: invitation.id } })).toBe(1);
    expect(await testDb().emailMessage.count({ where: { idempotencyKey: `invite:${invitation.id}`, category: "SERVICE" } })).toBe(1);

    const invitee = await makeUser(email);
    await auth.api.acceptInvitation({ headers: await login(invitee.id), body: { invitationId: invitation.id } });
    expect(await testDb().membership.findFirstOrThrow({ where: { organizationId: org.id, userId: invitee.id } })).toMatchObject({ role: "LEARNER" });
    expect(await testDb().auditLog.count({ where: { action: "MEMBER_JOINED", organizationId: org.id, actorUserId: invitee.id } })).toBe(1);
  });

  it("does not let a different user accept someone else's invitation", async () => {
    const { org, ownerHeaders } = await businessWithOwner();
    const invitation = await auth.api.createInvitation({ headers: ownerHeaders, body: { email: `x-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } });
    const stranger = await makeUser();
    await expect(auth.api.acceptInvitation({ headers: await login(stranger.id), body: { invitationId: invitation.id } })).rejects.toThrow();
    expect(await testDb().membership.count({ where: { organizationId: org.id, userId: stranger.id } })).toBe(0);
  });

  it("rejects invitations from a LEARNER", async () => {
    const { org } = await businessWithOwner();
    const learner = await makeUser();
    await addMember(org.id, learner.id, "LEARNER");
    await expect(
      auth.api.createInvitation({ headers: await login(learner.id), body: { email: `y-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } }),
    ).rejects.toThrow();
  });

  it("rejects an OWNER of org A inviting into org B (cross-org)", async () => {
    const a = await businessWithOwner();
    const b = await businessWithOwner();
    await expect(
      auth.api.createInvitation({ headers: a.ownerHeaders, body: { email: `z-${randomUUID()}@example.test`, role: "LEARNER", organizationId: b.org.id } }),
    ).rejects.toThrow();
  });
});

describe("PERSONAL orgs", () => {
  it("rejects invitations into a PERSONAL (B2C) org, even from its OWNER", async () => {
    const [org, owner] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
    await addMember(org.id, owner.id, "OWNER");
    await expect(
      auth.api.createInvitation({ headers: await login(owner.id), body: { email: `p-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } }),
    ).rejects.toThrow();
    expect(await testDb().invitation.count({ where: { organizationId: org.id } })).toBe(0);
  });
});

describe("role changes", () => {
  it("writes MEMBER_ROLE_CHANGED with the acting user", async () => {
    const { org, owner, ownerHeaders } = await businessWithOwner();
    const learner = await makeUser();
    const m = await addMember(org.id, learner.id, "LEARNER");
    await auth.api.updateMemberRole({ headers: ownerHeaders, body: { memberId: m.id, role: "ADMIN", organizationId: org.id } });
    const row = await testDb().auditLog.findFirstOrThrow({ where: { action: "MEMBER_ROLE_CHANGED", targetId: m.id } });
    expect(row).toMatchObject({ actorUserId: owner.id, organizationId: org.id });
    expect(row.metadata).toMatchObject({ newRole: "ADMIN" });
  });

  it("does not let an ADMIN change roles", async () => {
    const { org } = await businessWithOwner();
    const [admin, learner] = await Promise.all([makeUser(), makeUser()]);
    await addMember(org.id, admin.id, "ADMIN");
    const m = await addMember(org.id, learner.id, "LEARNER");
    await expect(auth.api.updateMemberRole({ headers: await login(admin.id), body: { memberId: m.id, role: "OWNER", organizationId: org.id } })).rejects.toThrow();
    expect((await testDb().membership.findUniqueOrThrow({ where: { id: m.id } })).role).toBe("LEARNER");
  });

  it("refuses to demote the last OWNER", async () => {
    const { org, owner, ownerHeaders } = await businessWithOwner();
    const ownerMembership = await testDb().membership.findFirstOrThrow({ where: { organizationId: org.id, userId: owner.id } });
    await expect(auth.api.updateMemberRole({ headers: ownerHeaders, body: { memberId: ownerMembership.id, role: "LEARNER", organizationId: org.id } })).rejects.toThrow();
  });
});

describe("email code (emailOTP, replaced the magic link 11 Nov 2026)", () => {
  const headers = () => new Headers({ "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
  // A fresh client IP per call: the per-IP limits live in the shared test database across runs.
  const rip = () => `198.51.100.${randomUUID()}`;
  const code = (email: string) => auth.api.createVerificationOTP({ body: { email, type: "sign-in" } });

  it("limits code mails per email (5 / 15 min) regardless of case, also for direct plugin calls", async () => {
    const email = `otp-${randomUUID()}@example.test`;
    for (let i = 0; i < 5; i++) await auth.api.sendVerificationOTP({ body: { email: i % 2 ? email.toUpperCase() : email, type: "sign-in" }, headers: new Headers() });
    // The plugin swallows the callback's error (no mail is sent); the app's own flow tells the user.
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" }, headers: new Headers() });
    expect(await testDb().emailMessage.count({ where: { toEmail: email, template: "login-code" } })).toBe(5);
    expect(await sendLoginCode(testDb(), auth.api, { email, ip: rip(), headers: new Headers() })).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("never stores the code: the mail subject has no digits and the verification value is hashed", async () => {
    const email = `otp-${randomUUID()}@example.test`;
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" }, headers: new Headers() });
    const mail = await testDb().emailMessage.findFirstOrThrow({ where: { toEmail: email, template: "login-code" } });
    expect(mail.subject).not.toMatch(/\d{6}/);
    const row = await testDb().verification.findFirstOrThrow({ where: { identifier: { contains: email } } });
    expect(row.value).not.toMatch(/^\d{6}:/);
  });

  it("signs up a new address on the first correct code (verified email, name from the form)", async () => {
    const email = `new-${randomUUID()}@example.test`;
    const otp = await code(email);
    const res = await verifyLoginCode(testDb(), auth.api, { email, code: otp, ip: rip(), headers: headers(), name: "Sofie Hansen" });
    expect(res).toMatchObject({ ok: true, created: true });
    const user = await testDb().user.findUniqueOrThrow({ where: { email } });
    expect(user).toMatchObject({ name: "Sofie Hansen", emailVerified: true });
  });

  it("signs in an existing user without creating a new one", async () => {
    const existing = await makeUser();
    const otp = await code(existing.email);
    const res = await verifyLoginCode(testDb(), auth.api, { email: existing.email, code: otp, ip: rip(), headers: headers() });
    expect(res).toMatchObject({ ok: true, userId: existing.id, created: false });
    if (res.ok) expect(await testDb().session.count({ where: { token: res.sessionToken, userId: existing.id } })).toBe(1);
  });

  it("rejects a wrong code, and the code dies after 5 wrong tries", async () => {
    const email = `wrong-${randomUUID()}@example.test`;
    const otp = await code(email);
    const wrong = otp === "000000" ? "111111" : "000000";
    expect(await verifyLoginCode(testDb(), auth.api, { email, code: wrong, ip: rip(), headers: headers() })).toEqual({ ok: false, error: "INVALID" });
    for (let i = 0; i < 4; i++) await verifyLoginCode(testDb(), auth.api, { email, code: wrong, ip: rip(), headers: headers() });
    expect(await verifyLoginCode(testDb(), auth.api, { email, code: otp, ip: rip(), headers: headers() })).toEqual({ ok: false, error: "EXPIRED" });
    expect(await testDb().user.count({ where: { email } })).toBe(0);
  });

  it("limits code checks per email (10 / 15 min)", async () => {
    const email = `brute-${randomUUID()}@example.test`;
    await code(email);
    for (let i = 0; i < 10; i++) await verifyLoginCode(testDb(), auth.api, { email, code: "999999", ip: rip(), headers: headers() });
    expect(await verifyLoginCode(testDb(), auth.api, { email, code: "999999", ip: rip(), headers: headers() })).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("limits code requests per IP (50 / hour) in the app's own flow", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 250)}-${randomUUID().slice(0, 6)}`;
    const send = (i: number) => sendLoginCode(testDb(), auth.api, { email: `ip-${i}-${randomUUID()}@example.test`, ip, headers: new Headers() });
    for (let i = 0; i < 50; i++) expect(await send(i)).toEqual({ ok: true });
    expect(await send(50)).toEqual({ ok: false, error: "RATE_LIMITED" });
  });

  it("seals the pending sign-up in the cookie and refuses a tampered or foreign value", () => {
    const secret = "integration-test-secret-integration-test";
    const sealed = sealPendingLogin({ email: "a@example.test", next: "/deltag/abc", kind: "privat", signup: { firstName: "A", lastName: "B", phone: "+4512345678" } }, secret);
    expect(sealed).not.toContain("a@example.test");
    expect(openPendingLogin(sealed, secret)).toMatchObject({ email: "a@example.test", next: "/deltag/abc", kind: "privat" });
    expect(openPendingLogin(`${sealed.slice(0, -2)}xx`, secret)).toBeNull();
    expect(openPendingLogin(sealed, "another-secret-another-secret-another")).toBeNull();
    // An unsafe next path is dropped.
    expect(openPendingLogin(sealPendingLogin({ email: "a@example.test", next: "//evil.example" }, secret), secret)?.next).toBeNull();
  });
});
