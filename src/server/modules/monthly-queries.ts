import "server-only";
import type { MonthlyAssignmentStatus, PrismaClient } from "@/generated/prisma/client";
import { monthKey } from "./monthly-clock";

// Read models for the monthly package. Admins see STATUS only (CLAUDE.md, docs/00 § 10): never prompt texts,
// answers or AI feedback — the selects below touch MonthlyAssignment/User/Membership columns only.
// Callers authorize first (requireOrgAdmin / requireActiveMembership(ADMIN_ROLES)); every query is org-scoped.

export type MemberMonthlyStatus = MonthlyAssignmentStatus | "NONE";

export interface OrgMonthlyRow {
  userId: string;
  name: string;
  status: MemberMonthlyStatus;
  moduleCount: number;
  estimatedMinutes: number;
  completedAt: Date | null;
}

export interface OrgMonthlyStatus {
  month: string;
  rows: OrgMonthlyRow[];
  /** Members with a package this month / of those, completed. */
  total: number;
  done: number;
}

/** Several tracks → several packages: all completed = COMPLETED, any started/completed = IN_PROGRESS. */
export function combineStatuses(statuses: readonly MonthlyAssignmentStatus[]): MemberMonthlyStatus {
  if (statuses.length === 0) return "NONE";
  if (statuses.every((s) => s === "COMPLETED")) return "COMPLETED";
  return statuses.some((s) => s !== "PENDING") ? "IN_PROGRESS" : "PENDING";
}

export async function orgMonthlyStatus(db: PrismaClient, organizationId: string, opts: { month?: string; now?: Date } = {}): Promise<OrgMonthlyStatus> {
  const month = opts.month ?? monthKey(opts.now ?? new Date());
  const [members, assignments] = await Promise.all([
    db.membership.findMany({
      where: { organizationId, deactivatedAt: null },
      orderBy: { createdAt: "asc" },
      select: { userId: true, user: { select: { name: true } } },
    }),
    db.monthlyAssignment.findMany({
      where: { organizationId, cycle: { month } },
      select: { userId: true, status: true, moduleIds: true, refresherModuleId: true, estimatedMinutes: true, completedAt: true },
    }),
  ]);
  const rows = members.map((m): OrgMonthlyRow => {
    const mine = assignments.filter((a) => a.userId === m.userId);
    const status = combineStatuses(mine.map((a) => a.status));
    const completed = mine.map((a) => a.completedAt?.getTime() ?? 0);
    return {
      userId: m.userId,
      name: m.user.name,
      status,
      moduleCount: mine.reduce((n, a) => n + a.moduleIds.length + (a.refresherModuleId ? 1 : 0), 0),
      estimatedMinutes: mine.reduce((n, a) => n + a.estimatedMinutes, 0),
      completedAt: status === "COMPLETED" ? new Date(Math.max(...completed)) : null,
    };
  });
  const withPackage = rows.filter((r) => r.status !== "NONE");
  return { month, rows, total: withPackage.length, done: withPackage.filter((r) => r.status === "COMPLETED").length };
}

export async function trainingRemindersEnabled(db: PrismaClient, userId: string): Promise<boolean> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { trainingRemindersEnabled: true } });
  return user.trainingRemindersEnabled;
}

export async function setTrainingRemindersEnabled(db: PrismaClient, userId: string, enabled: boolean): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { trainingRemindersEnabled: enabled } });
}
