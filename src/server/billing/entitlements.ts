import type { OrganizationType, PrismaClient, SubscriptionStatus } from "@/generated/prisma/client";
import { billingRules } from "@/lib/config/plans";
import type { PlanKey } from "./plans";

// The ONLY place access is decided (docs/07-betaling.md § 3). Status comes from `Subscription`, which only
// the Stripe webhook writes; the clock is passed in so expiry rules are testable.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SubscriptionSnapshot {
  planKey: string;
  status: SubscriptionStatus;
  quantity: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  /** A "Fortryd aftale" request exists for this subscription → FREE immediately (§ 8.6). */
  withdrawn: boolean;
}

export interface EntitlementInput {
  orgType: OrganizationType;
  orgSeatLimit: number;
  subscription: SubscriptionSnapshot | null;
  now: Date;
}

export type Access = "FREE" | "FULL" | "READ_ONLY" | "NONE";

export interface Entitlements {
  planKey: PlanKey;
  status: SubscriptionStatus | "NONE";
  access: Access;
  modules: "FREE_LIMITED" | "FULL" | "NONE";
  /** FREE: number of modules in the personal plan that are open (plus the placement test). */
  freeModuleLimit: number | null;
  placementTest: boolean;
  seatLimit: number;
  monthlyCycle: boolean;
  certificates: boolean;
  companyReport: boolean;
  reportWatermark: "TRIAL" | null;
  readOnly: boolean;
  banner: "PAST_DUE" | "TRIAL_ENDED" | "READ_ONLY" | null;
  readOnlyUntil: Date | null;
}

function free(status: Entitlements["status"]): Entitlements {
  return {
    planKey: "FREE",
    status,
    access: "FREE",
    modules: "FREE_LIMITED",
    freeModuleLimit: billingRules.b2cFreeModules,
    placementTest: true,
    seatLimit: 1,
    monthlyCycle: false,
    certificates: false,
    companyReport: false,
    reportWatermark: null,
    readOnly: false,
    banner: null,
    readOnlyUntil: null,
  };
}

/** B2B org that has not started a trial yet: the owner can set up and invite within seatLimit, no modules. */
function businessWithoutPlan(seatLimit: number, status: Entitlements["status"]): Entitlements {
  return { ...free(status), planKey: "FREE", access: "NONE", modules: "NONE", freeModuleLimit: null, placementTest: false, seatLimit };
}

function full(planKey: string, status: SubscriptionStatus, seatLimit: number): Entitlements {
  return {
    planKey: planKey as PlanKey,
    status,
    access: "FULL",
    modules: "FULL",
    freeModuleLimit: null,
    placementTest: true,
    seatLimit,
    monthlyCycle: true,
    certificates: true,
    companyReport: false,
    reportWatermark: null,
    readOnly: false,
    banner: null,
    readOnlyUntil: null,
  };
}

function readOnly(planKey: string, status: SubscriptionStatus, seatLimit: number, until: Date | null, banner: Entitlements["banner"]): Entitlements {
  return {
    ...full(planKey, status, seatLimit),
    access: "READ_ONLY",
    modules: "NONE",
    placementTest: false,
    monthlyCycle: false,
    certificates: false,
    companyReport: true,
    readOnly: true,
    banner,
    readOnlyUntil: until,
  };
}

/** Status after correcting for webhook lag: a period that has run out is over even if no event arrived yet. */
export function effectiveStatus(sub: SubscriptionSnapshot, now: Date): SubscriptionStatus {
  const live = sub.status === "ACTIVE" || sub.status === "TRIALING" || sub.status === "PAST_DUE";
  if (live && sub.cancelAtPeriodEnd) {
    const end = sub.status === "TRIALING" ? (sub.trialEnd ?? sub.currentPeriodEnd) : sub.currentPeriodEnd;
    if (end && end.getTime() <= now.getTime()) return "CANCELED";
  }
  if (sub.status === "TRIALING" && sub.trialEnd && sub.trialEnd.getTime() <= now.getTime()) return "PAUSED";
  return sub.status;
}

export function computeEntitlements(input: EntitlementInput): Entitlements {
  const { orgType, subscription: sub, now } = input;
  const isB2B = orgType === "BUSINESS";
  if (!sub) return isB2B ? businessWithoutPlan(input.orgSeatLimit, "NONE") : free("NONE");
  if (sub.withdrawn && !isB2B) return free(sub.status);

  const status = effectiveStatus(sub, now);
  const seats = isB2B ? sub.quantity : 1;
  const lapsed = (banner: Entitlements["banner"], from: Date | null): Entitlements => {
    if (!isB2B) return free(status);
    const until = new Date((from ?? now).getTime() + billingRules.readOnlyRetentionDaysAfterCancel * DAY_MS);
    if (until.getTime() <= now.getTime()) return { ...readOnly(sub.planKey, status, seats, until, "READ_ONLY"), access: "NONE", companyReport: false };
    return readOnly(sub.planKey, status, seats, until, banner);
  };

  switch (status) {
    case "TRIALING":
      return { ...full(sub.planKey, status, Math.min(seats, billingRules.b2bTrialMaxUsers)), companyReport: isB2B, reportWatermark: "TRIAL" };
    case "ACTIVE":
      return { ...full(sub.planKey, status, seats), companyReport: isB2B };
    case "PAST_DUE": {
      const graceStart = sub.currentPeriodStart ?? now;
      if (now.getTime() <= graceStart.getTime() + billingRules.pastDueGraceDays * DAY_MS) {
        return { ...full(sub.planKey, status, seats), companyReport: isB2B, banner: "PAST_DUE" };
      }
      return lapsed("READ_ONLY", new Date(graceStart.getTime() + billingRules.pastDueGraceDays * DAY_MS));
    }
    case "PAUSED":
      return isB2B ? readOnly(sub.planKey, status, seats, null, "TRIAL_ENDED") : free(status);
    case "CANCELED":
    case "UNPAID":
    case "INCOMPLETE_EXPIRED":
      return lapsed("READ_ONLY", sub.endedAt ?? sub.canceledAt ?? sub.currentPeriodEnd);
    case "INCOMPLETE":
      return isB2B ? businessWithoutPlan(input.orgSeatLimit, status) : free(status);
  }
}

const OPEN: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "INCOMPLETE", "UNPAID"];

/** The org's current subscription row: the open one if any, otherwise the most recent. */
export async function currentSubscription(db: PrismaClient, organizationId: string) {
  return (
    (await db.subscription.findFirst({ where: { organizationId, status: { in: OPEN } }, orderBy: { updatedAt: "desc" } })) ??
    (await db.subscription.findFirst({ where: { organizationId }, orderBy: { updatedAt: "desc" } }))
  );
}

export async function getEntitlements(db: PrismaClient, organizationId: string, now: Date = new Date()): Promise<Entitlements> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { type: true, seatLimit: true } });
  const sub = await currentSubscription(db, organizationId);
  const withdrawn = sub ? (await db.withdrawalRequest.count({ where: { subscriptionId: sub.id } })) > 0 : false;
  return computeEntitlements({ orgType: org.type, orgSeatLimit: org.seatLimit, subscription: sub ? { ...sub, withdrawn } : null, now });
}
