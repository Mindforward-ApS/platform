import { beforeAll, describe, expect, it } from "vitest";
import { CERTIFICATE_LEVELS } from "@/lib/config/certificates";
import { listEmployees } from "@/server/admin/queries";
import { checkAndIssueCertificates } from "@/server/certificates/service";
import { decideTransfer, pendingTransferOffers, TransferError } from "@/server/certificates/transfer";
import { seedModules, seedTracks } from "@/server/content/seed";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Carry passed modules and certificates between a learner's own accounts (private ↔ company).
// Only the learner decides; nothing moves without an ACCEPTED decision; the certificate is never re-issued.

const level1 = CERTIFICATE_LEVELS[0]!;

beforeAll(async () => {
  await seedTracks(testDb());
  await seedModules(testDb(), new Set());
});

async function passModule(organizationId: string, userId: string, slug: string, passedAt = new Date("2026-09-01T10:00:00Z")) {
  const db = testDb();
  const mod = await db.module.findUniqueOrThrow({ where: { slug }, select: { id: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, maxPoints: true } } } });
  const assignment = await db.assignment.create({ data: { organizationId, userId, moduleId: mod.id, source: "SELF", status: "PASSED", bestScorePct: 88, passedAt } });
  const attempt = await db.attempt.create({
    data: { organizationId, userId, assignmentId: assignment.id, moduleVersionId: mod.versions[0]!.id, maxPoints: mod.versions[0]!.maxPoints, status: "COMPLETED", scorePct: 88, passed: true, completedAt: passedAt },
  });
  await db.assignment.update({ where: { id: assignment.id }, data: { bestAttemptId: attempt.id } });
  return assignment;
}

/** A learner who completed level 1 privately, then joined a company on the same track. */
async function privateLearnerJoinsCompany() {
  const db = testDb();
  const [personal, company, owner, learner] = await Promise.all([makeOrg("PERSONAL"), makeOrg("BUSINESS"), makeUser(), makeUser()]);
  await addMember(personal.id, learner.id, "OWNER");
  await addMember(company.id, owner.id, "OWNER");
  await addMember(company.id, learner.id, "LEARNER");
  const track = await db.track.findUniqueOrThrow({ where: { key: "CHATGPT" } });
  for (const orgId of [personal.id, company.id]) await db.trackEnrollment.create({ data: { organizationId: orgId, userId: learner.id, trackId: track.id } });
  for (const slug of level1.requiredModules) await passModule(personal.id, learner.id, slug);
  const [cert] = await checkAndIssueCertificates(db, { userId: learner.id, organizationId: personal.id });
  return { personal, company, owner, learner, track, cert: cert! };
}

