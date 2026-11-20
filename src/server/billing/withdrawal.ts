import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { OrganizationType, SubscriptionStatus } from "@/generated/prisma/client";
import { getMessages } from "@/lib/i18n";
import { writeAudit } from "@/server/audit/log";
import { sendServiceEmail } from "@/server/email/send";
import { inngest } from "@/server/jobs/client";
import { logger } from "@/server/observability/logger";
import { nowOf, type BillingDeps } from "./deps";
import { escalate } from "./escalate";
import { isPaidPlanKey } from "./plans";
import { stripeSubscriptionSchema } from "./sync";
import { formatDate, formatTime } from "./time";
import { formatDkk } from "./vat";

// "Fortryd aftale" (forbrugeraftaleloven § 20 a; docs/07-betaling.md § 8.4–8.6). Storage: WithdrawalRequest
// (docs/03 § 7). Receipt (page + SERVICE mail with date/time) immediately; cancel + full refund in a job.

export const WITHDRAWAL_PROCESS = "billing/withdrawal.process";

const LIVE: SubscriptionStatus[] = ["ACTIVE", "PAST_DUE", "TRIALING", "INCOMPLETE"];

/** The button is visible for B2C from purchase until the end of day 14 (Copenhagen), and hidden after. */
export function isWithdrawalOpen(
  args: { orgType: OrganizationType; status: SubscriptionStatus | null; withdrawalDeadlineAt: Date | null; alreadyWithdrawn: boolean },
  now: Date,
): boolean {
  if (args.orgType !== "PERSONAL" || !args.status || !args.withdrawalDeadlineAt || args.alreadyWithdrawn) return false;
  if (!LIVE.includes(args.status)) return false;
  return now.getTime() <= args.withdrawalDeadlineAt.getTime();
}

export const withdrawalInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(254),
  agreementReference: z.string().trim().min(1).max(300),
});

export type WithdrawalInput = z.infer<typeof withdrawalInput>;

export interface WithdrawalReceipt {
  id: string;
  submittedAt: Date;
  matched: boolean;
}

/** Signed receipt link so the public form can show the receipt without login and without guessable ids. */
export function receiptToken(secret: string, withdrawalId: string): string {
  return createHmac("sha256", secret).update(`withdrawal-receipt:${withdrawalId}`).digest("base64url").slice(0, 32);
}

