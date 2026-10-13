import "server-only";
import type { JobRole, MembershipRole, PrismaClient } from "@/generated/prisma/client";
import { assertAdminSafe } from "./allowed-fields";

// The ONLY data source for company-admin screens, exports and the learner's "what my admin sees" page
// (docs/03 § 5, docs/10 § 1.6). Every query is scoped by organizationId and selects explicit, allow-listed
// fields: status, best score, dates, certificates. Never free text, step data, placement data or timing per step.
// tests/unit/admin-allowed-fields.test.ts scans this file; the integration tests scan its output.

export type EmployeeStatus = "NOT_STARTED" | "IN_PROGRESS" | "CERTIFIED";

export interface CertificateSummary {
  trackName: string;
  level: number;
  levelLabel: string;
  issuedAt: Date;
}

export interface EmployeeRow {
  memberId: string;
  name: string;
  email: string;
  role: MembershipRole;
  jobRole: JobRole | null;
  tracks: { id: string; name: string; licenseTier: string | null }[];
  status: EmployeeStatus;
  avgBestScorePct: number | null;
  passedCount: number;
  lastPassedAt: Date | null;
  certificates: CertificateSummary[];
  lastActivityAt: Date | null;
}

export interface EmployeeFilter {
  trackId?: string;
  jobRole?: JobRole;
}

export const EMPLOYEE_PAGE_SIZE = 25;

function memberWhere(organizationId: string, filter: EmployeeFilter, active = true) {
  return {
    organizationId,
    deactivatedAt: active ? null : { not: null },
    ...(filter.jobRole ? { jobRole: filter.jobRole } : {}),
    ...(filter.trackId ? { user: { trackEnrollments: { some: { organizationId, trackId: filter.trackId, active: true } } } } : {}),
  };
}

const memberSelect = { id: true, userId: true, role: true, jobRole: true, user: { select: { name: true, email: true, lastActiveAt: true } } } as const;

async function buildRows(db: PrismaClient, organizationId: string, members: { id: string; userId: string; role: MembershipRole; jobRole: JobRole | null; user: { name: string; email: string; lastActiveAt: Date | null } }[]): Promise<EmployeeRow[]> {
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return [];
  const [scoreAgg, passedAgg, started, certs, enrollments, activity] = await Promise.all([
    db.assignment.groupBy({ by: ["userId"], where: { organizationId, userId: { in: userIds }, bestScorePct: { not: null } }, _avg: { bestScorePct: true } }),
    db.assignment.groupBy({ by: ["userId"], where: { organizationId, userId: { in: userIds }, status: "PASSED" }, _count: { _all: true }, _max: { passedAt: true } }),
    db.assignment.groupBy({ by: ["userId"], where: { organizationId, userId: { in: userIds }, status: { in: ["IN_PROGRESS", "PASSED"] } }, _count: { _all: true } }),
    db.certificate.findMany({
      where: { organizationId, userId: { in: userIds }, revokedAt: null },
      orderBy: { issuedAt: "asc" },
      select: { userId: true, level: true, levelLabel: true, issuedAt: true, track: { select: { displayName: true } } },
    }),
    db.trackEnrollment.findMany({
      where: { organizationId, userId: { in: userIds }, active: true },
      select: { userId: true, licenseTier: true, track: { select: { id: true, displayName: true } } },
    }),
    db.attempt.groupBy({ by: ["userId"], where: { organizationId, userId: { in: userIds } }, _max: { updatedAt: true } }),
  ]);
  const score = new Map(scoreAgg.map((a) => [a.userId, a._avg.bestScorePct === null ? null : Math.round(Number(a._avg.bestScorePct))]));
  const passed = new Map(passedAgg.map((a) => [a.userId, { count: a._count._all, last: a._max.passedAt }]));
  const startedSet = new Set(started.map((s) => s.userId));
  const lastAttempt = new Map(activity.map((a) => [a.userId, a._max.updatedAt]));

  return members.map((m) => {
    const myCerts = certs.filter((c) => c.userId === m.userId).map((c) => ({ trackName: c.track.displayName, level: c.level, levelLabel: c.levelLabel, issuedAt: c.issuedAt }));
    const candidates = [lastAttempt.get(m.userId) ?? null, m.user.lastActiveAt].filter((d): d is Date => d instanceof Date);
    return {
      memberId: m.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      jobRole: m.jobRole,
      tracks: enrollments.filter((e) => e.userId === m.userId).map((e) => ({ id: e.track.id, name: e.track.displayName, licenseTier: e.licenseTier })),
      status: myCerts.length > 0 ? "CERTIFIED" : startedSet.has(m.userId) ? "IN_PROGRESS" : "NOT_STARTED",
      avgBestScorePct: score.get(m.userId) ?? null,
      passedCount: passed.get(m.userId)?.count ?? 0,
      lastPassedAt: passed.get(m.userId)?.last ?? null,
      certificates: myCerts,
      lastActivityAt: candidates.length ? new Date(Math.max(...candidates.map((d) => d.getTime()))) : null,
    };
  });
}

