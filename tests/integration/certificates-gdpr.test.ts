import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { CERTIFICATE_DISCLAIMER, CERTIFICATE_LEVELS } from "@/lib/config/certificates";
import { certificateLines, certificatePdf } from "@/server/certificates/pdf";
import { certificateDetails, checkAndIssueCertificates, findPublicCertificate, setPublicVerification } from "@/server/certificates/service";
import { seedModules, seedTracks } from "@/server/content/seed";
import { confirmAccountDeletion, eraseUser, exportUserData, GdprError, ownershipBlockers, requestAccountDeletion } from "@/server/gdpr/service";
import { reportPdf } from "@/server/reports/pdf";
import { buildReportDocument } from "@/server/reports/render";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const level1 = CERTIFICATE_LEVELS[0]!;

beforeAll(async () => {
  await seedTracks(testDb());
  await seedModules(testDb(), new Set());
});

async function passModule(organizationId: string, userId: string, slug: string, promptText?: string) {
  const db = testDb();
  const mod = await db.module.findUniqueOrThrow({ where: { slug }, select: { id: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, maxPoints: true } } } });
  const v = mod.versions[0]!;
  const assignment = await db.assignment.create({ data: { organizationId, userId, moduleId: mod.id, source: "SELF", status: "PASSED", bestScorePct: 90, passedAt: new Date() } });
  const attempt = await db.attempt.create({
    data: {
      organizationId, userId, assignmentId: assignment.id, moduleVersionId: v.id, maxPoints: v.maxPoints, status: "COMPLETED", scorePct: 90, passed: true, completedAt: new Date(),
      ...(promptText ? { stepResults: { create: [{ stepId: "p", stepType: "PROMPT_TASK", maxPoints: 10, promptText }] } } : {}),
    },
  });
  await db.assignment.update({ where: { id: assignment.id }, data: { bestAttemptId: attempt.id } });
}

async function enrolledLearner(trackKey: "CHATGPT" | "COPILOT" = "CHATGPT") {
  const [org, owner, learner] = await Promise.all([makeOrg("BUSINESS"), makeUser(), makeUser()]);
  await addMember(org.id, owner.id, "OWNER");
  await addMember(org.id, learner.id, "LEARNER");
  const track = await testDb().track.findUniqueOrThrow({ where: { key: trackKey } });
  await testDb().trackEnrollment.create({ data: { organizationId: org.id, userId: learner.id, trackId: track.id, licenseTier: trackKey === "COPILOT" ? "COPILOT_CHAT" : null } });
  return { org, owner, learner, track };
}

