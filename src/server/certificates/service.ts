import "server-only";
import { randomInt } from "node:crypto";
import { Prisma, type Certificate, type PrismaClient } from "@/generated/prisma/client";
import {
  CERTIFICATE_CONTENT_VERSION,
  CERTIFICATE_LEVELS,
  VERIFICATION_CODE_ALPHABET,
  VERIFICATION_CODE_LENGTH,
} from "@/lib/config/certificates";
import { writeAudit } from "@/server/audit/log";
import { logger } from "@/server/observability/logger";
import { checkEligibility, type Tier } from "./eligibility";

// Certificate issuing (docs/05 § 8). Idempotent: the unique (userId, organizationId, trackId, level) constraint
// means re-running the check (Inngest retries, duplicate events) never issues twice.

export function generateVerificationCode(): string {
  let raw = "";
  for (let i = 0; i < VERIFICATION_CODE_LENGTH; i++) raw += VERIFICATION_CODE_ALPHABET[randomInt(VERIFICATION_CODE_ALPHABET.length)];
  return raw.match(/.{1,4}/g)?.join("-") ?? raw;
}

export const verificationCodePattern = /^[A-HJ-KMNP-Z2-9]{4}-[A-HJ-KMNP-Z2-9]{4}-[A-HJ-KMNP-Z2-9]{4}$/;

export interface CertificateCheckDeps {
  /** Called once per newly issued certificate (SERVICE mail "certificate-issued"). */
  onIssued?: (cert: Certificate) => Promise<void>;
  /** Placement "kan springes over" (M5 integration point). Default: nothing is skippable. */
  skippable?: (args: { userId: string; organizationId: string; trackId: string }) => Promise<ReadonlySet<string>>;
}

export async function checkAndIssueCertificates(
  db: PrismaClient,
  args: { userId: string; organizationId: string },
  deps: CertificateCheckDeps = {},
): Promise<Certificate[]> {
  const { userId, organizationId } = args;
  const membership = await db.membership.findFirst({ where: { userId, organizationId, deactivatedAt: null }, select: { user: { select: { name: true, email: true } } } });
  if (!membership) return [];
  const enrollments = await db.trackEnrollment.findMany({ where: { userId, organizationId, active: true, track: { isActive: true } }, select: { trackId: true, licenseTier: true } });
  if (enrollments.length === 0) return [];

  const passedAssignments = await db.assignment.findMany({
    where: { userId, organizationId, status: "PASSED" },
    select: { passedAt: true, bestAttemptId: true, module: { select: { slug: true } } },
  });
  const passed = passedAssignments.filter((a) => a.passedAt).map((a) => ({ slug: a.module.slug, passedAt: a.passedAt as Date, bestAttemptId: a.bestAttemptId }));

  const issued: Certificate[] = [];
  for (const enrollment of enrollments) {
    for (const level of CERTIFICATE_LEVELS) {
      const existing = await db.certificate.findUnique({ where: { userId_organizationId_trackId_level: { userId, organizationId, trackId: enrollment.trackId, level: level.level } }, select: { id: true } });
      if (existing) continue;
      const trackModules = await db.module.findMany({
        where: { slug: { in: [...level.requiredModules] }, tracks: { some: { trackId: enrollment.trackId } } },
        select: { slug: true, requiredLicense: true },
      });
      const skippable = deps.skippable ? await deps.skippable({ userId, organizationId, trackId: enrollment.trackId }) : new Set<string>();
      const result = checkEligibility({ level, trackModules: trackModules.map((m) => ({ slug: m.slug, requiredLicense: m.requiredLicense as Tier | null })), learnerTier: enrollment.licenseTier as Tier | null, passed, skippable });
      if (!result.eligible) continue;

      const attemptIds = passed.filter((p) => result.required.includes(p.slug)).map((p) => p.bestAttemptId).filter((id): id is string => Boolean(id));
      const attempts = await db.attempt.findMany({ where: { id: { in: attemptIds }, userId, organizationId }, select: { moduleVersionId: true } });
      try {
        const cert = await db.$transaction(async (tx) => {
          const created = await tx.certificate.create({
            data: {
              verificationCode: generateVerificationCode(),
              userId,
              organizationId,
              trackId: enrollment.trackId,
              level: level.level,
              levelLabel: level.label,
              licenseTier: enrollment.licenseTier,
              holderName: membership.user.name || membership.user.email,
              moduleVersionIds: attempts.map((a) => a.moduleVersionId),
              contentVersion: CERTIFICATE_CONTENT_VERSION,
            },
          });
          await writeAudit(tx, { action: "CERTIFICATE_ISSUED", actorType: "SYSTEM", organizationId, targetType: "certificate", targetId: created.id, metadata: { level: level.level, trackId: enrollment.trackId } });
          return created;
        });
        issued.push(cert);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue; // issued concurrently
        throw err;
      }
    }
  }
  for (const cert of issued) {
    try {
      await deps.onIssued?.(cert);
    } catch (err) {
      logger.error("certificate.notify_failed", { certificateId: cert.id, err });
    }
  }
  return issued;
}

