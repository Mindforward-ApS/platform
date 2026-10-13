import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { sendServiceEmail } from "@/server/email/send";
import { inngest } from "@/server/jobs/client";
import { logger } from "@/server/observability/logger";
import type { BillingDeps } from "./deps";
import { getMessages } from "@/lib/i18n";
import { checkoutConsent } from "./consent-text";
import { describePrice, getPlan, isPaidPlanKey, priceIdForPlan } from "./plans";
import { webhookSecret } from "./stripe";
import { stripeSubscriptionSchema, syncSubscription } from "./sync";
import { formatDate, formatTime } from "./time";

// POST /api/webhooks/stripe (docs/07-betaling.md § 10): verify signature on the RAW body before anything
// else → dedupe in WebhookEvent → hand off to Inngest (`stripe/event.received`) → 200 fast.

export const STRIPE_EVENT_RECEIVED = "stripe/event.received";

const eventSchema = z.object({
  id: z.string(),
  type: z.string(),
  created: z.number(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

const idOf = z.union([z.string(), z.object({ id: z.string() })]).transform((v) => (typeof v === "string" ? v : v.id));
const metadata = z.record(z.string(), z.string()).default({});

const sessionSummary = z.object({
  id: z.string(),
  mode: z.string(),
  customer: idOf.nullish(),
  subscription: idOf.nullish(),
  setup_intent: idOf.nullish(),
  payment_status: z.string().nullish(),
  metadata,
});
const invoiceSummary = z.object({
  id: z.string(),
  billing_reason: z.string().nullish(),
  parent: z.object({ subscription_details: z.object({ subscription: idOf }).nullish() }).nullish(),
});
const objectIdSummary = z.object({ id: z.string() });
const chargeSummary = z.object({ id: z.string(), payment_intent: idOf.nullish(), amount_refunded: z.number().nullish() });

/** Only ids and metadata are stored: no names, emails or card data in WebhookEvent.payload. */
const storedPayload = z.object({ id: z.string(), type: z.string(), created: z.number(), object: z.record(z.string(), z.unknown()) });

function summarize(event: z.infer<typeof eventSchema>): Prisma.InputJsonObject {
  const obj = event.data.object;
  let object: Record<string, unknown>;
  if (event.type.startsWith("checkout.session.")) object = sessionSummary.parse(obj);
  else if (event.type.startsWith("customer.subscription.")) object = objectIdSummary.parse(obj);
  else if (event.type.startsWith("invoice.")) object = invoiceSummary.parse(obj);
  else if (event.type.startsWith("charge.")) object = chargeSummary.parse(obj);
  else object = { id: typeof obj.id === "string" ? obj.id : null };
  return JSON.parse(JSON.stringify({ id: event.id, type: event.type, created: event.created, object })) as Prisma.InputJsonObject;
}

export interface WebhookResponse {
  status: number;
  body: { received?: boolean; duplicate?: boolean; error?: string };
}

export async function handleStripeWebhook(deps: BillingDeps, rawBody: string, signature: string | null): Promise<WebhookResponse> {
  if (!signature) return { status: 400, body: { error: "missing signature" } };
  let event: z.infer<typeof eventSchema>;
  try {
    event = eventSchema.parse(deps.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret(deps.env)));
  } catch (err) {
    logger.warn("stripe.webhook_rejected", { reason: err instanceof Error ? err.name : "unknown" });
    return { status: 400, body: { error: "invalid signature" } };
  }

  let rowId: string;
  try {
    const row = await deps.db.webhookEvent.create({ data: { provider: "STRIPE", externalId: event.id, type: event.type, payload: summarize(event) } });
    rowId = row.id;
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const row = await deps.db.webhookEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "STRIPE", externalId: event.id } } });
    if (row.status === "PROCESSED" || row.status === "IGNORED") return { status: 200, body: { received: true, duplicate: true } };
    rowId = row.id;
  }

  if (deps.env.JOBS_INLINE) {
    try {
      await processStripeEvent(deps, rowId);
    } catch {
      return { status: 500, body: { error: "processing failed" } };
    }
  } else {
    // `id` makes Inngest drop duplicate sends of the same Stripe event.
    await inngest.send({ name: STRIPE_EVENT_RECEIVED, id: `stripe-${event.id}`, data: { webhookEventId: rowId } });
  }
  return { status: 200, body: { received: true } };
}