describe("certificates (docs/05 § 8)", () => {
  it("issues one level-1 certificate when all 9 required modules are passed — idempotently", async () => {
    const { org, learner, track } = await enrolledLearner();
    for (const slug of level1.requiredModules.slice(0, 8)) await passModule(org.id, learner.id, slug);
    expect(await checkAndIssueCertificates(testDb(), { userId: learner.id, organizationId: org.id })).toEqual([]);

    await passModule(org.id, learner.id, level1.requiredModules[8]!);
    const notified: string[] = [];
    const onIssued = async (c: { id: string }) => void notified.push(c.id);
    const [cert] = await checkAndIssueCertificates(testDb(), { userId: learner.id, organizationId: org.id }, { onIssued });
    expect(cert).toMatchObject({ trackId: track.id, level: 1, levelLabel: level1.label, holderName: learner.name, publicVerificationEnabled: false });
    expect(cert!.verificationCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(cert!.moduleVersionIds).toHaveLength(9);
    expect(notified).toEqual([cert!.id]);

    // Re-running (duplicate event / retry) never issues twice and never re-notifies.
    expect(await checkAndIssueCertificates(testDb(), { userId: learner.id, organizationId: org.id }, { onIssued })).toEqual([]);
    expect(await testDb().certificate.count({ where: { userId: learner.id } })).toBe(1);
    expect(notified).toHaveLength(1);
    expect(await testDb().auditLog.count({ where: { action: "CERTIFICATE_ISSUED", targetId: cert!.id } })).toBe(1);
  });

  it("is verifiable by code only when the holder enables the public page; shows only name, track, level, date", async () => {
    const { org, learner } = await enrolledLearner("COPILOT");
    for (const slug of level1.requiredModules) await passModule(org.id, learner.id, slug);
    const [cert] = await checkAndIssueCertificates(testDb(), { userId: learner.id, organizationId: org.id });
    expect(await findPublicCertificate(testDb(), cert!.verificationCode)).toBeNull();

    const stranger = await makeUser();
    expect(await setPublicVerification(testDb(), stranger.id, cert!.id, true)).toBe(false);
    expect(await setPublicVerification(testDb(), learner.id, cert!.id, true)).toBe(true);
    const pub = await findPublicCertificate(testDb(), cert!.verificationCode.toLowerCase());
    expect(pub).toEqual({ holderName: learner.name, trackName: "Microsoft 365 Copilot", levelLabel: level1.label, issuedAt: cert!.issuedAt });
    expect(await findPublicCertificate(testDb(), "AAAA-BBBB-CCCC")).toBeNull();

    const details = await certificateDetails(testDb(), learner.id, cert!.id);
    expect(details?.modules).toHaveLength(9);
    expect(details?.totalMinutes).toBeGreaterThan(0);
    expect(details?.averageScorePct).toBe(90);
    expect(await certificateDetails(testDb(), stranger.id, cert!.id)).toBeNull();
    const text = certificateLines(details!, `http://localhost/certifikat/${cert!.verificationCode}`);
    expect(text.footer).toContain(CERTIFICATE_DISCLAIMER);
    expect(text.footer.join(" ")).toContain(cert!.verificationCode);
    const pdf = await certificatePdf(details!, `http://localhost/certifikat/${cert!.verificationCode}`);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("no certificate without a track enrollment", async () => {
    const [org, learner] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(org.id, learner.id, "LEARNER");
    for (const slug of level1.requiredModules) await passModule(org.id, learner.id, slug);
    expect(await checkAndIssueCertificates(testDb(), { userId: learner.id, organizationId: org.id })).toEqual([]);
  });
});

describe("report PDF", () => {
  it("renders a PDF from the document model", async () => {
    const doc = buildReportDocument({
      organization: { name: "Test ApS", aiPolicyUrl: null },
      period: { from: new Date("2026-09-01"), to: new Date("2026-10-01") },
      generatedAt: new Date(),
      trial: true,
      notes: null,
      employees: [],
      contentVersions: [],
    });
    expect((await reportPdf(doc)).subarray(0, 5).toString()).toBe("%PDF-");
  });
});

describe("GDPR (docs/10 § 1.5)", () => {
  it("export contains only the user's own data", async () => {
    const { org, learner } = await enrolledLearner();
    const colleague = await makeUser();
    await addMember(org.id, colleague.id, "LEARNER");
    const mine = `MIN-PROMPT-${randomUUID()}`;
    const theirs = `DERES-PROMPT-${randomUUID()}`;
    await passModule(org.id, learner.id, "core-llm-01", mine);
    await passModule(org.id, colleague.id, "core-llm-01", theirs);

    const out = await exportUserData(testDb(), learner.id);
    const json = JSON.stringify(out);
    expect(out.profile.email).toBe(learner.email);
    expect(json).toContain(mine); // own free text is part of the user's own data
    expect(json).not.toContain(theirs);
    expect(json).not.toContain(colleague.email);
    expect(out.attempts).toHaveLength(1);
    await expect(exportUserData(testDb(), learner.id)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(await testDb().auditLog.count({ where: { action: "USER_DATA_EXPORTED", actorUserId: learner.id } })).toBe(1);
  });

  it("deletion: request → confirm with the mailed token → erase job cascades learning data, keeps evidence (SetNull)", async () => {
    const { org, learner } = await enrolledLearner();
    await passModule(org.id, learner.id, "core-llm-01", "tekst");
    await testDb().consentRecord.create({
      data: { userId: learner.id, subjectEmail: learner.email, purpose: "MARKETING_EMAIL", action: "GRANTED", textVersion: "v1", textHash: "h", source: "ACCOUNT_SETTINGS" },
    });

    const { token } = await requestAccountDeletion(testDb(), learner.id);
    await expect(confirmAccountDeletion(testDb(), learner.id, "forkert-token")).rejects.toBeInstanceOf(GdprError);
    const other = await makeUser();
    await expect(confirmAccountDeletion(testDb(), other.id, token)).rejects.toMatchObject({ code: "TOKEN_INVALID" });
    await confirmAccountDeletion(testDb(), learner.id, token);
    expect((await testDb().user.findUniqueOrThrow({ where: { id: learner.id } })).deletionRequestedAt).not.toBeNull();
    expect(await testDb().session.count({ where: { userId: learner.id } })).toBe(0);

    expect(await eraseUser(testDb(), learner.id)).toEqual({ erased: true });
    expect(await testDb().user.count({ where: { id: learner.id } })).toBe(0);
    expect(await testDb().attempt.count({ where: { userId: learner.id } })).toBe(0);
    expect(await testDb().assignment.count({ where: { userId: learner.id } })).toBe(0);
    expect(await testDb().membership.count({ where: { userId: learner.id } })).toBe(0);
    // Evidence rows survive without the user link.
    expect(await testDb().auditLog.count({ where: { action: "USER_DELETION_CONFIRMED", targetId: learner.id, actorUserId: null } })).toBe(1);
    expect(await testDb().auditLog.count({ where: { action: "USER_ERASED", targetId: learner.id, organizationId: org.id } })).toBe(1);
    expect(await testDb().consentRecord.count({ where: { subjectEmail: learner.email, userId: null } })).toBe(1);
    // Idempotent re-run.
    expect(await eraseUser(testDb(), learner.id)).toMatchObject({ erased: true });
  });

  it("the only OWNER of a business cannot be deleted before transferring ownership", async () => {
    const [org, owner] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(org.id, owner.id, "OWNER");
    expect(await ownershipBlockers(testDb(), owner.id)).toEqual([{ id: org.id, name: org.name }]);
    await expect(requestAccountDeletion(testDb(), owner.id)).rejects.toMatchObject({ code: "OWNER_MUST_TRANSFER" });
    await testDb().user.update({ where: { id: owner.id }, data: { deletionRequestedAt: new Date() } });
    expect(await eraseUser(testDb(), owner.id)).toEqual({ erased: false, reason: "OWNER_MUST_TRANSFER" });

    const second = await makeUser();
    await addMember(org.id, second.id, "OWNER");
    expect(await ownershipBlockers(testDb(), owner.id)).toEqual([]);
  });

  it("a B2C user's PERSONAL org is soft-deleted with the account", async () => {
    const [org, user] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
    await addMember(org.id, user.id, "OWNER");
    const { token } = await requestAccountDeletion(testDb(), user.id);
    await confirmAccountDeletion(testDb(), user.id, token);
    await eraseUser(testDb(), user.id);
    const row = await testDb().organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(row.deletedAt).not.toBeNull();
    expect(row.name).toBe("Slettet konto");
  });
});
