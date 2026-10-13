import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { format, getMessages } from "@/lib/i18n";
import type { ServerEnv } from "@/lib/env.schema";
import { globalBudgetState } from "@/server/ai/budget";
import { copenhagenMidnight, formatDate } from "@/server/billing/time";
import { formatDkk } from "@/server/billing/vat";
import { sendServiceEmail } from "@/server/email/send";
import type { OwnerDigestVars } from "@/server/email/templates/support";
import { logger } from "@/server/observability/logger";
import { slaDeadline } from "./escalation";

// Daily owner digest (docs/08 § 7): one SERVICE mail to OWNER_DIGEST_EMAIL at 07:00 Europe/Copenhagen covering
// "yesterday" (Copenhagen calendar day). "Kræver handling" first (open escalations by SLA, overdue flagged);
// empty sections are omitted. Counts and short summaries only — no prompt text, no customer e-mails.

const MAX_LINES = 10;

function copenhagenDay(now: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** [start, end) of yesterday in Copenhagen, plus its ISO date key. */
export function yesterdayWindow(now: Date): { start: Date; end: Date; key: string } {
  const { y, m, d } = copenhagenDay(now);
  const end = copenhagenMidnight(y, m, d);
  const prev = new Date(Date.UTC(y, m - 1, d - 1));
  const start = copenhagenMidnight(prev.getUTCFullYear(), prev.getUTCMonth() + 1, prev.getUTCDate());
  const key = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}-${String(prev.getUTCDate()).padStart(2, "0")}`;
  return { start, end, key };
}

function age(from: Date, now: Date): string {
  const hours = Math.max(0, Math.round((now.getTime() - from.getTime()) / 3_600_000));
  return hours < 48 ? `${hours} t` : `${Math.round(hours / 24)} d`;
}

export interface DigestDeps {
  db: PrismaClient;
  env: Pick<ServerEnv, "AI_GLOBAL_MONTHLY_BUDGET_DKK" | "AI_BUDGET_ALERT_PCT" | "OWNER_DIGEST_EMAIL" | "APP_URL">;
  now?: () => Date;
  sendMail?: typeof sendServiceEmail;
}

export async function buildOwnerDigest(deps: DigestDeps): Promise<{ vars: OwnerDigestVars; key: string; escalationIds: string[] }> {
  const { db, env } = deps;
  const now = deps.now ? deps.now() : new Date();
  const t = getMessages().support;
  const m = t.email.digest;
  const { start, end, key } = yesterdayWindow(now);
  const inWindow = { gte: start, lt: end };

  // 1. Kræver handling
  const open = await db.escalation.findMany({
    where: { status: { not: "RESOLVED" } },
    select: { id: true, reason: true, priority: true, summary: true, createdAt: true },
    take: 200,
  });
  const sorted = open
    .map((e) => ({ ...e, deadline: slaDeadline(e.createdAt, e.reason, e.priority) }))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  const action = sorted.length
    ? {
        openCount: sorted.length,
        lines: sorted.slice(0, MAX_LINES).map((e) => ({
          overdue: e.deadline.getTime() < now.getTime(),
          text: format(m.escalationLine, { priority: e.priority, reason: t.reasons[e.reason], age: age(e.createdAt, now), summary: e.summary.slice(0, 140) }),
        })),
      }
    : null;

  // 2. Support i går
  const [conversations, escalatedConversations, escalationsByReason, guardHits] = await Promise.all([
    db.supportConversation.count({ where: { createdAt: inWindow } }),
    db.supportConversation.count({ where: { createdAt: inWindow, escalations: { some: {} } } }),
    db.escalation.groupBy({ by: ["reason"], where: { createdAt: inWindow }, _count: { _all: true } }),
    db.supportMessage.count({ where: { createdAt: inWindow, role: "TOOL", toolName: "guard" } }),
  ]);
  const escalations = escalationsByReason.reduce((s, r) => s + r._count._all, 0);
  const support =
    conversations > 0 || escalations > 0
      ? {
          line: format(m.supportLine, {
            conversations,
            resolvedPct: conversations > 0 ? Math.round(((conversations - escalatedConversations) / conversations) * 100) : 0,
            escalations,
          }),
          byReason: escalationsByReason.length ? escalationsByReason.map((r) => `${t.reasons[r.reason]}: ${r._count._all}`).join(", ") : null,
          guardHits,
        }
      : null;

  // 3. Betaling i går
  const [newSubs, cancellations, withdrawals, failed] = await Promise.all([
    db.subscription.count({ where: { createdAt: inWindow } }),
    db.subscription.count({ where: { OR: [{ cancellationRequestedInAppAt: inWindow }, { canceledAt: inWindow }] } }),
    db.withdrawalRequest.count({ where: { submittedAt: inWindow } }),
    db.webhookEvent.count({ where: { provider: "STRIPE", type: "invoice.payment_failed", receivedAt: inWindow } }),
  ]);
  const billing = newSubs + cancellations + withdrawals + failed > 0 ? format(m.billingLine, { newSubs, cancellations, withdrawals, failed }) : null;

  // 4. Indholdsmotor (M9 writes PipelineRun; empty until it runs)
  const [runs, failedRuns, published] = await Promise.all([
    db.pipelineRun.count({ where: { startedAt: inWindow } }),
    db.pipelineRun.count({ where: { startedAt: inWindow, status: "FAILED" } }),
    db.moduleVersion.count({ where: { publishedAt: inWindow } }),
  ]);
  const pipeline = runs > 0 ? format(m.pipelineLine, { runs, failed: failedRuns, published }) : null;

  // Fejl
  const [aiErrors, emailFailed, webhookFailed] = await Promise.all([
    db.aiCall.count({ where: { createdAt: inWindow, status: { in: ["ERROR", "TIMEOUT"] } } }),
    db.emailMessage.count({ where: { createdAt: inWindow, status: "FAILED" } }),
    db.webhookEvent.count({ where: { receivedAt: inWindow, status: "FAILED" } }),
  ]);
  const errors = aiErrors + emailFailed + webhookFailed > 0 ? format(m.errorsLine, { aiErrors, emailFailed, webhookFailed }) : null;

  // 5. AI-forbrug (always shown)
  const spentYesterday = await db.aiCall.aggregate({ where: { createdAt: inWindow }, _sum: { costDkk: true } });
  const budget = await globalBudgetState(db, env.AI_GLOBAL_MONTHLY_BUDGET_DKK, now, env.AI_BUDGET_ALERT_PCT);
  const kr = (dkk: number) => formatDkk(Math.round(dkk * 100));
  const ai = {
    line: format(m.aiLine, { yesterday: kr(Number(spentYesterday._sum.costDkk ?? 0)), month: kr(budget.spentDkk), limit: kr(budget.limitDkk), pct: Math.floor(budget.pct * 100) }),
    alert: budget.pct >= env.AI_BUDGET_ALERT_PCT,
  };

  // 6. Kill switches ændret
  const flags = await db.featureFlag.findMany({ where: { updatedAt: inWindow }, select: { key: true, enabled: true }, orderBy: { key: "asc" } });
  const killSwitches = flags.map((f) => format(m.killSwitchLine, { key: f.key, state: f.enabled ? m.on : m.off }));

  return {
    key,
    escalationIds: sorted.map((e) => e.id),
    vars: { url: `${env.APP_URL}/admin`, date: formatDate(start), action, support, billing, pipeline, errors, ai, killSwitches },
  };
}

/** Builds and sends the digest once per day (EmailMessage idempotency key owner-digest:{date}). */
export async function sendOwnerDigest(deps: DigestDeps): Promise<{ sent: boolean; key: string }> {
  const { vars, key, escalationIds } = await buildOwnerDigest(deps);
  const to = deps.env.OWNER_DIGEST_EMAIL;
  if (!to) {
    logger.warn("digest.no_recipient", { key });
    return { sent: false, key };
  }
  await (deps.sendMail ?? sendServiceEmail)(deps.db, { template: "owner-digest", to, vars, idempotencyKey: `owner-digest:${key}` });
  if (escalationIds.length) await deps.db.escalation.updateMany({ where: { id: { in: escalationIds }, digestIncludedAt: null }, data: { digestIncludedAt: deps.now ? deps.now() : new Date() } });
  return { sent: true, key };
}
