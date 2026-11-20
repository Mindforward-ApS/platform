import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import { beforeAll, describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.schema";
import { findForbiddenKeys } from "@/server/admin/allowed-fields";
import { employeeDetail, listEmployees, orgOverview, orgPassedPerWeek, orgResponsibles } from "@/server/admin/queries";
import { buildAuthOptions } from "@/server/auth/better-auth";
import { seedModules, seedTracks } from "@/server/content/seed";
import { acceptDpa, DpaError } from "@/server/orgs/dpa";
import { OrgAdminError } from "@/server/orgs/errors";
import {
  createJoinLink,
  disableJoinLink,
  expectedTxtRecord,
  findDomainOrgForUser,
  inviteByEmail,
  joinByDomain,
  joinByLink,
  parseEmailList,
  setDomain,
  verifyDomain,
  type CreateInvitationFn,
} from "@/server/orgs/invitations";
import { assignTrack, deactivateMember, eraseMemberFromOrg, reactivateMember, setJobRole } from "@/server/orgs/members";
import { loadReportData } from "@/server/reports/report";
import { buildReportDocument, reportCsv } from "@/server/reports/render";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const SECRET_PROMPT = `HEMMELIG-PROMPT-${randomUUID()}`;
const SECRET_FEEDBACK = `HEMMELIG-FEEDBACK-${randomUUID()}`;

function makeTestAuth() {
  const options = buildAuthOptions({ db: testDb(), env: parseServerEnv(process.env) });
  return betterAuth({ ...options, plugins: [...options.plugins.filter((p) => p.id !== "next-cookies"), testUtils()] });
}

let auth: ReturnType<typeof makeTestAuth>;
let login: (userId: string) => Promise<Headers>;

beforeAll(async () => {
  await seedTracks(testDb());
  await seedModules(testDb(), new Set());
  auth = makeTestAuth();
  const ctx = (await auth.$context) as unknown as { test: { getAuthHeaders(o: { userId: string }): Promise<Headers> } };
  login = (userId) => ctx.test.getAuthHeaders({ userId });
});

async function business(opts: { dpaAccepted?: boolean } = {}) {
  const [org, owner] = await Promise.all([makeOrg("BUSINESS", opts), makeUser()]);
  const ownerMember = await addMember(org.id, owner.id, "OWNER");
  return { org, owner, ownerMember };
}

/** Real Better Auth invitations (incl. its DPA + seat hooks), as the admin UI does it. */
function betterAuthInviter(organizationId: string, headers: Headers): CreateInvitationFn {
  return async (email, role) => {
    const inv = await auth.api.createInvitation({ headers, body: { email, role, organizationId } });
    return { id: inv.id };
  };
}

async function passModule(organizationId: string, userId: string, slug: string, opts: { score?: number; withSecrets?: boolean } = {}) {
  const db = testDb();
  const mod = await db.module.findUniqueOrThrow({ where: { slug }, select: { id: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, maxPoints: true } } } });
  const version = mod.versions[0]!;
  const score = opts.score ?? 90;
  const assignment = await db.assignment.create({
    data: { organizationId, userId, moduleId: mod.id, source: "SELF", status: "PASSED", bestScorePct: score, passedAt: new Date() },
  });
  const attempt = await db.attempt.create({
    data: {
      organizationId, userId, assignmentId: assignment.id, moduleVersionId: version.id, maxPoints: version.maxPoints,
      status: "COMPLETED", scorePct: score, passed: true, completedAt: new Date(),
      stepResults: opts.withSecrets
        ? { create: [{ stepId: "skriv-prompt", stepType: "PROMPT_TASK", maxPoints: 10, points: 9, promptText: SECRET_PROMPT, aiFeedback: SECRET_FEEDBACK }] }
        : undefined,
    },
  });
  await db.assignment.update({ where: { id: assignment.id }, data: { bestAttemptId: attempt.id } });
  return { assignment, attempt };
}

async function chatgptTrackId() {
  return (await testDb().track.findUniqueOrThrow({ where: { key: "CHATGPT" }, select: { id: true } })).id;
}

describe("parseEmailList", () => {
  it("accepts lines, commas, semicolons and pasted CSV; dedupes and lower-cases", () => {
    expect(parseEmailList("Anna@Firma.dk, bo@firma.dk\nnavn;email\nCarl;carl@firma.dk\nanna@firma.dk")).toEqual(["anna@firma.dk", "bo@firma.dk", "carl@firma.dk"]);
  });
});

