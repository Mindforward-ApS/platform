import "server-only";
import { z } from "zod";
import type { Prisma, SubscriptionStatus } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import type { BillingDeps } from "./deps";
import { isPaidPlanKey, planKeyForPriceId } from "./plans";
import { withdrawalDeadline } from "./time";

// Mirrors a Stripe subscription into `Subscription` (docs/07-betaling.md § 10). This module is the ONLY
// writer of `Subscription`, and it only runs from the webhook path. It always re-fetches the subscription
// from Stripe (state-based), and ignores events older than the last one applied (out-of-order guard).

const idOf = z.union([z.string(), z.object({ id: z.string() })]).transform((v) => (typeof v === "string" ? v : v.id));

const itemSchema = z.object({
  id: z.string(),
  price: z.object({ id: z.string() }),
  quantity: z.number().int().nullish(),
  current_period_start: z.number(),
  current_period_end: z.number(),
});

export const stripeSubscriptionSchema = z.object({
  id: z.string(),
  customer: idOf,
  status: z.string(),
  metadata: z.record(z.string(), z.string()).default({}),
  cancel_at_period_end: z.boolean(),
  canceled_at: z.number().nullable(),
  ended_at: z.number().nullable(),
  created: z.number(),
  trial_end: z.number().nullable(),
  latest_invoice: idOf.nullish(),
  items: z.object({ data: z.array(itemSchema).min(1) }),
});

export type StripeSubscription = z.infer<typeof stripeSubscriptionSchema>;

const STATUS: Record<string, SubscriptionStatus> = {
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  unpaid: "UNPAID",
  paused: "PAUSED",
};

const OPEN_STATUSES: SubscriptionStatus[] = ["TRIALING", "ACTIVE", "PAST_DUE", "PAUSED", "INCOMPLETE", "UNPAID"];

const date = (seconds: number | null | undefined) => (seconds ? new Date(seconds * 1000) : null);

export function mapStatus(status: string): SubscriptionStatus {
  const mapped = STATUS[status];
  if (!mapped) throw new Error(`Unknown Stripe subscription status ${status}`);
  return mapped;
}

/** organizationId never comes from the client: Stripe metadata (set server-side) + the Customer link in DB. */
async function resolveOrganization(deps: BillingDeps, sub: StripeSubscription) {
  const organizationId = sub.metadata.organizationId;
  if (!organizationId) throw new Error(`Subscription ${sub.id} has no organizationId metadata`);
  const org = await deps.db.organization.findUnique({ where: { id: organizationId }, select: { id: true, type: true, stripeCustomerId: true } });
  if (!org) throw new Error(`Subscription ${sub.id} points at unknown organization`);
  if (org.stripeCustomerId && org.stripeCustomerId !== sub.customer) throw new Error(`Subscription ${sub.id} customer does not match organization`);
  if (!org.stripeCustomerId) await deps.db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: sub.customer } });
  return org;
}

export interface SyncResult {
  applied: boolean;
  subscriptionId: string | null;
  organizationId: string;
}

export async function syncSubscription(deps: BillingDeps, stripeSubscriptionId: string, event: { id: string; createdAt: Date }): Promise<SyncResult> {
  const sub = stripeSubscriptionSchema.parse(await deps.stripe.subscriptions.retrieve(stripeSubscriptionId));
  const org = await resolveOrganization(deps, sub);
  const item = sub.items.data[0]!;
  const planKey = planKeyForPriceId(item.price.id, deps.env) ?? (isPaidPlanKey(sub.metadata.planKey) ? sub.metadata.planKey : null);
  if (!planKey) throw new Error(`Subscription ${sub.id} has an unknown price ${item.price.id}`);
  const plan = await deps.db.plan.findUnique({ where: { code: planKey }, select: { id: true } });
  const status = mapStatus(sub.status);
  const quantity = item.quantity ?? 1;
  const cancellationAt = sub.metadata.cancellationRequestedInAppAt ? new Date(sub.metadata.cancellationRequestedInAppAt) : null;

  const fields = {
    organizationId: org.id,
    planId: plan?.id ?? null,
    planKey,
    stripeCustomerId: sub.customer,
    stripePriceId: item.price.id,
    status,
    quantity,
    currentPeriodStart: date(item.current_period_start),
    currentPeriodEnd: date(item.current_period_end),
    trialEnd: date(sub.trial_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: date(sub.canceled_at),
    endedAt: date(sub.ended_at),
    cancellationRequestedInAppAt: cancellationAt && !Number.isNaN(cancellationAt.getTime()) ? cancellationAt : null,
    lastStripeEventAt: event.createdAt,
    lastStripeEventId: event.id,
  } satisfies Prisma.SubscriptionUncheckedUpdateInput;

  return deps.db.$transaction(async (tx) => {
    // Serialize handlers for the same subscription (Stripe delivers concurrently and out of order).
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`stripe-sub:${sub.id}`}))`;
    const existing = await tx.subscription.findUnique({ where: { stripeSubscriptionId: sub.id } });
    if (existing && existing.lastStripeEventAt.getTime() > event.createdAt.getTime()) {
      return { applied: false, subscriptionId: existing.id, organizationId: org.id };
    }
    const row = existing
      ? await tx.subscription.update({ where: { id: existing.id }, data: fields })
      : await tx.subscription.create({
          data: {
            ...fields,
            stripeSubscriptionId: sub.id,
            // B2C: "Fortryd aftale" is shown until the end of day 14 after the purchase (§ 20 a).
            withdrawalDeadlineAt: org.type === "PERSONAL" ? withdrawalDeadline(new Date(sub.created * 1000)) : null,
          },
        });

    if (org.type === "BUSINESS" && OPEN_STATUSES.includes(status)) {
      await tx.organization.update({ where: { id: org.id }, data: { seatLimit: quantity } });
    }
    if (!existing || existing.status !== status || existing.quantity !== quantity || existing.cancelAtPeriodEnd !== row.cancelAtPeriodEnd) {
      await writeAudit(tx, {
        action: "SUBSCRIPTION_CHANGED",
        organizationId: org.id,
        targetType: "subscription",
        targetId: row.id,
        metadata: {
          stripeEventId: event.id,
          from: existing ? { status: existing.status, quantity: existing.quantity, cancelAtPeriodEnd: existing.cancelAtPeriodEnd } : null,
          to: { status, quantity, cancelAtPeriodEnd: row.cancelAtPeriodEnd, planKey },
        },
      });
    }
    return { applied: true, subscriptionId: row.id, organizationId: org.id };
  });
}
