import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { z } from "zod";
import type { Organization } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { checkoutConsent, textHash } from "./consent-text";
import { nowOf, type BillingDeps } from "./deps";
import { currentSubscription } from "./entitlements";
import { billingRules, getPlan, priceIdForPlan, type PaidPlanKey } from "./plans";
import { seatUsage } from "./seats";

// Checkout (docs/07-betaling.md § 4, § 6, § 8.2). Callers have already verified the user is OWNER of the
// organization (server action → requireMembership). Nothing here writes `Subscription` — the webhook does.

const BLOCKING: string[] = ["ACTIVE", "TRIALING", "PAST_DUE", "PAUSED"];
const CHECKOUT_RATE_LIMIT = { window: 60 * 60, max: 5 };

export type CheckoutError =
  | "CONSENTS_REQUIRED"
  | "NOT_PERSONAL"
  | "NOT_BUSINESS"
  | "ALREADY_SUBSCRIBED"
  | "RATE_LIMITED"
  | "MIN_SEATS"
  | "BELOW_USED"
  | "INVALID_CVR"
  | "TRIAL_USED";

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: CheckoutError };

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

function taxRate(id: string | undefined): string[] | undefined {
  return id && id !== "txr_" ? [id] : undefined;
}

async function ensureCustomer(deps: BillingDeps, org: Organization, email: string, extra: Partial<Stripe.CustomerCreateParams> = {}): Promise<string> {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await deps.stripe.customers.create(
    { email, name: org.name, preferred_locales: ["da"], metadata: { organizationId: org.id }, ...extra },
    { idempotencyKey: `customer:${org.id}` },
  );
  await deps.db.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}

export const b2cCheckoutInput = z.object({
  immediateAccess: z.literal(true),
  withdrawalLossAck: z.literal(true),
});

/** B2C "Køb": both declarations are stored as ConsentRecord BEFORE the customer is sent to Stripe. */
export async function startB2CCheckout(
  deps: BillingDeps,
  args: { organizationId: string; user: { id: string; email: string }; consents: { immediateAccess: boolean; withdrawalLossAck: boolean }; request: RequestMeta },
): Promise<CheckoutResult> {
  if (!b2cCheckoutInput.safeParse(args.consents).success) return { ok: false, error: "CONSENTS_REQUIRED" };
  const org = await deps.db.organization.findUniqueOrThrow({ where: { id: args.organizationId } });
  if (org.type !== "PERSONAL") return { ok: false, error: "NOT_PERSONAL" };
  const existing = await currentSubscription(deps.db, org.id);
  if (existing && BLOCKING.includes(existing.status)) {
    const withdrawn = (await deps.db.withdrawalRequest.count({ where: { subscriptionId: existing.id } })) > 0;
    if (!withdrawn) return { ok: false, error: "ALREADY_SUBSCRIBED" };
  }
  const limited = await consumeRateLimit(deps.db, `checkout:${org.id}`, CHECKOUT_RATE_LIMIT);
  if (!limited.allowed) return { ok: false, error: "RATE_LIMITED" };

  const plan = getPlan("B2C_MONTHLY");
  const customer = await ensureCustomer(deps, org, args.user.email);
  const app = deps.env.APP_URL;
  const session = await deps.stripe.checkout.sessions.create(
    {
      mode: "subscription",
      ui_mode: "hosted_page",
      customer,
      line_items: [{ price: priceIdForPlan(plan, deps.env), quantity: 1, tax_rates: taxRate(deps.env.TAX_RATE_DK_25_INCLUSIVE) }],
      billing_address_collection: "required",
      locale: "da",
      metadata: { organizationId: org.id, planKey: plan.key, consentTextVersion: checkoutConsent.version },
      subscription_data: { metadata: { organizationId: org.id, planKey: plan.key } },
      success_url: `${app}/konto/abonnement?tak=1`,
      cancel_url: `${app}/koeb?afbrudt=1`,
    },
    { idempotencyKey: `checkout:${org.id}:${plan.key}:${randomUUID()}` },
  );
  if (!session.url) throw new Error("Stripe returned a checkout session without url");

  const at = nowOf(deps);
  const common = {
    userId: args.user.id,
    organizationId: org.id,
    subjectEmail: args.user.email.trim().toLowerCase(),
    action: "GRANTED" as const,
    textVersion: checkoutConsent.version,
    source: "CHECKOUT" as const,
    ip: args.request.ip,
    userAgent: args.request.userAgent,
    checkoutSessionId: session.id,
    createdAt: at,
  };
  await deps.db.consentRecord.createMany({
    data: [
      { ...common, purpose: "IMMEDIATE_ACCESS_REQUEST", textHash: textHash(checkoutConsent.immediateAccess) },
      { ...common, purpose: "WITHDRAWAL_LOSS_ACK", textHash: textHash(checkoutConsent.withdrawalLossAck) },
    ],
  });
  await writeAudit(deps.db, {
    action: "CHECKOUT_STARTED",
    actorUserId: args.user.id,
    organizationId: org.id,
    targetType: "checkout_session",
    targetId: session.id,
    metadata: { planKey: plan.key },
    ip: args.request.ip,
    userAgent: args.request.userAgent,
  });
  return { ok: true, url: session.url };
}

