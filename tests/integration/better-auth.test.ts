import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { beforeAll, describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.schema";
import { buildAuthOptions } from "@/server/auth/better-auth";
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

describe("magic link", () => {
  it("limits requests per email (5 / 15 min) regardless of case", async () => {
    const email = `ml-${randomUUID()}@example.test`;
    for (let i = 0; i < 5; i++) await auth.api.signInMagicLink({ body: { email: i % 2 ? email.toUpperCase() : email, callbackURL: "/start" }, headers: new Headers() });
    await expect(auth.api.signInMagicLink({ body: { email, callbackURL: "/start" }, headers: new Headers() })).rejects.toThrow();
    expect(await testDb().emailMessage.count({ where: { toEmail: email, template: "magic-link" } })).toBe(5);
  });
});