/** The Inngest job body. Idempotent: a processed WebhookEvent is skipped; handlers are state-based. */
export async function processStripeEvent(deps: BillingDeps, webhookEventId: string): Promise<"PROCESSED" | "IGNORED" | "SKIPPED"> {
  const row = await deps.db.webhookEvent.findUniqueOrThrow({ where: { id: webhookEventId } });
  if (row.status === "PROCESSED" || row.status === "IGNORED") return "SKIPPED";
  const event = storedPayload.parse(row.payload);
  const meta = { id: event.id, createdAt: new Date(event.created * 1000) };

  try {
    let handled = true;
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(deps, sessionSummary.parse(event.object), meta);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed":
      case "customer.subscription.trial_will_end":
        await syncSubscription(deps, objectIdSummary.parse(event.object).id, meta);
        break;
      case "invoice.paid":
      case "invoice.payment_failed": {
        const sub = invoiceSummary.parse(event.object).parent?.subscription_details?.subscription;
        if (sub) await syncSubscription(deps, sub, meta);
        else handled = false;
        break;
      }
      case "charge.refunded": {
        const charge = chargeSummary.parse(event.object);
        await writeAudit(deps.db, { action: "REFUND_RECORDED", targetType: "charge", targetId: charge.id, metadata: { stripeEventId: event.id, amountRefunded: charge.amount_refunded ?? null } });
        break;
      }
      default:
        handled = false;
    }
    const status = handled ? "PROCESSED" : "IGNORED";
    await deps.db.webhookEvent.update({ where: { id: row.id }, data: { status, processedAt: new Date(), error: null } });
    return status;
  } catch (err) {
    logger.error("stripe.webhook_processing_failed", { type: event.type, eventId: event.id, err });
    await deps.db.webhookEvent.update({ where: { id: row.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" } });
    throw err;
  }
}

type Session = z.infer<typeof sessionSummary>;

async function onCheckoutCompleted(deps: BillingDeps, session: Session, meta: { id: string; createdAt: Date }) {
  if (session.mode === "setup") return convertTrial(deps, session, meta);
  if (session.mode !== "subscription" || !session.subscription) return;
  const result = await syncSubscription(deps, session.subscription, meta);
  if (!result.subscriptionId) return;

  // Copy the B2C declarations stored before the redirect onto the subscription (proof + order confirmation).
  const consents = await deps.db.consentRecord.findMany({ where: { checkoutSessionId: session.id, organizationId: result.organizationId } });
  const immediate = consents.find((c) => c.purpose === "IMMEDIATE_ACCESS_REQUEST");
  const waiver = consents.find((c) => c.purpose === "WITHDRAWAL_LOSS_ACK");
  if (immediate || waiver) {
    await deps.db.subscription.update({
      where: { id: result.subscriptionId },
      data: {
        immediateAccessConsentAt: immediate?.createdAt ?? null,
        withdrawalWaiverAcknowledgedAt: waiver?.createdAt ?? null,
        withdrawalConsentTextVersion: immediate?.textVersion ?? waiver?.textVersion ?? null,
      },
    });
  }

  const org = await deps.db.organization.findUniqueOrThrow({ where: { id: result.organizationId }, select: { type: true } });
  if (org.type === "PERSONAL" && session.payment_status === "paid") await sendOrderConfirmation(deps, session.id, result.subscriptionId, consents);
}

async function sendOrderConfirmation(
  deps: BillingDeps,
  sessionId: string,
  subscriptionId: string,
  consents: { purpose: string; textVersion: string; createdAt: Date; userId: string | null; subjectEmail: string }[],
) {
  const sub = await deps.db.subscription.findUniqueOrThrow({ where: { id: subscriptionId } });
  const owner = await deps.db.membership.findFirst({ where: { organizationId: sub.organizationId, role: "OWNER", deactivatedAt: null }, select: { user: { select: { id: true, email: true } } } });
  const to = consents[0]?.subjectEmail ?? owner?.user.email;
  if (!to) throw new Error(`No recipient for order confirmation of ${subscriptionId}`);
  const plan = getPlan(isPaidPlanKey(sub.planKey) ? sub.planKey : "B2C_MONTHLY");
  const textFor = (purpose: string) => (purpose === "IMMEDIATE_ACCESS_REQUEST" ? checkoutConsent.immediateAccess : checkoutConsent.withdrawalLossAck);
  const app = deps.env.APP_URL;
  const message = await sendServiceEmail(deps.db, {
    template: "order-confirmation",
    to,
    vars: {
      url: `${app}/konto/abonnement`,
      withdrawUrl: `${app}/fortryd-aftale`,
      termsUrl: `${app}/vilkaar/forbruger`,
      planName: getMessages().billing.planNames[plan.key],
      price: describePrice(plan).headline,
      startDate: formatDate(sub.currentPeriodStart ?? sub.createdAt),
      withdrawalDeadline: sub.withdrawalDeadlineAt ? formatDate(sub.withdrawalDeadlineAt) : "",
      consents: consents.map((c) => ({ text: textFor(c.purpose), date: formatDate(c.createdAt), time: formatTime(c.createdAt) })),
      seller: { name: deps.env.COMPANY_LEGAL_NAME, cvr: deps.env.COMPANY_CVR ?? "", address: deps.env.COMPANY_ADDRESS ?? "" },
    },
    idempotencyKey: `stripe:${sessionId}:order-confirmation`,
    userId: owner?.user.id ?? null,
    organizationId: sub.organizationId,
  });
  await deps.db.subscription.update({ where: { id: subscriptionId }, data: { orderConfirmationEmailMessageId: message.id } });
}

/** B2B trial → paid (docs/07 § 6.4): card saved via Checkout mode=setup, then the trial subscription is converted. */
async function convertTrial(deps: BillingDeps, session: Session, meta: { id: string; createdAt: Date }) {
  const subId = session.metadata.convertSubscriptionId;
  const planKey = session.metadata.planKey;
  const seats = Number(session.metadata.seats);
  if (!subId || !session.setup_intent || !session.customer || !isPaidPlanKey(planKey) || !Number.isInteger(seats)) {
    throw new Error(`Setup session ${session.id} is missing conversion metadata`);
  }
  const intent = z.object({ payment_method: idOf.nullable() }).parse(await deps.stripe.setupIntents.retrieve(session.setup_intent));
  if (!intent.payment_method) throw new Error(`Setup intent ${session.setup_intent} has no payment method`);
  await deps.stripe.customers.update(session.customer, { invoice_settings: { default_payment_method: intent.payment_method } }, { idempotencyKey: `convert:${session.id}:customer` });
  const current = stripeSubscriptionSchema.parse(await deps.stripe.subscriptions.retrieve(subId));
  const item = current.items.data[0]!;
  await deps.stripe.subscriptions.update(
    subId,
    {
      items: [{ id: item.id, price: priceIdForPlan(getPlan(planKey), deps.env), quantity: seats }],
      default_payment_method: intent.payment_method,
      trial_end: current.status === "trialing" ? "now" : undefined,
      proration_behavior: "none",
    },
    { idempotencyKey: `convert:${session.id}:subscription` },
  );
  await syncSubscription(deps, subId, meta);
}
