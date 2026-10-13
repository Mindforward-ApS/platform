import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { inngest } from "./client";
import { cronFailureHandler, cronTrigger, reportCronOk, type CronMonitor } from "./monitor";

// retention.purge-misc (docs/02 § 5, docs/10 § 1.4 — 10 wins over 03 per docs/00 § 10a). Idempotent: every
// rule selects only rows that are still over their limit, so re-runs are no-ops.
//  SourceSnapshot.raw          > 90 days  → raw nulled (parsed entries kept while a module cites them)
//  WebhookEvent.payload        > 30 days  → payload nulled (row kept for idempotency)
//  AiCall                      > 13 months → deleted (cost aggregates live in AiUsageDaily/BudgetMonth)
//  Verification / Session      expired    → deleted
//  SandboxSession CLOSED/RESET > 30 days  → deleted (events cascade)
//  SupportConversation         12 months after the last message → deleted (messages cascade; Escalation keeps its row)
//  PlacementResult anonymous + unclaimed > 90 days → deleted

const DAY = 24 * 60 * 60 * 1000;

export const RETENTION = {
  sourceSnapshotRawDays: 90,
  webhookPayloadDays: 30,
  aiCallMonths: 13,
  closedSandboxDays: 30,
  supportConversationMonths: 12,
  anonymousPlacementDays: 90,
} as const;

function monthsBefore(now: Date, months: number): Date {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

export async function purgeMisc(client: PrismaClient, now: Date = new Date()) {
  const days = (n: number) => new Date(now.getTime() - n * DAY);
  const [sourceSnapshots, webhookPayloads, aiCalls, verifications, sessions, sandboxSessions, supportConversations, placementResults] = await Promise.all([
    client.sourceSnapshot.updateMany({ where: { fetchedAt: { lt: days(RETENTION.sourceSnapshotRawDays) }, raw: { not: null } }, data: { raw: null, rawPurgedAt: now } }),
    client.webhookEvent.updateMany({ where: { receivedAt: { lt: days(RETENTION.webhookPayloadDays) }, payload: { not: Prisma.DbNull } }, data: { payload: Prisma.DbNull } }),
    client.aiCall.deleteMany({ where: { createdAt: { lt: monthsBefore(now, RETENTION.aiCallMonths) } } }),
    client.verification.deleteMany({ where: { expiresAt: { lt: now } } }),
    client.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    client.sandboxSession.deleteMany({ where: { status: { in: ["CLOSED", "RESET"] }, updatedAt: { lt: days(RETENTION.closedSandboxDays) } } }),
    client.supportConversation.deleteMany({ where: { lastMessageAt: { lt: monthsBefore(now, RETENTION.supportConversationMonths) } } }),
    client.placementResult.deleteMany({ where: { userId: null, claimedAt: null, createdAt: { lt: days(RETENTION.anonymousPlacementDays) } } }),
  ]);
  return {
    sourceSnapshots: sourceSnapshots.count,
    webhookPayloads: webhookPayloads.count,
    aiCalls: aiCalls.count,
    verifications: verifications.count,
    sessions: sessions.count,
    sandboxSessions: sandboxSessions.count,
    supportConversations: supportConversations.count,
    placementResults: placementResults.count,
  };
}

export const RETENTION_PURGE_MISC_MONITOR: CronMonitor = { slug: "retention-purge-misc", schedule: "45 3 * * *", maxRuntimeMinutes: 20 };

export const retentionPurgeMiscJob = inngest.createFunction(
  { id: "retention.purge-misc", retries: 5, triggers: { cron: cronTrigger(RETENTION_PURGE_MISC_MONITOR) }, onFailure: cronFailureHandler(RETENTION_PURGE_MISC_MONITOR) },
  async ({ step }) => {
    const result = await step.run("purge-misc", () => purgeMisc(db()));
    logger.info("retention.purge_misc", result);
    await reportCronOk(step, RETENTION_PURGE_MISC_MONITOR);
    return result;
  },
);