describe("DPA before the first invitation (docs/10 § 1.2)", () => {
  it("blocks Better Auth email invitations, batch invitations and join links until the OWNER accepts", async () => {
    const { org, owner } = await business({ dpaAccepted: false });
    const headers = await login(owner.id);
    await expect(auth.api.createInvitation({ headers, body: { email: `a-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } })).rejects.toThrow(/DPA_REQUIRED/);
    await expect(inviteByEmail(testDb(), betterAuthInviter(org.id, headers), { organizationId: org.id, actorUserId: owner.id, raw: "x@example.test", role: "LEARNER" })).rejects.toMatchObject({ code: "DPA_REQUIRED" });
    await expect(createJoinLink(testDb(), { organizationId: org.id, actorUserId: owner.id })).rejects.toMatchObject({ code: "DPA_REQUIRED" });
    expect(await testDb().invitation.count({ where: { organizationId: org.id } })).toBe(0);

    const input = { signerName: "Olivia Ejer", signerTitle: "Direktør", cvr: "12345678", accept: "on" as const };
    await acceptDpa(testDb(), { organizationId: org.id, userId: owner.id, input });
    const row = await testDb().organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(row.dpaAcceptedAt).not.toBeNull();
    expect(row.dpaVersion).toBe("dpa.v1");
    const audit = await testDb().auditLog.findFirstOrThrow({ where: { action: "DPA_ACCEPTED", organizationId: org.id } });
    expect(audit.metadata).toMatchObject({ version: "dpa.v1", signerName: "Olivia Ejer", signerTitle: "Direktør", cvr: "12345678" });

    const r = await inviteByEmail(testDb(), betterAuthInviter(org.id, headers), { organizationId: org.id, actorUserId: owner.id, raw: `ok-${randomUUID()}@example.test`, role: "LEARNER" });
    expect(r.sent).toHaveLength(1);
  });

  it("only the OWNER can accept (an ADMIN cannot)", async () => {
    const { org } = await business({ dpaAccepted: false });
    const admin = await makeUser();
    await addMember(org.id, admin.id, "ADMIN");
    await expect(acceptDpa(testDb(), { organizationId: org.id, userId: admin.id, input: { signerName: "A B", signerTitle: "HR", cvr: "12345678", accept: "on" } })).rejects.toBeInstanceOf(DpaError);
  });
});

describe("seat cap: active memberships + open invitations ≤ seats", () => {
  it("rejects an invitation over the cap with a Danish explanation (Better Auth hook + batch)", async () => {
    const { org, owner } = await business(); // trial-like org: 5 seats, owner uses 1
    const headers = await login(owner.id);
    const four = Array.from({ length: 4 }, (_, i) => `s${i}-${randomUUID()}@example.test`).join("\n");
    expect((await inviteByEmail(testDb(), betterAuthInviter(org.id, headers), { organizationId: org.id, actorUserId: owner.id, raw: four, role: "LEARNER" })).sent).toHaveLength(4);

    const err = await inviteByEmail(testDb(), betterAuthInviter(org.id, headers), { organizationId: org.id, actorUserId: owner.id, raw: `over-${randomUUID()}@example.test`, role: "LEARNER" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OrgAdminError);
    expect((err as OrgAdminError).code).toBe("SEAT_LIMIT_REACHED");
    expect((err as OrgAdminError).message).toContain("Alle 5 pladser er i brug");
    // The Better Auth hook (M6) rejects too, so no path around the batch check exists.
    await expect(auth.api.createInvitation({ headers, body: { email: `direct-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } })).rejects.toThrow(/pladser/);
    expect(await testDb().invitation.count({ where: { organizationId: org.id, status: "pending" } })).toBe(4);
  });

  it("rejects a batch bigger than the free seats as a whole and says how many are free", async () => {
    const { org, owner } = await business();
    const raw = Array.from({ length: 6 }, (_, i) => `b${i}-${randomUUID()}@example.test`).join(",");
    const err = (await inviteByEmail(testDb(), betterAuthInviter(org.id, await login(owner.id)), { organizationId: org.id, actorUserId: owner.id, raw, role: "LEARNER" }).catch((e: unknown) => e)) as OrgAdminError;
    expect(err.code).toBe("SEAT_LIMIT_REACHED");
    expect(err.message).toContain("4 ledige pladser af 5");
    expect(await testDb().invitation.count({ where: { organizationId: org.id } })).toBe(0);
  });

  it("deactivating a member frees the seat; reactivating needs a free seat", async () => {
    const { org, owner } = await business();
    const members = await Promise.all(Array.from({ length: 4 }, () => makeUser()));
    const rows = await Promise.all(members.map((u) => addMember(org.id, u.id, "LEARNER")));
    const scope = { organizationId: org.id, actorUserId: owner.id };
    const late = await makeUser();
    const token = await createJoinLink(testDb(), scope);
    await expect(joinByLink(testDb(), token, late.id)).rejects.toMatchObject({ code: "SEAT_LIMIT_REACHED" });
    await deactivateMember(testDb(), scope, rows[0]!.id);
    await joinByLink(testDb(), token, late.id);
    await expect(reactivateMember(testDb(), scope, rows[0]!.id)).rejects.toMatchObject({ code: "SEAT_LIMIT_REACHED" });
    expect(await testDb().auditLog.count({ where: { organizationId: org.id, action: { in: ["MEMBER_DEACTIVATED", "MEMBER_JOINED_BY_LINK"] } } })).toBe(2);
  });

  it("the OWNER cannot be removed", async () => {
    const { org, owner, ownerMember } = await business();
    await expect(deactivateMember(testDb(), { organizationId: org.id, actorUserId: owner.id }, ownerMember.id)).rejects.toMatchObject({ code: "OWNER_PROTECTED" });
  });
});

