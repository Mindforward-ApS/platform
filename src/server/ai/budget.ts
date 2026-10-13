import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { TokenUsage } from "./pricing";

// Budgets (docs/02 § 6, docs/04 § 11): daily token cap per user (Europe/Copenhagen day, cache reads weighted 0.1)
// and spend recording on BudgetMonth(GLOBAL_AI). The global 80 % alarm / degradation is M10.

export const CAP_MESSAGE = "Du har brugt dagens øvekvote. Den nulstilles kl. 00.";
const TZ = "Europe/Copenhagen";

function copenhagenParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** The Copenhagen calendar day as a DATE value (UTC midnight), the key of AiUsageDaily. */
export function usageDay(now: Date): Date {
  const { y, m, d } = copenhagenParts(now);
  return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
}

/** "2026-11" in Copenhagen time, the key of BudgetMonth. */
export function budgetMonth(now: Date): string {
  const { y, m } = copenhagenParts(now);
  return `${y}-${m}`;
}

/** Tokens counted against the daily cap: input + output + cache writes + 0.1 × cache reads. */
export function weightedTokens(u: TokenUsage): number {
  return u.inputTokens + u.outputTokens + u.cacheWriteTokens + Math.ceil(u.cacheReadTokens * 0.1);
}

export interface CapCheck {
  allowed: boolean;
  used: number;
  cap: number;
}

export function evaluateCap(used: number, cap: number): CapCheck {
  return { allowed: used < cap, used, cap };
}

export async function checkUserDailyCap(db: PrismaClient, userId: string, cap: number, now = new Date()): Promise<CapCheck> {
  const row = await db.aiUsageDaily.findUnique({ where: { userId_day: { userId, day: usageDay(now) } } });
  const used = row ? weightedTokens({ inputTokens: row.inputTokens, outputTokens: row.outputTokens, cacheReadTokens: row.cacheReadTokens, cacheWriteTokens: row.cacheWriteTokens }) : 0;
  return evaluateCap(used, cap);
}

type Tx = Prisma.TransactionClient | PrismaClient;

/** Atomic upsert-increment of the user's day ledger and the global month (called with the AiCall insert). */
export async function recordUsage(tx: Tx, opts: { userId: string | null; usage: TokenUsage; costDkk: number; monthlyLimitDkk: number; now: Date }) {
  const { usage, costDkk } = opts;
  if (opts.userId) {
    const day = usageDay(opts.now);
    await tx.aiUsageDaily.upsert({
      where: { userId_day: { userId: opts.userId, day } },
      create: { userId: opts.userId, day, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, cacheReadTokens: usage.cacheReadTokens, cacheWriteTokens: usage.cacheWriteTokens, callCount: 1, costDkk },
      update: {
        inputTokens: { increment: usage.inputTokens },
        outputTokens: { increment: usage.outputTokens },
        cacheReadTokens: { increment: usage.cacheReadTokens },
        cacheWriteTokens: { increment: usage.cacheWriteTokens },
        callCount: { increment: 1 },
        costDkk: { increment: costDkk },
      },
    });
  }
  const month = budgetMonth(opts.now);
  await tx.budgetMonth.upsert({
    where: { scope_month: { scope: "GLOBAL_AI", month } },
    create: { scope: "GLOBAL_AI", month, limitDkk: opts.monthlyLimitDkk, spentDkk: costDkk },
    update: { spentDkk: { increment: costDkk } },
  });
}
