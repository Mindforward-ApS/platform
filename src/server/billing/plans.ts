import { billingRules, plans, type PlanConfig } from "@/lib/config/plans";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ServerEnv } from "@/lib/env.schema";
import { format, getMessages } from "@/lib/i18n";
import { formatDkk, planPrice } from "./vat";

// Plans come from src/lib/config/plans.ts (seeded into the Plan table). Stripe Price ids come from env.

export type PlanKey = PlanConfig["key"];
export type PaidPlanKey = Exclude<PlanKey, "FREE">;

type PriceEnv = Pick<ServerEnv, "STRIPE_PRICE_B2C_MONTHLY" | "STRIPE_PRICE_B2B_MONTHLY" | "STRIPE_PRICE_B2B_ANNUAL" | "STRIPE_MOCK">;

export function getPlan(key: PlanKey, source: readonly PlanConfig[] = plans): PlanConfig {
  const plan = source.find((p) => p.key === key);
  if (!plan) throw new Error(`Unknown plan ${key}`);
  return plan;
}

export function isPaidPlanKey(value: unknown): value is PaidPlanKey {
  return typeof value === "string" && value !== "FREE" && plans.some((p) => p.key === value);
}

function priceEnvValue(plan: PlanConfig, env: PriceEnv): string | undefined {
  switch (plan.stripePriceEnv) {
    case "STRIPE_PRICE_B2C_MONTHLY":
      return env.STRIPE_PRICE_B2C_MONTHLY;
    case "STRIPE_PRICE_B2B_MONTHLY":
      return env.STRIPE_PRICE_B2B_MONTHLY;
    case "STRIPE_PRICE_B2B_ANNUAL":
      return env.STRIPE_PRICE_B2B_ANNUAL;
    default:
      return undefined;
  }
}

/** Stripe Price id for a paid plan. With STRIPE_MOCK a stable fake id is used when env has none. */
export function priceIdForPlan(plan: PlanConfig, env: PriceEnv): string {
  const fromEnv = priceEnvValue(plan, env);
  if (fromEnv && fromEnv !== "price_") return fromEnv;
  if (env.STRIPE_MOCK) return `price_mock_${plan.key.toLowerCase()}`;
  throw new Error(`Missing ${plan.stripePriceEnv ?? "price"} for plan ${plan.key}`);
}

/** Reverse lookup used by the webhook (the Stripe Price is the truth for what was bought). */
export function planKeyForPriceId(priceId: string, env: PriceEnv, source: readonly PlanConfig[] = plans): PaidPlanKey | null {
  for (const plan of source) {
    if (plan.key === "FREE") continue;
    try {
      if (priceIdForPlan(plan, env) === priceId) return plan.key as PaidPlanKey;
    } catch {
      // plan without a configured price id
    }
  }
  return null;
}

/**
 * The plan as shown to customers: the DB row (seeded from config, editable without deploy) wins for the
 * amount; config fills in when the row is missing (fresh database).
 */
export async function loadDisplayPlan(db: PrismaClient, key: PaidPlanKey): Promise<PlanConfig> {
  const base = getPlan(key);
  const row = await db.plan.findUnique({ where: { code: key }, select: { unitAmountOre: true, minSeats: true, trialDays: true, trialMaxSeats: true, active: true } });
  if (!row?.active) return base;
  return { ...base, unitAmountOre: row.unitAmountOre, minSeats: row.minSeats, trialDays: row.trialDays, trialMaxSeats: row.trialMaxSeats };
}

export interface PlanMismatch {
  key: string;
  field: string;
  config: unknown;
  db: unknown;
}

/** Deploy/boot check: config vs. Plan table (docs/07 § 2). Returns every mismatch; empty = consistent. */
export async function crossCheckPlans(db: PrismaClient, source: readonly PlanConfig[] = plans): Promise<PlanMismatch[]> {
  const rows = await db.plan.findMany();
  const out: PlanMismatch[] = [];
  for (const plan of source) {
    if (plan.key === "FREE") continue;
    const row = rows.find((r) => r.code === plan.key);
    if (!row) {
      out.push({ key: plan.key, field: "row", config: "present", db: "missing" });
      continue;
    }
    const pairs: [string, unknown, unknown][] = [
      ["unitAmountOre", plan.unitAmountOre, row.unitAmountOre],
      ["minSeats", plan.minSeats, row.minSeats],
      ["taxBehavior", plan.taxMode, row.taxBehavior],
      ["interval", plan.interval, row.interval],
      ["active", true, row.active],
    ];
    for (const [field, config, dbValue] of pairs) if (config !== dbValue) out.push({ key: plan.key, field, config, db: dbValue });
  }
  return out;
}

/** Display strings for a plan, e.g. "49,00 kr. pr. md. inkl. moms". */
export function describePrice(plan: PlanConfig, seats = 1): { headline: string; grossOre: number; netOre: number } {
  const t = getMessages().billing;
  const interval = plan.interval ? t.interval[plan.interval] : "";
  const total = planPrice(plan, seats);
  if (plan.taxMode === "EXCLUSIVE") {
    const perSeat = planPrice(plan, 1);
    return {
      headline: format(t.price.perSeatExVat, { amount: formatDkk(perSeat.netOre), interval, incl: formatDkk(perSeat.grossOre) }),
      grossOre: total.grossOre,
      netOre: total.netOre,
    };
  }
  return { headline: format(t.price.inclVat, { amount: formatDkk(total.grossOre), interval }), grossOre: total.grossOre, netOre: total.netOre };
}

export { billingRules };
