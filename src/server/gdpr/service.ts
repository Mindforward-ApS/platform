import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { sendServiceEmail } from "@/server/email/send";
import { consumeRateLimit } from "@/server/security/rate-limit";

// GDPR data-subject rights (docs/10 § 1.5): export of the user's OWN data, account deletion with e-mail
// confirmation, and the erase job (cascade learning data; evidence tables SetNull per docs/03 § 2).

export const EXPORT_RATE_LIMIT = { window: 24 * 60 * 60, max: 1 };
export const DELETION_TOKEN_MINUTES = 60;
const DELETE_PREFIX = "account-delete:";

export class GdprError extends Error {
  constructor(public readonly code: "RATE_LIMITED" | "OWNER_MUST_TRANSFER" | "TOKEN_INVALID") {
    super(code);
    this.name = "GdprError";
  }
}

// ── Export ────────────────────────────────────────────────────────────────

/** Everything about the user, and only the user. Rate limit: one export per 24 hours. */
export async function exportUserData(db: PrismaClient, userId: string, opts: { skipRateLimit?: boolean } = {}) {
  if (!opts.skipRateLimit) {
    const limited = await consumeRateLimit(db, `gdpr-export:${userId}`, EXPORT_RATE_LIMIT);
    if (!limited.allowed) throw new GdprError("RATE_LIMITED");
  }
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, email: true, emailVerified: true, locale: true, trainingRemindersEnabled: true, createdAt: true, lastActiveAt: true },
  });
  const [memberships, trackEnrollments, placementResults, assignments, attempts, certificates, consentRecords, emailMessages, supportConversations, sandboxSessions] = await Promise.all([
    db.membership.findMany({ where: { userId }, select: { role: true, jobRole: true, createdAt: true, deactivatedAt: true, organization: { select: { name: true, type: true } } } }),
    db.trackEnrollment.findMany({ where: { userId }, select: { licenseTier: true, level: true, active: true, createdAt: true, track: { select: { displayName: true } } } }),
    db.placementResult.findMany({ where: { userId }, select: { testVersion: true, answers: true, scorePct: true, level: true, licenseTier: true, jobRole: true, createdAt: true, track: { select: { displayName: true } } } }),
    db.assignment.findMany({ where: { userId }, select: { source: true, status: true, bestScorePct: true, passedAt: true, createdAt: true, module: { select: { slug: true } } } }),
    db.attempt.findMany({
      where: { userId },
      select: {
        status: true, points: true, maxPoints: true, scorePct: true, passed: true, startedAt: true, completedAt: true,
        moduleVersion: { select: { version: true, module: { select: { slug: true } } } },
        stepResults: { select: { stepId: true, stepType: true, points: true, maxPoints: true, passed: true, hintLevelUsed: true, answer: true, rubricScores: true, promptText: true, aiFeedback: true, createdAt: true } },
      },
    }),
    db.certificate.findMany({ where: { userId }, select: { verificationCode: true, level: true, levelLabel: true, holderName: true, contentVersion: true, publicVerificationEnabled: true, issuedAt: true, track: { select: { displayName: true } } } }),
    db.consentRecord.findMany({ where: { OR: [{ userId }, { subjectEmail: user.email.toLowerCase() }] }, select: { purpose: true, channel: true, action: true, textVersion: true, source: true, createdAt: true, confirmedAt: true, withdrawnAt: true } }),
    db.emailMessage.findMany({ where: { userId }, select: { category: true, template: true, subject: true, status: true, sentAt: true, createdAt: true } }),
    db.supportConversation.findMany({ where: { userId }, select: { status: true, createdAt: true, messages: { select: { role: true, content: true, createdAt: true } } } }),
    db.sandboxSession.findMany({ where: { userId }, select: { status: true, createdAt: true, events: { where: { userId }, select: { type: true, target: true, contentText: true, createdAt: true } } } }),
  ]);
  await writeAudit(db, { action: "USER_DATA_EXPORTED", actorUserId: userId, targetType: "user", targetId: userId });
  return {
    exportedAt: new Date().toISOString(),
    format: "mindforward-user-export.v1",
    profile: user,
    memberships,
    trackEnrollments,
    placementResults,
    assignments,
    attempts,
    certificates,
    consentRecords,
    emailMessages,
    supportConversations,
    sandboxSessions,
  };
}

// ── Deletion ──────────────────────────────────────────────────────────────