export const cvrSchema = z.string().trim().regex(/^\d{8}$/);

/** B2B trial: 14 days, no card, 5 seats. Stripe subscription without payment method (docs/07 § 6). */
export async function startB2BTrial(
  deps: BillingDeps,
  args: { organizationId: string; user: { id: string; email: string }; cvr: string },
): Promise<{ ok: true } | { ok: false; error: CheckoutError }> {
  const cvr = cvrSchema.safeParse(args.cvr);
  if (!cvr.success) return { ok: false, error: "INVALID_CVR" };
  const org = await deps.db.organization.findUniqueOrThrow({ where: { id: args.organizationId } });
  if (org.type !== "BUSINESS") return { ok: false, error: "NOT_BUSINESS" };
  if ((await deps.db.subscription.count({ where: { organizationId: org.id } })) > 0) return { ok: false, error: "ALREADY_SUBSCRIBED" };
  // One trial per CVR (docs/07 § 6.1).
  const usedElsewhere = await deps.db.subscription.count({ where: { organization: { cvr: cvr.data, id: { not: org.id } } } });
  if (usedElsewhere > 0) return { ok: false, error: "TRIAL_USED" };

  await deps.db.organization.update({ where: { id: org.id }, data: { cvr: cvr.data } });
  const customer = await ensureCustomer(deps, { ...org, cvr: cvr.data }, args.user.email, { metadata: { organizationId: org.id, cvr: cvr.data } });
  const plan = getPlan("B2B_MONTHLY");
  await deps.stripe.subscriptions.create(
    {
      customer,
      items: [{ price: priceIdForPlan(plan, deps.env), quantity: billingRules.b2bTrialMaxUsers, tax_rates: taxRate(deps.env.TAX_RATE_DK_25_EXCLUSIVE) }],
      trial_period_days: billingRules.b2bTrialDays,
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_settings: { end_behavior: { missing_payment_method: "pause" } },
      metadata: { organizationId: org.id, planKey: plan.key, trial: "true" },
    },
    { idempotencyKey: `trial:${org.id}` },
  );
  await writeAudit(deps.db, { action: "TRIAL_STARTED", actorUserId: args.user.id, organizationId: org.id, targetType: "organization", targetId: org.id, metadata: { cvr: cvr.data } });
  return { ok: true };
}