describe("invitation track + job role", () => {
  it("applies the invitation's track and job role when it is accepted", async () => {
    const { org, owner } = await business();
    const trackId = await chatgptTrackId();
    const email = `t-${randomUUID()}@example.test`;
    await inviteByEmail(testDb(), betterAuthInviter(org.id, await login(owner.id)), { organizationId: org.id, actorUserId: owner.id, raw: email, role: "LEARNER", trackId, jobRole: "SALES" });
    const invitation = await testDb().invitation.findFirstOrThrow({ where: { organizationId: org.id, email } });
    expect(invitation).toMatchObject({ trackId, jobRole: "SALES" });
    const invitee = await makeUser(email);
    await auth.api.acceptInvitation({ headers: await login(invitee.id), body: { invitationId: invitation.id } });
    expect(await testDb().membership.findFirstOrThrow({ where: { organizationId: org.id, userId: invitee.id } })).toMatchObject({ role: "LEARNER", jobRole: "SALES" });
    expect(await testDb().trackEnrollment.count({ where: { organizationId: org.id, userId: invitee.id, trackId, active: true } })).toBe(1);
  });
});

describe("join link", () => {
  it("joins with a valid link; a reset or disabled link stops working; the token is stored hashed", async () => {
    const { org, owner } = await business();
    const scope = { organizationId: org.id, actorUserId: owner.id };
    const first = await createJoinLink(testDb(), scope);
    const stored = await testDb().organization.findUniqueOrThrow({ where: { id: org.id }, select: { joinLinkTokenHash: true } });
    expect(stored.joinLinkTokenHash).not.toContain(first);
    const second = await createJoinLink(testDb(), scope); // reset
    const u = await makeUser();
    await expect(joinByLink(testDb(), first, u.id)).rejects.toMatchObject({ code: "LINK_INVALID" });
    await joinByLink(testDb(), second, u.id);
    await expect(joinByLink(testDb(), second, u.id)).rejects.toMatchObject({ code: "ALREADY_MEMBER" });
    await disableJoinLink(testDb(), scope);
    await expect(joinByLink(testDb(), second, (await makeUser()).id)).rejects.toMatchObject({ code: "LINK_INVALID" });
  });
});

