import "server-only";
import type { LicenseTier, MonthlyAssignmentStatus, PrismaClient, TrackKey } from "@/generated/prisma/client";
import { monthlyConfig } from "@/lib/config/monthly";
import { getEntitlements } from "@/server/billing/entitlements";
import { logger } from "@/server/observability/logger";
import { monthKey, monthRange, previousMonthKey } from "./monthly-clock";

// Monthly cycle (docs/00 § 3, docs/03 § 6, docs/02 § 5).
// MonthlyCycle = one per (calendar month, active track): the NEWS modules published for that track in the
// PREVIOUS calendar month (the cycle is composed at 00:30 on day 1, so "this month's news" is what arrived
// since the last cycle). MonthlyAssignment = the learner's personal package: those NEWS modules filtered by
// the learner's Copilot tier, minus ones already passed, plus ONE refresher (a module the learner already
// passed — retaking it never lowers the passed result, docs/05 § 6), estimated ≤ 15 min.

// ── Pure composition ──────────────────────────────────────────────────────

export interface NewsCandidate {
  moduleId: string;
  sortOrder: number;
  publishedAt: Date;
  estimatedMinutes: number;
  requiredLicense: LicenseTier | null;
}

/**
 * Priority order of a cycle's NEWS modules (highest first): curriculum sortOrder, then newest publication,
 * then id. Deterministic for equal input regardless of input order.
 */
export function orderNews<T extends Pick<NewsCandidate, "moduleId" | "sortOrder" | "publishedAt">>(candidates: readonly T[]): T[] {
  return [...candidates].sort(
    (a, b) => a.sortOrder - b.sortOrder || b.publishedAt.getTime() - a.publishedAt.getTime() || (a.moduleId < b.moduleId ? -1 : a.moduleId > b.moduleId ? 1 : 0),
  );
}

/**
 * Copilot tier filter, consistent with the plan generator: only the COPILOT track filters. A learner without a
 * paid license (or who did not answer) is treated as COPILOT_CHAT and gets no COPILOT_M365/UNKNOWN modules.
 */
export function tierAllows(track: TrackKey, learnerTier: LicenseTier | null, required: LicenseTier | null): boolean {
  if (track !== "COPILOT" || required === null || required === "COPILOT_CHAT") return true;
  return learnerTier === "COPILOT_M365";
}

export interface PracticedModule {
  moduleId: string;
  passedAt: Date;
  /** Latest completed attempt on the module (or passedAt) — rotates the refresher month to month. */
  lastPracticedAt: Date;
  estimatedMinutes: number;
  requiredLicense: LicenseTier | null;
}

export interface UserPackageInput {
  track: TrackKey;
  licenseTier: LicenseTier | null;
  /** The cycle's NEWS modules in cycle (priority) order. */
  news: readonly NewsCandidate[];
  /** Modules the learner has passed in this organization on this track. */
  passed: readonly PracticedModule[];
  maxMinutes?: number;
}

