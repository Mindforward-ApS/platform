import type { SubscriptionStatus } from "@/generated/prisma/client";
import type { OwnerDashboardConfig } from "@/lib/config/owner-dashboard";
import { billingRules, plans, type PlanConfig } from "@/lib/config/plans";
import { splitInclusive } from "@/server/billing/vat";

// Pure calculations behind the owner customer overview (/admin/kunder). No database access here,
// so every rule is unit-tested (tests/unit/owner-customers.test.ts).

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuses where the customer is being charged. Trials pay nothing yet; ended subscriptions pay nothing. */
const PAYING: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>(["ACTIVE", "PAST_DUE"]);
/** Statuses that still describe a live customer relationship (used to pick the current subscription). */
const OPEN: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>([
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "UNPAID",
  "INCOMPLETE",
  "PAUSED",
]);
const PAYMENT_ISSUE: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>(["PAST_DUE", "UNPAID", "INCOMPLETE", "PAUSED"]);
const ENDED: ReadonlySet<SubscriptionStatus> = new Set<SubscriptionStatus>(["CANCELED", "INCOMPLETE_EXPIRED"]);

export interface SubscriptionInput {
  planKey: string;
  status: SubscriptionStatus;
  quantity: number;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  /** Price per seat per interval from the subscription's Plan row; null falls back to config. */
  unitAmountOre: number | null;
}

export function isOpenSubscription(status: SubscriptionStatus): boolean {
  return OPEN.has(status);
}

/** The subscription that describes the customer now: the newest open one, else the newest of any status. */
export function pickCurrentSubscription<T extends Pick<SubscriptionInput, "status" | "createdAt">>(subs: readonly T[]): T | null {
  const newestFirst = [...subs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return newestFirst.find((s) => OPEN.has(s.status)) ?? newestFirst[0] ?? null;
}

/** Monthly recurring revenue for one subscription, net of VAT, in øre. */
export function monthlyNetOre(
  sub: Pick<SubscriptionInput, "planKey" | "status" | "quantity" | "unitAmountOre">,
  source: readonly PlanConfig[] = plans,
): number {
  if (!PAYING.has(sub.status)) return 0;
  const plan = source.find((p) => p.key === sub.planKey);
  if (!plan || plan.interval === null) return 0;
  const gross = (sub.unitAmountOre ?? plan.unitAmountOre) * Math.max(sub.quantity, 0);
  const net = plan.taxMode === "INCLUSIVE" ? splitInclusive(gross, billingRules.vatRate).netOre : gross;
  return plan.interval === "YEAR" ? Math.round(net / 12) : net;
}

/** Seats the customer is paying for right now. */
export function paidSeats(sub: Pick<SubscriptionInput, "status" | "quantity">): number {
  return PAYING.has(sub.status) ? Math.max(sub.quantity, 0) : 0;
}

export type CustomerStatus =
  | { kind: "PAYMENT_ISSUE" }
  | { kind: "CANCELED" }
  | { kind: "CANCELING" }
  | { kind: "TRIAL" }
  | { kind: "NO_SUBSCRIPTION" }
  | { kind: "ONBOARDING" }
  | { kind: "INACTIVE"; days: number | null }
  | { kind: "ACTIVE" };

export function daysBetween(earlier: Date, later: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / DAY_MS);
}

/**
 * One status per customer, most urgent first: billing problems, ended, ending, trial, not started.
 * Paying customers are then judged on learning activity: new ones are onboarding, quiet ones inactive.
 */
export function customerStatus(
  input: { subscription: Pick<SubscriptionInput, "status" | "cancelAtPeriodEnd"> | null; createdAt: Date; lastActivityAt: Date | null },
  now: Date,
  cfg: Pick<OwnerDashboardConfig, "inactiveAfterDays" | "onboardingDays">,
): CustomerStatus {
  const sub = input.subscription;
  if (!sub) return { kind: "NO_SUBSCRIPTION" };
  if (PAYMENT_ISSUE.has(sub.status)) return { kind: "PAYMENT_ISSUE" };
  if (ENDED.has(sub.status)) return { kind: "CANCELED" };
  if (sub.cancelAtPeriodEnd) return { kind: "CANCELING" };
  if (sub.status === "TRIALING") return { kind: "TRIAL" };
  if (daysBetween(input.createdAt, now) < cfg.onboardingDays) return { kind: "ONBOARDING" };
  if (!input.lastActivityAt) return { kind: "INACTIVE", days: null };
  const quietDays = daysBetween(input.lastActivityAt, now);
  return quietDays >= cfg.inactiveAfterDays ? { kind: "INACTIVE", days: quietDays } : { kind: "ACTIVE" };
}

/** Share of active members with at least one passed module, 0–100. Null when nobody is active. */
export function completionPct(activeMembers: number, membersWithPassed: number): number | null {
  if (activeMembers <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((membersWithPassed / activeMembers) * 100)));
}

export interface MetricsRow {
  mrrOre: number;
  paidSeats: number;
  activeMembers: number;
  membersWithPassed: number;
}

export interface Totals {
  mrrOre: number;
  arrOre: number;
  goalOre: number;
  /** Whole percent of the ARR goal reached, rounded down so progress is never overstated. */
  goalPct: number;
  paidSeats: number;
  completionPct: number | null;
}

export function summarize(rows: readonly MetricsRow[], goalOre: number): Totals {
  const sum = (pick: (r: MetricsRow) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
  const mrrOre = sum((r) => r.mrrOre);
  const arrOre = mrrOre * 12;
  return {
    mrrOre,
    arrOre,
    goalOre,
    goalPct: goalOre > 0 ? Math.floor((arrOre / goalOre) * 100) : 0,
    paidSeats: sum((r) => r.paidSeats),
    completionPct: completionPct(
      sum((r) => r.activeMembers),
      sum((r) => r.membersWithPassed),
    ),
  };
}