export function verifyReceiptToken(secret: string, withdrawalId: string, token: string): boolean {
  const expected = Buffer.from(receiptToken(secret, withdrawalId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Finds the B2C subscription the request is about: the logged-in org, or the email's PERSONAL org. */
async function matchSubscription(deps: BillingDeps, input: WithdrawalInput, organizationId: string | null, now: Date) {
  const where = organizationId
    ? { organizationId, organization: { type: "PERSONAL" as const } }
    : {
        organization: {
          type: "PERSONAL" as const,
          members: { some: { role: "OWNER" as const, deactivatedAt: null, user: { email: input.email.trim().toLowerCase() } } },
        },
      };
  const candidates = await deps.db.subscription.findMany({
    where: { ...where, status: { in: LIVE }, withdrawalDeadlineAt: { gte: now }, withdrawalRequests: { none: {} } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  return candidates[0] ?? null;
}

export async function submitWithdrawal(
  deps: BillingDeps,
  args: { input: WithdrawalInput; userId: string | null; organizationId: string | null; channel: "ACCOUNT" | "PUBLIC"; ip: string | null; userAgent: string | null },
): Promise<WithdrawalReceipt> {
  const input = withdrawalInput.parse(args.input);
  const now = nowOf(deps);
  const sub = await matchSubscription(deps, input, args.organizationId, now);

  const request = await deps.db.withdrawalRequest.create({
    data: {
      name: input.name,
      email: input.email.trim().toLowerCase(),
      agreementReference: input.agreementReference,
      submittedAt: now,
      ip: args.ip,
      userAgent: args.userAgent,
      userId: args.userId,
      organizationId: sub?.organizationId ?? args.organizationId,
      subscriptionId: sub?.id ?? null,
    },
  });
  await writeAudit(deps.db, {
    action: "CONTRACT_WITHDRAWAL_REQUESTED",
    actorUserId: args.userId,
    organizationId: request.organizationId,
    targetType: "withdrawal_request",
    targetId: request.id,
    metadata: { channel: args.channel, matched: Boolean(sub), submittedAt: now.toISOString() },
    ip: args.ip,
    userAgent: args.userAgent,
  });

  await sendReceipt(deps, request.id);

  if (!sub) {
    // We confirm receipt anyway; a human matches it (docs/07 § 8.5).
    await escalate(deps, {
      reason: "WITHDRAWAL_UNMATCHED",
      summary: `Fortrydelse uden automatisk match. Id: ${request.id}. Navn: ${input.name}. Email: ${request.email}. Aftale: ${input.agreementReference}. Modtaget: ${now.toISOString()}.`,
      organizationId: request.organizationId,
      userId: args.userId,
      key: `withdrawal:${request.id}`,
    });
  } else if (deps.env.JOBS_INLINE) {
    await processWithdrawal(deps, request.id);
  } else {
    await inngest.send({ name: WITHDRAWAL_PROCESS, id: `withdrawal-${request.id}`, data: { withdrawalId: request.id } });
  }
  return { id: request.id, submittedAt: now, matched: Boolean(sub) };
}

/** Durable-medium receipt with date and time. Idempotent; a failed send is retried by the job. */
async function sendReceipt(deps: BillingDeps, withdrawalId: string): Promise<void> {
  const request = await deps.db.withdrawalRequest.findUniqueOrThrow({ where: { id: withdrawalId } });
  if (request.receiptSentAt) return;
  try {
    const message = await sendServiceEmail(deps.db, {
      template: "withdrawal-receipt",
      to: request.email,
      vars: {
        url: `${deps.env.APP_URL}/fortryd-aftale`,
        date: formatDate(request.submittedAt),
        time: formatTime(request.submittedAt),
        agreement: request.agreementReference,
        name: request.name,
        seller: { name: deps.env.COMPANY_LEGAL_NAME, cvr: deps.env.COMPANY_CVR ?? "", address: deps.env.COMPANY_ADDRESS ?? "" },
      },
      idempotencyKey: `withdrawal:${request.id}:receipt`,
      userId: request.userId,
      organizationId: request.organizationId,
    });
    await deps.db.withdrawalRequest.update({
      where: { id: request.id },
      data: { receiptEmailMessageId: message.id, receiptSentAt: new Date(), status: request.status === "RECEIVED" ? "RECEIPT_SENT" : request.status },
    });
  } catch (err) {
    logger.error("billing.withdrawal_receipt_failed", { withdrawalId, err });
  }
}

const invoiceSchema = z.object({
  amount_paid: z.number().int(),
  payments: z
    .object({ data: z.array(z.object({ payment: z.object({ payment_intent: z.union([z.string(), z.object({ id: z.string() })]).nullish() }) })) })
    .nullish(),
});

/** Job `billing/withdrawal.process` (idempotent on withdrawal id): cancel now + full refund (docs/07 § 8.6). */
export async function processWithdrawal(deps: BillingDeps, withdrawalId: string): Promise<"PROCESSED" | "SKIPPED"> {
  const request = await deps.db.withdrawalRequest.findUniqueOrThrow({ where: { id: withdrawalId }, include: { subscription: true } });
  if (request.status === "PROCESSED" || !request.subscription) return "SKIPPED";
  await sendReceipt(deps, request.id);
  const sub = request.subscription;

  // Abuse guard: at most one full refund per person (email); further ones go to a human.
  const earlierRefunds = await deps.db.withdrawalRequest.count({ where: { email: request.email, status: "PROCESSED", refundAmountOre: { gt: 0 }, id: { not: request.id } } });

  const remote = stripeSubscriptionSchema.parse(await deps.stripe.subscriptions.retrieve(sub.stripeSubscriptionId));
  if (remote.status !== "canceled") {
    await deps.stripe.subscriptions.cancel(sub.stripeSubscriptionId, { prorate: false, invoice_now: false }, { idempotencyKey: `withdrawal:${request.id}:cancel` });
  }

  let refundAmountOre = 0;
  let stripeRefundId: string | null = null;
  if (earlierRefunds > 0) {
    await escalate(deps, {
      reason: "REFUND_OR_BILLING_DISPUTE",
      summary: `Gentagen fortrydelse (${earlierRefunds + 1}. gang) fra ${request.email}. Abonnementet er stoppet; refusion afventer manuel vurdering. Id: ${request.id}.`,
      organizationId: request.organizationId,
      priority: "HIGH",
      key: `withdrawal:${request.id}:repeat`,
    });
  } else if (remote.latest_invoice) {
    const invoice = invoiceSchema.parse(await deps.stripe.invoices.retrieve(remote.latest_invoice, { expand: ["payments"] }));
    const pi = invoice.payments?.data[0]?.payment.payment_intent;
    const paymentIntent = typeof pi === "string" ? pi : pi?.id;
    if (invoice.amount_paid > 0 && paymentIntent) {
      const refund = await deps.stripe.refunds.create(
        { payment_intent: paymentIntent, amount: invoice.amount_paid, reason: "requested_by_customer", metadata: { withdrawalId: request.id } },
        { idempotencyKey: `withdrawal:${request.id}:refund` },
      );
      refundAmountOre = refund.amount;
      stripeRefundId = refund.id;
    }
  }

  await deps.db.withdrawalRequest.update({ where: { id: request.id }, data: { status: "PROCESSED", processedAt: new Date(), refundAmountOre, stripeRefundId } });
  await writeAudit(deps.db, {
    action: "CONTRACT_WITHDRAWAL_PROCESSED",
    organizationId: request.organizationId,
    targetType: "withdrawal_request",
    targetId: request.id,
    metadata: { refundAmountOre, stripeRefundId, planKey: isPaidPlanKey(sub.planKey) ? sub.planKey : null },
  });
  if (stripeRefundId) {
    await sendServiceEmail(deps.db, {
      template: "withdrawal-completed",
      to: request.email,
      vars: { url: `${deps.env.APP_URL}/konto/abonnement`, amount: formatDkk(refundAmountOre) },
      idempotencyKey: `withdrawal:${request.id}:completed`,
      userId: request.userId,
      organizationId: request.organizationId,
    });
  }
  return "PROCESSED";
}

/** Text for the logged-in agreement dropdown: "Mindforward Personlig (månedlig), købt 13. oktober 2026". */
export function agreementLabel(planKey: string, purchasedAt: Date): string {
  const t = getMessages().billing;
  const plan = isPaidPlanKey(planKey) ? t.planNames[planKey] : planKey;
  return t.withdrawal.agreementOption.replace("{plan}", plan).replace("{date}", formatDate(purchasedAt));
}
