import { z } from "zod";

// Owner customer overview (/admin/kunder). Business targets and thresholds live here, never in components.

const ownerDashboardSchema = z.object({
  /** Annual recurring revenue goal, net of VAT, in øre. */
  arrGoalOre: z.number().int().positive(),
  /** A company with no learning activity for this many days is flagged as inactive. */
  inactiveAfterDays: z.number().int().positive(),
  /** A company created within this many days is shown as onboarding, not as inactive. */
  onboardingDays: z.number().int().positive(),
  /** How often an open page re-reads the data. */
  refreshSeconds: z.number().int().min(10),
});

export type OwnerDashboardConfig = z.infer<typeof ownerDashboardSchema>;

export const ownerDashboard: OwnerDashboardConfig = ownerDashboardSchema.parse({
  arrGoalOre: 100_000_000, // 1.000.000 kr
  inactiveAfterDays: 14,
  onboardingDays: 14,
  refreshSeconds: 30,
});