describe("verified domain join", () => {
  it("requires a verified domain (DNS TXT via injected resolver) and a verified email on that domain", async () => {
    const { org, owner } = await business();
    const scope = { organizationId: org.id, actorUserId: owner.id };
    const domain = `firma-${randomUUID().slice(0, 8)}.example`;
    await expect(setDomain(testDb(), { ...scope, domain: "gmail.com" })).rejects.toMatchObject({ code: "DOMAIN_PUBLIC" });
    const { token } = await setDomain(testDb(), { ...scope, domain: `https://www.${domain}/` });

    const employee = await makeUser(`ansat-${randomUUID().slice(0, 6)}@${domain}`);
    await expect(joinByDomain(testDb(), org.id, employee)).rejects.toMatchObject({ code: "DOMAIN_NOT_VERIFIED" });
    expect(await findDomainOrgForUser(testDb(), employee)).toBeNull();

    const lookups: string[] = [];
    const wrong = await verifyDomain(testDb(), async (h) => (lookups.push(h), [["mindforward-verify=forkert"]]), scope);
    expect(wrong.verified).toBe(false);
    const ok = await verifyDomain(testDb(), async () => [["v=spf1 -all"], [expectedTxtRecord(token).slice(0, 10), expectedTxtRecord(token).slice(10)]], scope);
    expect(ok.verified).toBe(true);
    expect(lookups).toEqual([domain]);

    const unverifiedEmail = await testDb().user.create({ data: { id: randomUUID(), name: "U", email: `u-${randomUUID().slice(0, 6)}@${domain}`, emailVerified: false } });
    await expect(joinByDomain(testDb(), org.id, unverifiedEmail)).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    const outsider = await makeUser();
    await expect(joinByDomain(testDb(), org.id, outsider)).rejects.toMatchObject({ code: "DOMAIN_MISMATCH" });

    expect(await findDomainOrgForUser(testDb(), employee)).toMatchObject({ id: org.id });
    await joinByDomain(testDb(), org.id, employee);
    expect(await testDb().membership.count({ where: { organizationId: org.id, userId: employee.id, role: "LEARNER" } })).toBe(1);
  });

  it("a domain claimed by one org cannot be claimed by another", async () => {
    const a = await business();
    const b = await business();
    const domain = `delt-${randomUUID().slice(0, 8)}.example`;
    await setDomain(testDb(), { organizationId: a.org.id, actorUserId: a.owner.id, domain });
    await expect(setDomain(testDb(), { organizationId: b.org.id, actorUserId: b.owner.id, domain })).rejects.toMatchObject({ code: "DOMAIN_TAKEN" });
  });
});