export interface UserPackage {
  moduleIds: string[];
  refresherModuleId: string | null;
  estimatedMinutes: number;
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Deterministic personal package ≤ maxMinutes. The refresher is the passed module practised longest ago
 * (ties: oldest passedAt, then id); NEWS modules are then taken in priority order while they fit, i.e. the
 * lowest-priority NEWS are dropped first until the estimate is within the limit.
 */
export function composeUserPackage(input: UserPackageInput): UserPackage {
  const max = input.maxMinutes ?? monthlyConfig.maxMinutes;
  const allowed = (required: LicenseTier | null) => tierAllows(input.track, input.licenseTier, required);
  const passedIds = new Set(input.passed.map((p) => p.moduleId));
  const newsIds = new Set(input.news.map((n) => n.moduleId));

  const refresher =
    [...input.passed]
      .filter((p) => !newsIds.has(p.moduleId) && allowed(p.requiredLicense) && p.estimatedMinutes > 0 && p.estimatedMinutes <= max)
      .sort((a, b) => a.lastPracticedAt.getTime() - b.lastPracticedAt.getTime() || a.passedAt.getTime() - b.passedAt.getTime() || byId(a.moduleId, b.moduleId))[0] ?? null;

  let total = refresher?.estimatedMinutes ?? 0;
  const moduleIds: string[] = [];
  for (const n of input.news) {
    if (passedIds.has(n.moduleId) || !allowed(n.requiredLicense)) continue;
    if (total + n.estimatedMinutes > max) continue; // dropped: lower priority than what already fits
    moduleIds.push(n.moduleId);
    total += n.estimatedMinutes;
  }
  return { moduleIds, refresherModuleId: refresher?.moduleId ?? null, estimatedMinutes: total };
}

// ── DB: compose cycles ────────────────────────────────────────────────────

export interface ComposedCycle {
  cycleId: string;
  trackId: string;
  month: string;
  moduleIds: string[];
  created: boolean;
}

/** monthly.compose-cycles: one MonthlyCycle per active track. Idempotent — an existing cycle is never rewritten. */
export async function composeCycles(db: PrismaClient, opts: { now?: Date; month?: string } = {}): Promise<ComposedCycle[]> {
  const month = opts.month ?? monthKey(opts.now ?? new Date());
  const window = monthRange(previousMonthKey(month));
  const tracks = await db.track.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true } });
  const out: ComposedCycle[] = [];
  for (const track of tracks) {
    const modules = await db.module.findMany({
      where: {
        type: "NEWS",
        tracks: { some: { trackId: track.id } },
        publishedVersion: { status: "PUBLISHED", publishedAt: { gte: window.start, lt: window.end } },
      },
      select: { id: true, sortOrder: true, publishedVersion: { select: { publishedAt: true } } },
    });
    const ordered = orderNews(modules.map((m) => ({ moduleId: m.id, sortOrder: m.sortOrder, publishedAt: m.publishedVersion?.publishedAt ?? window.start })));
    const { count } = await db.monthlyCycle.createMany({ data: [{ month, trackId: track.id, moduleIds: ordered.map((m) => m.moduleId) }], skipDuplicates: true });
    const cycle = await db.monthlyCycle.findUniqueOrThrow({ where: { month_trackId: { month, trackId: track.id } }, select: { id: true, moduleIds: true } });
    out.push({ cycleId: cycle.id, trackId: track.id, month, moduleIds: cycle.moduleIds, created: count === 1 });
  }
  logger.info("monthly.cycles_composed", { month, tracks: out.length, created: out.filter((c) => c.created).length });
  return out;
}

// ── DB: assign learners ───────────────────────────────────────────────────

export interface AssignBatchResult {
  processed: number;
  created: number;
  skippedNotEntitled: number;
  skippedEmpty: number;
  nextCursor: string | null;
}

/**
 * monthly.assign-users, one batch (default 500 enrollments, ordered by id). Eligible: active TrackEnrollment,
 * active seat (membership not deactivated, org not deleted, user not being erased) and an org whose
 * entitlements include the monthly cycle (B2B trial/active, paid B2C — never FREE). Idempotent: the DB
 * unique (cycleId, userId, organizationId) + skipDuplicates.
 */
