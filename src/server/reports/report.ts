import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { assertAdminSafe } from "@/server/admin/allowed-fields";
import type { EmployeeFilter } from "@/server/admin/queries";
import type { ReportData } from "./render";
import { findBannedTerms } from "./wording";

// Loads the company report's data (docs/01 § 4.2.7): who was offered training, which role- and track-specific
// modules were passed in the period (with content version), certificates, the org's own notes. Org-scoped and
// limited to allow-listed fields (tests/unit/admin-allowed-fields.test.ts scans this file too).

/** Above this many employees the report is generated in an Inngest job and mailed (docs: M7 scope). */
export const REPORT_INLINE_MAX_EMPLOYEES = 200;

export interface ReportParams {
  organizationId: string;
  from: Date;
  to: Date;
  filter?: EmployeeFilter;
  notes?: string | null;
}

export class ReportNotesError extends Error {
  constructor() {
    super("REPORT_NOTES_BANNED");
    this.name = "ReportNotesError";
  }
}

export function validateReportNotes(notes: string | null | undefined): void {
  if (notes && findBannedTerms(notes).length > 0) throw new ReportNotesError();
}

export async function countReportEmployees(db: PrismaClient, organizationId: string, filter: EmployeeFilter = {}): Promise<number> {
  return db.membership.count({ where: employeeWhere(organizationId, filter) });
}

function employeeWhere(organizationId: string, filter: EmployeeFilter) {
  return {
    organizationId,
    deactivatedAt: null,
    ...(filter.jobRole ? { jobRole: filter.jobRole } : {}),
    ...(filter.trackId ? { user: { trackEnrollments: { some: { organizationId, trackId: filter.trackId, active: true } } } } : {}),
  };
}

export async function loadReportData(db: PrismaClient, params: ReportParams, now = new Date()): Promise<ReportData> {
  validateReportNotes(params.notes);
  const { organizationId, from, to } = params;
  const [org, activeSubscription, members] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true, aiPolicyUrl: true } }),
    db.subscription.findFirst({ where: { organizationId, status: "ACTIVE" }, select: { id: true } }),
    db.membership.findMany({
      where: employeeWhere(organizationId, params.filter ?? {}),
      orderBy: { createdAt: "asc" },
      select: { userId: true, role: true, jobRole: true, user: { select: { name: true, email: true } } },
    }),
  ]);
  const userIds = members.map((m) => m.userId);
  const [assignments, certificates, enrollments] = await Promise.all([
    db.assignment.findMany({
      where: { organizationId, userId: { in: userIds }, createdAt: { lte: to }, status: { not: "REMOVED" } },
      select: { userId: true, status: true, passedAt: true, bestAttemptId: true, module: { select: { slug: true } } },
    }),
    db.certificate.findMany({
      where: { organizationId, userId: { in: userIds }, revokedAt: null, issuedAt: { gte: from, lte: to } },
      select: { userId: true, levelLabel: true, issuedAt: true, track: { select: { displayName: true } } },
    }),
    db.trackEnrollment.findMany({ where: { organizationId, userId: { in: userIds }, active: true }, select: { userId: true, track: { select: { displayName: true } } } }),
  ]);
  const passedInPeriod = assignments.filter((a) => a.status === "PASSED" && a.passedAt && a.passedAt >= from && a.passedAt <= to);
  const bestAttemptIds = passedInPeriod.map((a) => a.bestAttemptId).filter((id): id is string => Boolean(id));
  const versions = await db.attempt.findMany({
    where: { id: { in: bestAttemptIds }, organizationId },
    select: { id: true, moduleVersion: { select: { version: true, title: true } } },
  });
  const versionByAttempt = new Map(versions.map((v) => [v.id, v.moduleVersion]));

  const contentVersions = new Map<string, number>();
  const data: ReportData = {
    organization: { name: org.name, aiPolicyUrl: org.aiPolicyUrl },
    period: { from, to },
    generatedAt: now,
    trial: !activeSubscription,
    notes: params.notes ?? null,
    employees: members.map((m) => ({
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      jobRole: m.jobRole,
      tracks: enrollments.filter((e) => e.userId === m.userId).map((e) => e.track.displayName),
      offered: assignments.filter((a) => a.userId === m.userId).length,
      passedModules: passedInPeriod
        .filter((a) => a.userId === m.userId)
        .map((a) => {
          const v = a.bestAttemptId ? versionByAttempt.get(a.bestAttemptId) : undefined;
          const version = v?.version ?? 1;
          contentVersions.set(a.module.slug, Math.max(contentVersions.get(a.module.slug) ?? 0, version));
          return { slug: a.module.slug, title: v?.title ?? a.module.slug, version, passedAt: a.passedAt as Date };
        }),
      certificates: certificates.filter((c) => c.userId === m.userId).map((c) => ({ track: c.track.displayName, levelLabel: c.levelLabel, issuedAt: c.issuedAt })),
    })),
    contentVersions: [...contentVersions.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([slug, version]) => ({ slug, version })),
  };
  return assertAdminSafe(data);
}