/** Cursor-paginated employee list (ordered by join date, then id). The cursor is the last row's memberId. */
export async function listEmployees(
  db: PrismaClient,
  organizationId: string,
  opts: { cursor?: string; take?: number; filter?: EmployeeFilter } = {},
): Promise<{ rows: EmployeeRow[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(opts.take ?? EMPLOYEE_PAGE_SIZE, 1), 100);
  const members = await db.membership.findMany({
    where: memberWhere(organizationId, opts.filter ?? {}),
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: memberSelect,
  });
  const page = members.slice(0, take);
  const rows = await buildRows(db, organizationId, page);
  return assertAdminSafe({ rows, nextCursor: members.length > take ? (page.at(-1)?.id ?? null) : null });
}

/** All active employees (report/export use; no pagination). */
export async function allEmployees(db: PrismaClient, organizationId: string, filter: EmployeeFilter = {}): Promise<EmployeeRow[]> {
  const members = await db.membership.findMany({ where: memberWhere(organizationId, filter), orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: memberSelect });
  return assertAdminSafe(await buildRows(db, organizationId, members));
}

export async function listRemovedMembers(db: PrismaClient, organizationId: string) {
  return assertAdminSafe(
    await db.membership.findMany({
      where: { organizationId, deactivatedAt: { not: null } },
      orderBy: { deactivatedAt: "desc" },
      take: 100,
      select: { id: true, role: true, deactivatedAt: true, user: { select: { name: true, email: true } } },
    }),
  );
}

export async function listOpenInvitations(db: PrismaClient, organizationId: string, now = new Date()) {
  return assertAdminSafe(
    await db.invitation.findMany({
      where: { organizationId, status: "pending", expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true, jobRole: true, track: { select: { displayName: true } } },
    }),
  );
}

export interface EmployeeDetail {
  row: EmployeeRow;
  modules: { slug: string; title: string; status: string; bestScorePct: number | null; passedAt: Date | null }[];
}

/** V4: one employee's progress — modules (status, best score, date) and certificates. */
export async function employeeDetail(db: PrismaClient, organizationId: string, by: { memberId: string } | { userId: string }): Promise<EmployeeDetail | null> {
  const member = await db.membership.findFirst({
    where: { organizationId, ...("memberId" in by ? { id: by.memberId } : { userId: by.userId }) },
    select: memberSelect,
  });
  if (!member) return null;
  const [row] = await buildRows(db, organizationId, [member]);
  const assignments = await db.assignment.findMany({
    where: { organizationId, userId: member.userId },
    orderBy: [{ module: { sortOrder: "asc" } }],
    select: {
      status: true,
      bestScorePct: true,
      passedAt: true,
      module: { select: { slug: true, versions: { orderBy: { version: "desc" }, take: 1, select: { title: true } } } },
    },
  });
  if (!row) return null;
  return assertAdminSafe({
    row,
    modules: assignments.map((a) => ({
      slug: a.module.slug,
      title: a.module.versions[0]?.title ?? a.module.slug,
      status: a.status,
      bestScorePct: a.bestScorePct === null ? null : Math.round(Number(a.bestScorePct)),
      passedAt: a.passedAt,
    })),
  });
}

export interface OrgOverview {
  organization: { name: string; seatLimit: number; dpaAcceptedAt: Date | null; dpaVersion: string | null; aiPolicyUrl: string | null; hasDefaultTrack: boolean };
  invited: number;
  active: number;
  withPassed: number;
  certificates: number;
  anyTrackChosen: boolean;
  anyInvitationSent: boolean;
  actorTriedModule: boolean;
}

export async function orgOverview(db: PrismaClient, organizationId: string, actorUserId: string, now = new Date()): Promise<OrgOverview> {
  const [org, invited, active, withPassed, certificates, enrollments, invitationsEver, actorAttempts] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true, seatLimit: true, dpaAcceptedAt: true, dpaVersion: true, aiPolicyUrl: true, defaultTrackId: true } }),
    db.invitation.count({ where: { organizationId, status: "pending", expiresAt: { gt: now } } }),
    db.membership.count({ where: { organizationId, deactivatedAt: null } }),
    db.assignment.groupBy({ by: ["userId"], where: { organizationId, status: "PASSED", user: { memberships: { some: { organizationId, deactivatedAt: null } } } } }),
    db.certificate.count({ where: { organizationId, revokedAt: null } }),
    db.trackEnrollment.count({ where: { organizationId, active: true } }),
    db.invitation.count({ where: { organizationId } }),
    db.attempt.count({ where: { organizationId, userId: actorUserId } }),
  ]);
  return assertAdminSafe({
    organization: { name: org.name, seatLimit: org.seatLimit, dpaAcceptedAt: org.dpaAcceptedAt, dpaVersion: org.dpaVersion, aiPolicyUrl: org.aiPolicyUrl, hasDefaultTrack: org.defaultTrackId !== null },
    invited,
    active,
    withPassed: withPassed.length,
    certificates,
    anyTrackChosen: enrollments > 0 || org.defaultTrackId !== null,
    anyInvitationSent: invitationsEver > 0 || active > 1,
    actorTriedModule: actorAttempts > 0,
  });
}