describe("certificate transfer between a learner's own accounts", () => {
  it("offers the private account's passed modules and certificate in the company, and nothing is shared before the learner decides", async () => {
    const { personal, company, learner } = await privateLearnerJoinsCompany();
    const offers = await pendingTransferOffers(testDb(), learner.id, company.id);
    expect(offers).toEqual([{ fromOrganizationId: personal.id, fromType: "PERSONAL", fromName: personal.name, modules: level1.requiredModules.length, certificates: 1 }]);

    // The employer sees nothing yet.
    const { rows } = await listEmployees(testDb(), company.id);
    const row = rows.find((r) => r.email === learner.email)!;
    expect(row.passedCount).toBe(0);
    expect(row.certificates).toEqual([]);
  });

  it("on yes: modules count as passed in the company (with original date), the same certificate is shown, and no new one is issued", async () => {
    const { personal, company, learner, cert } = await privateLearnerJoinsCompany();
    const result = await decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: true });
    expect(result).toEqual({ modulesCarried: level1.requiredModules.length, certificatesShared: 1 });

    const carried = await testDb().assignment.findMany({ where: { organizationId: company.id, userId: learner.id } });
    expect(carried).toHaveLength(level1.requiredModules.length);
    expect(carried.every((a) => a.status === "PASSED" && a.source === "CARRIED_OVER" && a.carriedFromAssignmentId && a.passedAt?.toISOString() === "2026-09-01T10:00:00.000Z")).toBe(true);
    // No attempts (and so no prompt texts) are copied into the company.
    expect(await testDb().attempt.count({ where: { organizationId: company.id, userId: learner.id } })).toBe(0);

    expect(await checkAndIssueCertificates(testDb(), { userId: learner.id, organizationId: company.id })).toEqual([]);
    expect(await testDb().certificate.count({ where: { userId: learner.id } })).toBe(1);

    const { rows } = await listEmployees(testDb(), company.id);
    const row = rows.find((r) => r.email === learner.email)!;
    expect(row.passedCount).toBe(level1.requiredModules.length);
    expect(row.status).toBe("CERTIFIED");
    expect(row.certificates).toEqual([expect.objectContaining({ levelLabel: cert.levelLabel, issuedAt: cert.issuedAt })]);

    expect(await testDb().auditLog.count({ where: { action: "CREDENTIALS_CARRIED_OVER", organizationId: company.id, actorUserId: learner.id } })).toBe(1);
    expect(await pendingTransferOffers(testDb(), learner.id, company.id)).toEqual([]);
  });

  it("on no: nothing is copied, the choice is logged and the offer does not come back", async () => {
    const { personal, company, learner } = await privateLearnerJoinsCompany();
    expect(await decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: false })).toEqual({ modulesCarried: 0, certificatesShared: 0 });
    expect(await testDb().assignment.count({ where: { organizationId: company.id, userId: learner.id } })).toBe(0);
    expect(await testDb().certificateShare.count({ where: { organizationId: company.id } })).toBe(0);
    expect(await pendingTransferOffers(testDb(), learner.id, company.id)).toEqual([]);
    expect(await testDb().auditLog.count({ where: { action: "CREDENTIALS_CARRY_DECLINED", organizationId: company.id } })).toBe(1);
  });

  it("decides once: a second decision is refused", async () => {
    const { personal, company, learner } = await privateLearnerJoinsCompany();
    await decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: false });
    await expect(decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: true })).rejects.toThrow(TransferError);
  });

  it("keeps a better or already-passed company result and upgrades an unfinished one", async () => {
    const { personal, company, learner } = await privateLearnerJoinsCompany();
    const [first, second] = level1.requiredModules;
    const done = await passModule(company.id, learner.id, first!, new Date("2026-10-01T10:00:00Z"));
    const mod2 = await testDb().module.findUniqueOrThrow({ where: { slug: second! } });
    const open = await testDb().assignment.create({ data: { organizationId: company.id, userId: learner.id, moduleId: mod2.id, source: "PLACEMENT", status: "IN_PROGRESS" } });

    const r = await decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: true });
    expect(r.modulesCarried).toBe(level1.requiredModules.length - 1);
    expect(await testDb().assignment.findUniqueOrThrow({ where: { id: done.id } })).toMatchObject({ source: "SELF", carriedFromAssignmentId: null });
    expect(await testDb().assignment.findUniqueOrThrow({ where: { id: open.id } })).toMatchObject({ status: "PASSED", source: "PLACEMENT" });
  });

  it("works the other way too: leaving a company, the learner can take its certificate to the private account", async () => {
    const db = testDb();
    const [company, personal, learner] = await Promise.all([makeOrg("BUSINESS"), makeOrg("PERSONAL"), makeUser()]);
    const m = await addMember(company.id, learner.id, "LEARNER");
    await addMember(personal.id, learner.id, "OWNER");
    const track = await db.track.findUniqueOrThrow({ where: { key: "CHATGPT" } });
    await db.trackEnrollment.create({ data: { organizationId: company.id, userId: learner.id, trackId: track.id } });
    for (const slug of level1.requiredModules) await passModule(company.id, learner.id, slug);
    await checkAndIssueCertificates(db, { userId: learner.id, organizationId: company.id });
    await db.membership.update({ where: { id: m.id }, data: { deactivatedAt: new Date() } });

    const [offer] = await pendingTransferOffers(db, learner.id, personal.id);
    expect(offer).toMatchObject({ fromOrganizationId: company.id, fromType: "BUSINESS", certificates: 1 });
    expect(await decideTransfer(db, { userId: learner.id, fromOrganizationId: company.id, toOrganizationId: personal.id, accept: true })).toMatchObject({ certificatesShared: 1 });
  });

  it("refuses accounts the learner is not part of, and pulling into a company they have left", async () => {
    const { personal, company, learner } = await privateLearnerJoinsCompany();
    const stranger = await makeUser();
    await expect(decideTransfer(testDb(), { userId: stranger.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: true })).rejects.toThrow(TransferError);
    const otherOrg = await makeOrg("BUSINESS");
    await expect(decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: otherOrg.id, toOrganizationId: company.id, accept: true })).rejects.toThrow(TransferError);
    await expect(decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: company.id, toOrganizationId: company.id, accept: true })).rejects.toThrow(TransferError);
    await testDb().membership.updateMany({ where: { organizationId: company.id, userId: learner.id }, data: { deactivatedAt: new Date() } });
    await expect(decideTransfer(testDb(), { userId: learner.id, fromOrganizationId: personal.id, toOrganizationId: company.id, accept: true })).rejects.toThrow(TransferError);
  });
});