export async function assignCycleBatch(
  db: PrismaClient,
  opts: { cycleId: string; cursor?: string | null; now?: Date; batchSize?: number },
): Promise<AssignBatchResult> {
  const now = opts.now ?? new Date();
  const take = opts.batchSize ?? monthlyConfig.assignBatchSize;
  const cycle = await db.monthlyCycle.findUniqueOrThrow({ where: { id: opts.cycleId }, select: { id: true, trackId: true, moduleIds: true, track: { select: { key: true } } } });

  const enrollments = await db.trackEnrollment.findMany({
    where: {
      trackId: cycle.trackId,
      active: true,
      ...(opts.cursor ? { id: { gt: opts.cursor } } : {}),
      organization: { deletedAt: null },
      user: { deletionRequestedAt: null },
    },
    orderBy: { id: "asc" },
    take,
    select: { id: true, userId: true, organizationId: true, licenseTier: true },
  });
  const nextCursor = enrollments.length === take ? (enrollments.at(-1)?.id ?? null) : null;
  const result: AssignBatchResult = { processed: enrollments.length, created: 0, skippedNotEntitled: 0, skippedEmpty: 0, nextCursor };
  if (enrollments.length === 0) return result;

  const userIds = [...new Set(enrollments.map((e) => e.userId))];
  const orgIds = [...new Set(enrollments.map((e) => e.organizationId))];

  const memberships = await db.membership.findMany({ where: { userId: { in: userIds }, organizationId: { in: orgIds }, deactivatedAt: null }, select: { userId: true, organizationId: true } });
  const activeSeat = new Set(memberships.map((m) => `${m.organizationId}:${m.userId}`));

  const entitled = new Map<string, boolean>();
  for (const orgId of orgIds) entitled.set(orgId, (await getEntitlements(db, orgId, now)).monthlyCycle);

  const newsRows = await db.module.findMany({
    where: { id: { in: cycle.moduleIds } },
    select: { id: true, sortOrder: true, requiredLicense: true, publishedVersion: { select: { publishedAt: true, estimatedMinutes: true, requiredLicense: true } } },
  });
  const newsById = new Map(newsRows.map((m) => [m.id, m]));
  const news: NewsCandidate[] = cycle.moduleIds.flatMap((id) => {
    const m = newsById.get(id);
    if (!m?.publishedVersion) return [];
    return [{ moduleId: id, sortOrder: m.sortOrder, publishedAt: m.publishedVersion.publishedAt ?? now, estimatedMinutes: m.publishedVersion.estimatedMinutes, requiredLicense: m.publishedVersion.requiredLicense ?? m.requiredLicense }];
  });

  const passedRows = await db.assignment.findMany({
    where: { userId: { in: userIds }, organizationId: { in: orgIds }, status: "PASSED", passedAt: { not: null }, module: { tracks: { some: { trackId: cycle.trackId } } } },
    select: {
      userId: true,
      organizationId: true,
      moduleId: true,
      passedAt: true,
      module: { select: { requiredLicense: true, publishedVersion: { select: { estimatedMinutes: true, status: true } } } },
    },
  });
  const passedModuleIds = [...new Set(passedRows.map((p) => p.moduleId))];
  const attempts = passedModuleIds.length
    ? await db.attempt.findMany({
        where: { userId: { in: userIds }, organizationId: { in: orgIds }, status: "COMPLETED", moduleVersion: { moduleId: { in: passedModuleIds } } },
        select: { userId: true, organizationId: true, completedAt: true, moduleVersion: { select: { moduleId: true } } },
      })
    : [];
  const lastPractice = new Map<string, number>();
  for (const a of attempts) {
    if (!a.completedAt) continue;
    const key = `${a.organizationId}:${a.userId}:${a.moduleVersion.moduleId}`;
    lastPractice.set(key, Math.max(lastPractice.get(key) ?? 0, a.completedAt.getTime()));
  }

  const assignments: { cycleId: string; userId: string; organizationId: string; moduleIds: string[]; refresherModuleId: string | null; estimatedMinutes: number }[] = [];
  for (const e of enrollments) {
    if (!activeSeat.has(`${e.organizationId}:${e.userId}`) || !entitled.get(e.organizationId)) {
      result.skippedNotEntitled++;
      continue;
    }
    const passed: PracticedModule[] = passedRows
      .filter((p) => p.userId === e.userId && p.organizationId === e.organizationId && p.passedAt && p.module.publishedVersion?.status === "PUBLISHED")
      .map((p) => {
        const passedAt = p.passedAt as Date;
        const practiced = lastPractice.get(`${p.organizationId}:${p.userId}:${p.moduleId}`) ?? 0;
        return {
          moduleId: p.moduleId,
          passedAt,
          lastPracticedAt: new Date(Math.max(practiced, passedAt.getTime())),
          estimatedMinutes: p.module.publishedVersion?.estimatedMinutes ?? 0,
          requiredLicense: p.module.requiredLicense,
        };
      });
    const pkg = composeUserPackage({ track: cycle.track.key, licenseTier: e.licenseTier, news, passed });
    if (pkg.moduleIds.length === 0 && !pkg.refresherModuleId) {
      result.skippedEmpty++;
      continue;
    }
    assignments.push({ cycleId: cycle.id, userId: e.userId, organizationId: e.organizationId, ...pkg });
  }

  if (assignments.length > 0) {
    const created = await db.monthlyAssignment.createMany({ data: assignments, skipDuplicates: true });
    result.created = created.count;
    // NEWS modules appear in the learner's module list like any other assignment (source MONTHLY).
    await db.assignment.createMany({
      data: assignments.flatMap((a) => a.moduleIds.map((moduleId, i) => ({ organizationId: a.organizationId, userId: a.userId, moduleId, source: "MONTHLY" as const, sortOrder: i }))),
      skipDuplicates: true,
    });
  }
  return result;
}

