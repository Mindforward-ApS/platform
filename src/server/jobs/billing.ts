import "server-only";
import { z } from "zod";
import { billingDeps } from "@/server/billing/deps";
import { processStripeEvent, STRIPE_EVENT_RECEIVED } from "@/server/billing/webhook";
import { processWithdrawal, WITHDRAWAL_PROCESS } from "@/server/billing/withdrawal";
import { inngest } from "./client";

// Billing jobs (docs/07-betaling.md § 8.6, § 10). Both bodies are idempotent; Inngest retries with backoff.

export const stripeEventJob = inngest.createFunction(
  { id: "billing.stripe-event", retries: 5, triggers: { event: STRIPE_EVENT_RECEIVED } },
  async ({ event, step }) => {
    const { webhookEventId } = z.object({ webhookEventId: z.string() }).parse(event.data);
    return step.run("process", () => processStripeEvent(billingDeps(), webhookEventId));
  },
);

export const withdrawalJob = inngest.createFunction(
  { id: "billing.withdrawal-process", retries: 5, triggers: { event: WITHDRAWAL_PROCESS } },
  async ({ event, step }) => {
    const { withdrawalId } = z.object({ withdrawalId: z.string() }).parse(event.data);
    return step.run("process", () => processWithdrawal(billingDeps(), withdrawalId));
  },
);
