import { z } from "zod";

// Plans and billing rules (docs/07-betaling.md § 2) — the ONLY place prices are defined in code.
// The DB `plan` table is seeded from here; Stripe Price ids come from env in M6. No B2C annual plan (§ 10a).

const planSchema = z.object({
  key: z.enum(["FREE", "B2C_MONTHLY", "B2B_MONTHLY", "B2B_ANNUAL"]),
  audience: z.enum(["B2C", "B2B"]),
  interval: z.enum(["MONTH", "YEAR"]).nullable(),
  taxMode: z.enum(["INCLUSIVE", "EXCLUSIVE"]).nullable(),
  /** Price in øre per seat per interval. */
  unitAmountOre: z.number().int().min(0),
  minSeats: z.number().int().min(1),
  trialDays: z.number().int().min(0),
  trialMaxSeats: z.number().int().min(1).nullable(),
  stripePriceEnv: z.string().nullable(),
});

export type PlanConfig = z.infer<typeof planSchema>;

export const plans: readonly PlanConfig[] = z.array(planSchema).parse([
  { key: "FREE", audience: "B2C", interval: null, taxMode: null, unitAmountOre: 0, minSeats: 1, trialDays: 0, trialMaxSeats: null, stripePriceEnv: null },
  { key: "B2C_MONTHLY", audience: "B2C", interval: "MONTH", taxMode: "INCLUSIVE", unitAmountOre: 6900, minSeats: 1, trialDays: 0, trialMaxSeats: null, stripePriceEnv: "STRIPE_PRICE_B2C_MONTHLY" },
  { key: "B2B_MONTHLY", audience: "B2B", interval: "MONTH", taxMode: "EXCLUSIVE", unitAmountOre: 6900, minSeats: 5, trialDays: 14, trialMaxSeats: 5, stripePriceEnv: "STRIPE_PRICE_B2B_MONTHLY" },
  { key: "B2B_ANNUAL", audience: "B2B", interval: "YEAR", taxMode: "EXCLUSIVE", unitAmountOre: 49000, minSeats: 5, trialDays: 14, trialMaxSeats: 5, stripePriceEnv: "STRIPE_PRICE_B2B_ANNUAL" },
]);

export const billingRules = {
  b2bMinSeats: 5,
  b2bTrialDays: 14,
  b2bTrialMaxUsers: 5,
  b2cFreeModules: 3,
  withdrawalDays: 14,
  pastDueGraceDays: 14,
  readOnlyRetentionDaysAfterCancel: 90,
  vatRate: 0.25,
} as const;

/** Paid plans get a DB row; FREE has none (docs/03 § 7). */
export const paidPlans = plans.filter((p) => p.key !== "FREE");
