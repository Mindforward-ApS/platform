import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { allEmployees, type EmployeeRow } from "@/server/admin/queries";

// "Mit hold" (company admins): the active employees from the admin read model (status, best score, certificates,
// last activity; never answers or prompt texts) plus forløb progress as counts. Org-scoped on every query.

export type TeamState = "new" | "idle" | "active" | "done";
export interface TeamMember {
  row: EmployeeRow;
  /** Forløb lessons completed, of the lessons that can be opened today (0–100). */
  progress: number;
  /** Whole days since the last activity (module work or a finished lesson); null = never. */
  lastDays: number | null;
  state: TeamState;
}

const DAY = 86_400_000;

export function teamState(status: EmployeeRow["status"], progress: number, lessonsDone: number, lastDays: number | null): TeamState {
  if (status === "CERTIFIED" || progress >= 100) return "done";
  if (status === "NOT_STARTED" && lessonsDone === 0) return "new";
  return lastDays === null || lastDays > 3 ? "idle" : "active";
}

export async function listTeam(db: PrismaClient, organizationId: string, now = new Date()): Promise<TeamMember[]> {
  const [rows, readyLessons, completions] = await Promise.all([
    allEmployees(db, organizationId),
    db.courseLesson.count({ where: { status: "READY", module: { status: "READY" } } }),
    db.courseLessonCompletion.groupBy({ by: ["userId"], where: { organizationId }, _count: { _all: true }, _max: { completedAt: true } }),
  ]);
  const userIds = await db.membership.findMany({
    where: { organizationId, id: { in: rows.map((r) => r.memberId) } },
    select: { id: true, userId: true },
  });
  const userOf = new Map(userIds.map((m) => [m.id, m.userId]));
  const byUser = new Map(completions.map((c) => [c.userId, { done: c._count._all, last: c._max.completedAt }]));
  return rows.map((row) => {
    const c = byUser.get(userOf.get(row.memberId) ?? "");
    const done = c?.done ?? 0;
    const progress = readyLessons ? Math.min(100, Math.round((done / readyLessons) * 100)) : 0;
    const last = [row.lastActivityAt, c?.last ?? null].filter((d): d is Date => d instanceof Date).sort((a, b) => b.getTime() - a.getTime())[0];
    const lastDays = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY)) : null;
    return { row, progress, lastDays, state: teamState(row.status, progress, done, lastDays) };
  });
}