export interface CertificateDetails {
  id: string;
  verificationCode: string;
  holderName: string;
  trackName: string;
  levelLabel: string;
  issuedAt: Date;
  contentVersion: string;
  publicVerificationEnabled: boolean;
  modules: { title: string; passedAt: Date | null; minutes: number }[];
  totalMinutes: number;
  averageScorePct: number | null;
}

/** The holder's own certificate with the facts printed on the PDF. Owner-scoped (userId). */
export async function certificateDetails(db: PrismaClient, userId: string, certificateId: string): Promise<CertificateDetails | null> {
  const cert = await db.certificate.findFirst({
    where: { id: certificateId, userId, revokedAt: null },
    select: { id: true, verificationCode: true, holderName: true, levelLabel: true, issuedAt: true, contentVersion: true, publicVerificationEnabled: true, moduleVersionIds: true, organizationId: true, track: { select: { displayName: true } } },
  });
  if (!cert) return null;
  const versions = await db.moduleVersion.findMany({ where: { id: { in: cert.moduleVersionIds } }, select: { moduleId: true, title: true, estimatedMinutes: true, module: { select: { sortOrder: true } } } });
  const assignments = await db.assignment.findMany({
    where: { userId, organizationId: cert.organizationId, moduleId: { in: versions.map((v) => v.moduleId) } },
    select: { moduleId: true, passedAt: true, bestScorePct: true },
  });
  const byModule = new Map(assignments.map((a) => [a.moduleId, a]));
  const modules = versions
    .sort((a, b) => a.module.sortOrder - b.module.sortOrder)
    .map((v) => ({ title: v.title, passedAt: byModule.get(v.moduleId)?.passedAt ?? null, minutes: v.estimatedMinutes }));
  const scores = assignments.map((a) => (a.bestScorePct === null ? null : Number(a.bestScorePct))).filter((s): s is number => s !== null);
  return {
    id: cert.id,
    verificationCode: cert.verificationCode,
    holderName: cert.holderName,
    trackName: cert.track.displayName,
    levelLabel: cert.levelLabel,
    issuedAt: cert.issuedAt,
    contentVersion: cert.contentVersion,
    publicVerificationEnabled: cert.publicVerificationEnabled,
    modules,
    totalMinutes: modules.reduce((n, m) => n + m.minutes, 0),
    averageScorePct: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
  };
}

export async function listMyCertificates(db: PrismaClient, userId: string) {
  return db.certificate.findMany({
    where: { userId, revokedAt: null },
    orderBy: { issuedAt: "desc" },
    select: { id: true, verificationCode: true, levelLabel: true, issuedAt: true, publicVerificationEnabled: true, track: { select: { displayName: true } }, organization: { select: { name: true } } },
  });
}

export async function setPublicVerification(db: PrismaClient, userId: string, certificateId: string, enabled: boolean): Promise<boolean> {
  const { count } = await db.certificate.updateMany({ where: { id: certificateId, userId }, data: { publicVerificationEnabled: enabled } });
  if (count === 0) return false;
  const cert = await db.certificate.findUniqueOrThrow({ where: { id: certificateId }, select: { organizationId: true } });
  await writeAudit(db, { action: "CERTIFICATE_PUBLIC_TOGGLED", actorUserId: userId, organizationId: cert.organizationId, targetType: "certificate", targetId: certificateId, metadata: { enabled } });
  return true;
}

/** Public verification page: only name, track, level, date — and only when the holder opted in (§ 10a). */
export async function findPublicCertificate(db: PrismaClient, code: string) {
  const normalized = code.trim().toUpperCase();
  if (!verificationCodePattern.test(normalized)) return null;
  const cert = await db.certificate.findFirst({
    where: { verificationCode: normalized, publicVerificationEnabled: true, revokedAt: null },
    select: { holderName: true, levelLabel: true, issuedAt: true, track: { select: { displayName: true } } },
  });
  return cert ? { holderName: cert.holderName, trackName: cert.track.displayName, levelLabel: cert.levelLabel, issuedAt: cert.issuedAt } : null;
}