/** B2B "Køb": new subscription (seats ≥ 5), or card collection to convert a running/expired trial. */
export async function startB2BCheckout(
  deps: BillingDeps,
  args: { organizationId: string; user: { id: string; email: string }; planKey: Extract<PaidPlanKey, "B2B_MONTHLY" | "B2B_ANNUAL">; seats: number },
): Promise<CheckoutResult> {
  const org = await deps.db.organization.findUniqueOrThrow({ where: { id: args.organizationId } });
  if (org.type !== "BUSINESS") return { ok: false, error: "NOT_BUSINESS" };
  const plan = getPlan(args.planKey);
  // Server-side minimum regardless of the UI (docs/07 § 4.2).
  if (!Number.isInteger(args.seats) || args.seats < Math.max(plan.minSeats, billingRules.b2bMinSeats) || args.seats > 500) return { ok: false, error: "MIN_SEATS" };
  if (args.seats < (await seatUsage(deps.db, org.id, nowOf(deps)))) return { ok: false, error: "BELOW_USED" };
  const limited = await consumeRateLimit(deps.db, `checkout:${org.id}`, CHECKOUT_RATE_LIMIT);
  if (!limited.allowed) return { ok: false, error: "RATE_LIMITED" };

  const customer = await ensureCustomer(deps, org, org.billingEmail ?? args.user.email);
  const existing = await currentSubscription(deps.db, org.id);
  const app = deps.env.APP_URL;
  const urls = { success_url: `${app}/virksomhed/abonnement?tak=1`, cancel_url: `${app}/virksomhed/abonnement?afbrudt=1` };
  let session: { id: string; url: string | null };

  if (existing?.status === "TRIALING") {
    session = await deps.stripe.checkout.sessions.create(
      {
        mode: "setup",
        ui_mode: "hosted_page",
        currency: "dkk",
        customer,
        locale: "da",
        metadata: { organizationId: org.id, planKey: plan.key, seats: String(args.seats), convertSubscriptionId: existing.stripeSubscriptionId },
        ...urls,
      },
      { idempotencyKey: `convert:${org.id}:${randomUUID()}` },
    );
  } else {
    if (existing && BLOCKING.includes(existing.status) && existing.status !== "PAUSED") return { ok: false, error: "ALREADY_SUBSCRIBED" };
    // An expired trial (paused, no card) is closed so the paid subscription can replace it.
    if (existing?.status === "PAUSED") await deps.stripe.subscriptions.cancel(existing.stripeSubscriptionId, { prorate: false, invoice_now: false });
    session = await deps.stripe.checkout.sessions.create(
      {
        mode: "subscription",
        ui_mode: "hosted_page",
        customer,
        locale: "da",
        billing_address_collection: "required",
        line_items: [{ price: priceIdForPlan(plan, deps.env), quantity: args.seats, tax_rates: taxRate(deps.env.TAX_RATE_DK_25_EXCLUSIVE) }],
        metadata: { organizationId: org.id, planKey: plan.key },
        subscription_data: { metadata: { organizationId: org.id, planKey: plan.key } },
        ...urls,
      },
      { idempotencyKey: `checkout:${org.id}:${plan.key}:${randomUUID()}` },
    );
  }
  if (!session.url) throw new Error("Stripe returned a checkout session without url");
  await writeAudit(deps.db, { action: "CHECKOUT_STARTED", actorUserId: args.user.id, organizationId: org.id, targetType: "checkout_session", targetId: session.id, metadata: { planKey: plan.key, seats: args.seats } });
  return { ok: true, url: session.url };
}

/** Customer Portal link, created per click and never stored (docs/07 § 4.4). */
export async function portalUrl(deps: BillingDeps, organizationId: string, returnPath: string): Promise<string | null> {
  const org = await deps.db.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { stripeCustomerId: true } });
  if (!org.stripeCustomerId) return null;
  const configuration = deps.env.STRIPE_PORTAL_CONFIGURATION_ID && deps.env.STRIPE_PORTAL_CONFIGURATION_ID !== "bpc_" ? deps.env.STRIPE_PORTAL_CONFIGURATION_ID : undefined;
  const session = await deps.stripe.billingPortal.sessions.create({ customer: org.stripeCustomerId, return_url: `${deps.env.APP_URL}${returnPath}`, locale: "da", configuration });
  return session.url;
}
