import type { PrismaClient } from "@/generated/prisma/client";
import { logger } from "@/server/observability/logger";
import type { ContentConfig } from "./config";
import { copenhagenMonth } from "./normalize";

// Content-engine sub-budget (docs/06 § 13, docs/02 § 6): BudgetMonth(CONTENT_ENGINE), CONTENT_MONTHLY_BUDGET_DKK.
// Spend = the engine's own recorded cost (PipelineRun.costDkk) this Copenhagen month. 80 % → one alarm (CAS);
// 100 % → only fetch/snapshot/diff run, classify/draft/verify pause.

export interface BudgetState {
  month: string;
  spentDkk: number;
  limitDkk: number;
  exceeded: boolean;
}

function monthStartUtc(month: string): Date {
  const [y, m] = month.split("-").map(Number) as [number, number];
  // Earliest instant of the Copenhagen month: midnight local is 22:00/23:00 UTC the day before.
  return new Date(Date.UTC(y, m - 1, 1) - 2 * 60 * 60 * 1000);
}

export async function contentBudget(db: PrismaClient, cfg: Pick<ContentConfig, "monthlyBudgetDkk" | "budgetAlertPct">, now = new Date()): Promise<BudgetState> {
  const month = copenhagenMonth(now);
  const runs = await db.pipelineRun.findMany({ where: { startedAt: { gte: monthStartUtc(month) } }, select: { costDkk: true, startedAt: true } });
  const spentDkk = runs.filter((r) => copenhagenMonth(r.startedAt) === month).reduce((s, r) => s + Number(r.costDkk), 0);
  const limitDkk = cfg.monthlyBudgetDkk;
  const row = await db.budgetMonth.upsert({
    where: { scope_month: { scope: "CONTENT_ENGINE", month } },
    create: { scope: "CONTENT_ENGINE", month, limitDkk, spentDkk },
    update: { limitDkk, spentDkk },
  });
  if (spentDkk >= limitDkk * cfg.budgetAlertPct && !row.alert80SentAt) {
    const won = await db.budgetMonth.updateMany({ where: { id: row.id, alert80SentAt: null }, data: { alert80SentAt: now } });
    if (won.count === 1) logger.error("content.budget_80", { month, spentDkk, limitDkk });
  }
  const exceeded = spentDkk >= limitDkk;
  if (exceeded && !row.alert100SentAt) {
    const won = await db.budgetMonth.updateMany({ where: { id: row.id, alert100SentAt: null }, data: { alert100SentAt: now, degradedAt: now } });
    if (won.count === 1) logger.error("content.budget_100", { month, spentDkk, limitDkk });
  }
  return { month, spentDkk, limitDkk, exceeded };
}