// ── Progress ──────────────────────────────────────────────────────────────

export interface ProgressInput {
  moduleIds: readonly string[];
  refresherModuleId: string | null;
  /** NEWS modules the learner has passed (any time). */
  passedModuleIds: ReadonlySet<string>;
  /** Modules with a completed attempt since the package was created (refresher: any score counts). */
  practicedSinceAssigned: ReadonlySet<string>;
  /** Any attempt (open or completed) on a package module since it was created. */
  started: boolean;
}

/** Pure: package complete when every NEWS module is passed and the refresher has been retaken. */
export function packageStatus(p: ProgressInput): MonthlyAssignmentStatus {
  const newsDone = p.moduleIds.every((id) => p.passedModuleIds.has(id));
  const refresherDone = !p.refresherModuleId || p.practicedSinceAssigned.has(p.refresherModuleId);
  if (newsDone && refresherDone) return "COMPLETED";
  return p.started || p.moduleIds.some((id) => p.passedModuleIds.has(id)) ? "IN_PROGRESS" : "PENDING";
}

/** Re-derives the status of one learner's open monthly packages from Assignment/Attempt rows. */
export async function syncMonthlyProgress(db: PrismaClient, actor: { userId: string; organizationId: string }, now: Date = new Date()): Promise<number> {
  const open = await db.monthlyAssignment.findMany({
    where: { userId: actor.userId, organizationId: actor.organizationId, status: { not: "COMPLETED" } },
    select: { id: true, moduleIds: true, refresherModuleId: true, createdAt: true, status: true },
  });
  let completed = 0;
  for (const ma of open) {
    const all = [...ma.moduleIds, ...(ma.refresherModuleId ? [ma.refresherModuleId] : [])];
    const [passed, attempts] = await Promise.all([
      db.assignment.findMany({ where: { userId: actor.userId, organizationId: actor.organizationId, moduleId: { in: ma.moduleIds }, status: "PASSED" }, select: { moduleId: true } }),
      db.attempt.findMany({
        where: { userId: actor.userId, organizationId: actor.organizationId, startedAt: { gte: ma.createdAt }, moduleVersion: { moduleId: { in: all } } },
        select: { status: true, moduleVersion: { select: { moduleId: true } } },
      }),
    ]);
    const status = packageStatus({
      moduleIds: ma.moduleIds,
      refresherModuleId: ma.refresherModuleId,
      passedModuleIds: new Set(passed.map((p) => p.moduleId)),
      practicedSinceAssigned: new Set(attempts.filter((a) => a.status === "COMPLETED").map((a) => a.moduleVersion.moduleId)),
      started: attempts.length > 0,
    });
    if (status === ma.status) continue;
    await db.monthlyAssignment.update({ where: { id: ma.id }, data: { status, completedAt: status === "COMPLETED" ? now : null } });
    if (status === "COMPLETED") completed++;
  }
  return completed;
}