/** Orgs where the user is the only active OWNER of a BUSINESS org: ownership must be transferred first. */
export async function ownershipBlockers(db: PrismaClient, userId: string): Promise<{ id: string; name: string }[]> {
  const owned = await db.membership.findMany({
    where: { userId, role: "OWNER", deactivatedAt: null, organization: { type: "BUSINESS", deletedAt: null } },
    select: { organization: { select: { id: true, name: true, members: { where: { role: "OWNER", deactivatedAt: null }, select: { id: true } } } } },
  });
  return owned.filter((m) => m.organization.members.length <= 1).map((m) => ({ id: m.organization.id, name: m.organization.name }));
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a one-time confirmation token (Verification row, hash only). The caller mails the link. */
export async function requestAccountDeletion(db: PrismaClient, userId: string, now = new Date()): Promise<{ token: string; expiresAt: Date }> {
  if ((await ownershipBlockers(db, userId)).length > 0) throw new GdprError("OWNER_MUST_TRANSFER");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + DELETION_TOKEN_MINUTES * 60_000);
  await db.$transaction(async (tx) => {
    await tx.verification.deleteMany({ where: { identifier: `${DELETE_PREFIX}${userId}` } });
    await tx.verification.create({ data: { id: randomUUID(), identifier: `${DELETE_PREFIX}${userId}`, value: hashToken(token), expiresAt } });
    await writeAudit(tx, { action: "USER_DELETION_REQUESTED", actorUserId: userId, targetType: "user", targetId: userId });
  });
  return { token, expiresAt };
}

/** Confirms deletion: marks the user, ends all sessions. The erase job then runs (≤ 30 days, normally at once). */
export async function confirmAccountDeletion(db: PrismaClient, userId: string, token: string, now = new Date()): Promise<void> {
  const row = await db.verification.findFirst({ where: { identifier: `${DELETE_PREFIX}${userId}`, value: hashToken(token), expiresAt: { gt: now } } });
  if (!row) throw new GdprError("TOKEN_INVALID");
  if ((await ownershipBlockers(db, userId)).length > 0) throw new GdprError("OWNER_MUST_TRANSFER");
  await db.$transaction(async (tx) => {
    await tx.verification.delete({ where: { id: row.id } });
    await tx.user.update({ where: { id: userId }, data: { deletionRequestedAt: now } });
    await tx.session.deleteMany({ where: { userId } });
    await writeAudit(tx, { action: "USER_DELETION_CONFIRMED", actorUserId: userId, targetType: "user", targetId: userId });
  });
}

/**
 * gdpr.erase-user: hard-deletes the user. Cascades learning data (memberships, assignments, attempts + step
 * results, certificates, enrollments, sandbox, support, placement); ConsentRecord, WithdrawalRequest,
 * EmailMessage and AuditLog keep their rows with userId = null (evidence). The user's PERSONAL org is
 * soft-deleted (Stripe customer stays for bookkeeping). An only-OWNER of a BUSINESS org is never erased.
 */
export async function eraseUser(db: PrismaClient, userId: string): Promise<{ erased: boolean; reason?: string }> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, deletionRequestedAt: true } });
  if (!user) return { erased: true, reason: "ALREADY_GONE" };
  if (!user.deletionRequestedAt) return { erased: false, reason: "NOT_REQUESTED" };
  if ((await ownershipBlockers(db, userId)).length > 0) return { erased: false, reason: "OWNER_MUST_TRANSFER" };

  const memberships = await db.membership.findMany({ where: { userId }, select: { organizationId: true, organization: { select: { type: true } } } });
  await db.$transaction(async (tx) => {
    for (const m of memberships) {
      if (m.organization.type === "PERSONAL") {
        await tx.organization.update({ where: { id: m.organizationId }, data: { deletedAt: new Date(), name: "Slettet konto" } });
      }
      // Business admins see that a member left — never what they did.
      await writeAudit(tx, { action: "USER_ERASED", actorType: "SYSTEM", organizationId: m.organizationId, targetType: "user", targetId: userId });
    }
    await tx.invitation.updateMany({ where: { email: user.email.toLowerCase(), status: "pending" }, data: { status: "canceled" } });
    await tx.verification.deleteMany({ where: { identifier: { contains: user.email.toLowerCase() } } });
    await tx.user.delete({ where: { id: userId } });
  });
  return { erased: true };
}

/** POST /api/me/delete and the /konto/data form: create the token and send the SERVICE confirmation mail. */
export async function startAccountDeletion(db: PrismaClient, user: { id: string; email: string }, appUrl: string): Promise<void> {
  const { token } = await requestAccountDeletion(db, user.id);
  await sendServiceEmail(db, {
    template: "account-deletion-confirm",
    to: user.email,
    vars: { url: `${appUrl}/konto/data/slet?token=${encodeURIComponent(token)}`, expiresMin: DELETION_TOKEN_MINUTES },
    idempotencyKey: `account-delete:${createHash("sha256").update(token).digest("hex").slice(0, 32)}`,
    userId: user.id,
  });
}
