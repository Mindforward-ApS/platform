import "server-only";
import { z } from "zod";
import { db } from "@/server/db";
import { NURTURE_EVENT, nurtureSchedule, nurtureStops, sendNurtureStep } from "@/server/email/nurture";
import { logger } from "@/server/observability/logger";
import { inngest } from "./client";

// Lead nurture flow (docs/09 § 5). Started when a marketing consent is CONFIRMED (double opt-in click).
// Each step sleeps until its time, then re-checks everything at send time (sendNurtureStep → sendMarketingEmail).
// Quiet hours / frequency caps defer the step; withdrawn consent, suppression, kill switch or becoming a
// customer stops the flow. One run per address (idempotency on the email).

export const marketingNurtureJob = inngest.createFunction(
  { id: "marketing.nurture", retries: 3, idempotency: "event.data.email", triggers: { event: NURTURE_EVENT } },
  async ({ event, step }) => {
    const { email, confirmedAt } = z.object({ email: z.email(), confirmedAt: z.coerce.date() }).parse(event.data);
    for (const s of nurtureSchedule) {
      await step.sleepUntil(`wait-${s.template}`, new Date(confirmedAt.getTime() + s.afterMs));
      for (let attempt = 0; attempt < 5; attempt++) {
        const outcome: { sent: boolean; reason?: string; retryAt?: string } = await step.run(`send-${s.template}-${attempt}`, async () => {
          const r = await sendNurtureStep(db(), { email, template: s.template });
          return r.sent ? { sent: true } : { sent: false, reason: r.reason, retryAt: "retryAt" in r && r.retryAt ? r.retryAt.toISOString() : undefined };
        });
        if (outcome.sent) break;
        if (nurtureStops(outcome)) {
          logger.info("marketing.nurture_stopped", { step: s.template, reason: outcome.reason });
          return { stoppedAt: s.template, reason: outcome.reason };
        }
        // Deferred (quiet hours or frequency cap): try again at the next window / tomorrow.
        const retryAt = outcome.retryAt ? new Date(outcome.retryAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        await step.sleepUntil(`defer-${s.template}-${attempt}`, retryAt);
      }
    }
    return { completed: true };
  },
);