describe("admin queries: org-scoped, never free text (roadmap M7)", () => {
  it("admin in org A cannot see org B; no prompt text, feedback or forbidden fields anywhere", async () => {
    const a = await business();
    const b = await business();
    const learnerA = await makeUser();
    const learnerB = await makeUser();
    const memberA = await addMember(a.org.id, learnerA.id, "LEARNER");
    const memberB = await addMember(b.org.id, learnerB.id, "LEARNER");
    await passModule(a.org.id, learnerA.id, "core-prompt-01", { withSecrets: true, score: 85 });
    await passModule(b.org.id, learnerB.id, "core-prompt-01", { withSecrets: true });

    const list = await listEmployees(testDb(), a.org.id);
    expect(list.rows.map((r) => r.email).sort()).toEqual([a.owner.email, learnerA.email].sort());
    const rowA = list.rows.find((r) => r.email === learnerA.email)!;
    expect(rowA).toMatchObject({ status: "IN_PROGRESS", passedCount: 1, avgBestScorePct: 85 });

    expect(await employeeDetail(testDb(), a.org.id, { memberId: memberB.id })).toBeNull(); // cross-org id
    const detail = await employeeDetail(testDb(), a.org.id, { memberId: memberA.id });
    expect(detail?.modules).toEqual([expect.objectContaining({ slug: "core-prompt-01", status: "PASSED", bestScorePct: 85 })]);

    const overview = await orgOverview(testDb(), a.org.id, a.owner.id);
    expect(overview).toMatchObject({ active: 2, withPassed: 1 });

    const now = new Date();
    const report = await loadReportData(testDb(), { organizationId: a.org.id, from: new Date(now.getTime() - 86400_000), to: new Date(now.getTime() + 86400_000) });
    expect(report.employees.map((e) => e.email)).not.toContain(learnerB.email);
    const csv = reportCsv(buildReportDocument(report));

    for (const out of [list, detail, overview, report]) {
      expect(findForbiddenKeys(out)).toEqual([]);
      const json = JSON.stringify(out);
      expect(json).not.toContain(SECRET_PROMPT);
      expect(json).not.toContain(SECRET_FEEDBACK);
      expect(json).not.toContain(learnerB.email);
    }
    expect(csv).not.toContain(SECRET_PROMPT);
    expect(csv).toContain(learnerA.email);
  });

  it("passed per week and responsibles: org-scoped aggregates, active members only", async () => {
    const a = await business();
    const b = await business();
    const [learner, leaver, admin, other] = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser()]);
    await addMember(a.org.id, learner.id, "LEARNER");
    const leaverMember = await addMember(a.org.id, leaver.id, "LEARNER");
    await addMember(a.org.id, admin.id, "ADMIN");
    await addMember(b.org.id, other.id, "LEARNER");
    await passModule(a.org.id, learner.id, "core-prompt-01", { score: 80 });
    await passModule(a.org.id, learner.id, "core-llm-01", { score: 90 });
    await passModule(a.org.id, leaver.id, "core-prompt-01", { score: 50 });
    await passModule(b.org.id, other.id, "core-prompt-01", { score: 10 });
    await testDb().membership.update({ where: { id: leaverMember.id }, data: { deactivatedAt: new Date() } });

    const weekly = await orgPassedPerWeek(testDb(), a.org.id, new Date(), 12);
    expect(weekly.weeks).toHaveLength(12);
    expect(weekly.weeks.at(-1)).toMatchObject({ passed: 2, avgScorePct: 85 });
    expect(weekly).toMatchObject({ passedInWindow: 2, avgBestScorePct: 85 });
    expect(findForbiddenKeys(weekly)).toEqual([]);

    const people = await orgResponsibles(testDb(), a.org.id);
    expect(people.map((p) => [p.email, p.role])).toEqual([
      [a.owner.email, "OWNER"],
      [admin.email, "ADMIN"],
    ]);
  });

  it("paginates with a cursor and filters by track and job role", async () => {
    const { org, owner } = await business();
    const trackId = await chatgptTrackId();
    const scope = { organizationId: org.id, actorUserId: owner.id };
    const users = await Promise.all(Array.from({ length: 3 }, () => makeUser()));
    const members = [];
    for (const u of users) members.push(await addMember(org.id, u.id, "LEARNER"));
    await assignTrack(testDb(), scope, members[0]!.id, trackId, null);
    await setJobRole(testDb(), scope, members[1]!.id, "HR");

    const page1 = await listEmployees(testDb(), org.id, { take: 2 });
    expect(page1.rows).toHaveLength(2);
    expect(page1.nextCursor).not.toBeNull();
    const page2 = await listEmployees(testDb(), org.id, { take: 2, cursor: page1.nextCursor! });
    expect(page2.rows).toHaveLength(2);
    expect(page2.nextCursor).toBeNull();
    expect(new Set([...page1.rows, ...page2.rows].map((r) => r.memberId)).size).toBe(4);

    expect((await listEmployees(testDb(), org.id, { filter: { trackId } })).rows.map((r) => r.memberId)).toEqual([members[0]!.id]);
    expect((await listEmployees(testDb(), org.id, { filter: { jobRole: "HR" } })).rows.map((r) => r.memberId)).toEqual([members[1]!.id]);
    expect(await testDb().auditLog.count({ where: { organizationId: org.id, action: { in: ["MEMBER_TRACK_ASSIGNED", "MEMBER_JOB_ROLE_CHANGED"] } } })).toBe(2);
  });

  it("member management is org-scoped (a member id from another org is NOT_FOUND)", async () => {
    const a = await business();
    const b = await business();
    const other = await addMember(b.org.id, (await makeUser()).id, "LEARNER");
    const scope = { organizationId: a.org.id, actorUserId: a.owner.id };
    await expect(deactivateMember(testDb(), scope, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(eraseMemberFromOrg(testDb(), scope, other.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(assignTrack(testDb(), scope, other.id, null, null)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("erasing an employee's data deletes learning data in this org only", async () => {
    const a = await business();
    const b = await business();
    const learner = await makeUser();
    const inA = await addMember(a.org.id, learner.id, "LEARNER");
    await addMember(b.org.id, learner.id, "LEARNER");
    await passModule(a.org.id, learner.id, "core-llm-01", { withSecrets: true });
    await passModule(b.org.id, learner.id, "core-llm-01");
    await eraseMemberFromOrg(testDb(), { organizationId: a.org.id, actorUserId: a.owner.id }, inA.id);
    expect(await testDb().attempt.count({ where: { userId: learner.id, organizationId: a.org.id } })).toBe(0);
    expect(await testDb().stepResult.count({ where: { promptText: SECRET_PROMPT, attempt: { userId: learner.id } } })).toBe(0);
    expect(await testDb().attempt.count({ where: { userId: learner.id, organizationId: b.org.id } })).toBe(1);
    expect(await testDb().membership.count({ where: { userId: learner.id } })).toBe(1);
    expect(await testDb().auditLog.count({ where: { action: "MEMBER_DATA_ERASED", organizationId: a.org.id } })).toBe(1);
  });
});

