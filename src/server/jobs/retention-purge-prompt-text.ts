import type { PrismaClient } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { inngest } from "./client";

// retention.purge-prompt-text (docs/02 § 5, docs/03 § 5): learners' free text is deleted after 30 days.
// Scores, rubric scores and flags stay. Idempotent: rows already purged are skipped, so re-runs are no-ops.

export const PROMPT_TEXT_RETENTION_DAYS = 30;

export async function purgePromptText(client: PrismaClient, now: Date = new Date(), days = PROMPT_TEXT_RETENTION_DAYS) {
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const stepResults = await client.stepResult.updateMany({
    where: { createdAt: { lt: cutoff }, OR: [{ promptText: { not: null } }, { aiFeedback: { not: null } }] },
    data: { promptText: null, aiFeedback: null, promptTextPurgedAt: now },
  });
  const sandboxEvents = await client.sandboxEvent.updateMany({
    where: { createdAt: { lt: cutoff }, contentText: { not: null } },
    data: { contentText: null, contentPurgedAt: now },
  });
  return { stepResults: stepResults.count, sandboxEvents: sandboxEvents.count, cutoff: cutoff.toISOString() };
}

export const retentionPurgePromptTextJob = inngest.createFunction(
  // Cron in Europe/Copenhagen, outside 02:00–03:00 (DST). Each cron tick runs once; the purge itself is idempotent.
  { id: "retention.purge-prompt-text", retries: 5, triggers: { cron: "TZ=Europe/Copenhagen 30 3 * * *" } },
  async ({ step }) => {
    const result = await step.run("purge-prompt-text", () => purgePromptText(db()));
    logger.info("retention.purge_prompt_text", result);
    return result;
  },
);
