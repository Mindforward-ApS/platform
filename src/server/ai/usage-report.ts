import "server-only";
import { createHash } from "node:crypto";
import type { AiFeature, PrismaClient } from "@/generated/prisma/client";
import { copenhagenMidnight } from "@/server/billing/time";
import { globalBudgetState, usageDay, weightedTokens, type GlobalBudgetState } from "./budget";

// Owner cost overview (/admin/forbrug, GREB_ADMIN only). Aggregates only — no prompt text, no names/e-mails;
// users are shown as a short pseudonym of their id.

export interface UsageReport {
  budget: GlobalBudgetState;
  alert80SentAt: Date | null;
  byFeature: { feature: AiFeature; calls: number; tokens: number; costDkk: number }[];
  byDay: { day: string; calls: number; costDkk: number }[];
  topUsersToday: { user: string; tokens: number; costDkk: number }[];
  blocked: { status: string; count: number }[];
}

export function pseudonym(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

export async function usageReport(db: PrismaClient, opts: { limitDkk: number; alertPct: number; now?: Date }): Promise<UsageReport> {
  const now = opts.now ?? new Date();
  const budget = await globalBudgetState(db, opts.limitDkk, now, opts.alertPct);
  const [y, m] = budget.month.split("-").map(Number) as [number, number];
  const monthStart = copenhagenMidnight(y, m, 1);
  const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [row, features, days, users, blocked] = await Promise.all([
    db.budgetMonth.findUnique({ where: { scope_month: { scope: "GLOBAL_AI", month: budget.month } }, select: { alert80SentAt: true } }),
    db.aiCall.groupBy({ by: ["feature"], where: { createdAt: { gte: monthStart } }, _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true, costDkk: true } }),
    db.$queryRaw<{ day: string; calls: bigint; cost: string | null }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Copenhagen', 'YYYY-MM-DD') AS day,
             count(*) AS calls, sum("costDkk")::text AS cost
      FROM "ai_call" WHERE "createdAt" >= ${since} GROUP BY 1 ORDER BY 1 DESC`,
    db.aiUsageDaily.findMany({ where: { day: usageDay(now) }, orderBy: { costDkk: "desc" }, take: 10 }),
    db.aiCall.groupBy({ by: ["status"], where: { createdAt: { gte: monthStart }, status: { in: ["BLOCKED_USER_CAP", "BLOCKED_GLOBAL_CAP", "BLOCKED_PII", "BLOCKED_RATE_LIMIT"] } }, _count: { _all: true } }),
  ]);

  return {
    budget,
    alert80SentAt: row?.alert80SentAt ?? null,
    byFeature: features
      .map((f) => ({ feature: f.feature, calls: f._count._all, tokens: (f._sum.inputTokens ?? 0) + (f._sum.outputTokens ?? 0), costDkk: Number(f._sum.costDkk ?? 0) }))
      .sort((a, b) => b.costDkk - a.costDkk),
    byDay: days.map((d) => ({ day: d.day, calls: Number(d.calls), costDkk: Number(d.cost ?? 0) })),
    topUsersToday: users.map((u) => ({ user: pseudonym(u.userId), tokens: weightedTokens(u), costDkk: Number(u.costDkk) })),
    blocked: blocked.map((b) => ({ status: b.status, count: b._count._all })),
  };
}
