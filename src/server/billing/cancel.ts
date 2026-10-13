import "server-only";
import { writeAudit } from "@/server/audit/log";
import { sendServiceEmail } from "@/server/email/send";
import { nowOf, type BillingDeps } from "./deps";
import { currentSubscription } from "./entitlements";
import { stripeSubscriptionSchema } from "./sync";
import { formatDate, formatTime } from "./time";

// In-app cancellation (forbrugeraftaleloven § 28 a; docs/07 § 8.7; 00 § 10): cancel any day, access until the
// end of the paid period, no refund for a started month. Stripe: cancel_at_period_end. The Subscription row
// follows via webhook. Callers have verified OWNER.

const CANCELLABLE = ["ACTIVE", "TRIALING", "PAST_DUE"];

export type CancelError = "NOTHING_TO_CANCEL" | "NOT_CANCELED";

/** When access stops if cancelled now: the end of the paid period (or of the trial). */
export function accessEndsAt(sub: { status: string; currentPeriodEnd: Date | null; trialEnd: Date | null }): Date | null {
  return sub.status === "TRIALING" ? (sub.trialEnd ?? sub.currentPeriodEnd) : sub.currentPeriodEnd;
}

export async function requestCancellation(
  deps: BillingDeps,
  args: { organizationId: string; user: { id: string; email: string } },
): Promise<{ ok: true; endsAt: Date } | { ok: false; error: CancelError }> {
  const sub = await currentSubscription(deps.db, args.organizationId);
  if (!sub || !CANCELLABLE.includes(sub.status) || sub.cancelAtPeriodEnd) return { ok: false, error: "NOTHING_TO_CANCEL" };
  const at = nowOf(deps);
  const updated = stripeSubscriptionSchema.parse(
    await deps.stripe.subscriptions.update(
      sub.stripeSubscriptionId,
      { cancel_at_period_end: true, metadata: { cancellationRequestedInAppAt: at.toISOString() } },
      { idempotencyKey: `cancel:${sub.stripeSubscriptionId}:${sub.lastStripeEventId}` },
    ),
  );
  const item = updated.items.data[0]!;
  const endsAt = new Date((updated.status === "trialing" && updated.trial_end ? updated.trial_end : item.current_period_end) * 1000);

  await writeAudit(deps.db, { action: "SUBSCRIPTION_CANCEL_REQUESTED", actorUserId: args.user.id, organizationId: args.organizationId, targetType: "subscription", targetId: sub.id, metadata: { endsAt: endsAt.toISOString() } });
  await sendServiceEmail(deps.db, {
    template: "cancellation-confirmed",
    to: args.user.email,
    vars: { url: `${deps.env.APP_URL}/konto/abonnement`, date: formatDate(at), time: formatTime(at), endDate: formatDate(endsAt) },
    idempotencyKey: `cancel:${sub.stripeSubscriptionId}:${endsAt.toISOString()}:cancellation-confirmed`,
    userId: args.user.id,
    organizationId: args.organizationId,
  });
  return { ok: true, endsAt };
}

/** "Genoptag" — possible until the end date. */
export async function resumeSubscription(deps: BillingDeps, args: { organizationId: string; userId: string }): Promise<{ ok: true } | { ok: false; error: CancelError }> {
  const sub = await currentSubscription(deps.db, args.organizationId);
  if (!sub || !sub.cancelAtPeriodEnd || !CANCELLABLE.includes(sub.status)) return { ok: false, error: "NOT_CANCELED" };
  await deps.stripe.subscriptions.update(
    sub.stripeSubscriptionId,
    { cancel_at_period_end: false, metadata: { cancellationRequestedInAppAt: "" } },
    { idempotencyKey: `resume:${sub.stripeSubscriptionId}:${sub.lastStripeEventId}` },
  );
  await writeAudit(deps.db, { action: "SUBSCRIPTION_RESUMED", actorUserId: args.userId, organizationId: args.organizationId, targetType: "subscription", targetId: sub.id });
  return { ok: true };
}
