import "server-only";
import type { EscalationPriority, EscalationReason, PrismaClient } from "@/generated/prisma/client";
import { getMessages } from "@/lib/i18n";
import type { ServerEnv } from "@/lib/env.schema";
import { writeAudit } from "@/server/audit/log";
import { sendServiceEmail } from "@/server/email/send";
import { logger } from "@/server/observability/logger";
import { captureServerEvent } from "@/server/observability/posthog";
import { maskSupportPii } from "./pii-mask";

// Escalation to a human (docs/08 § 4): Escalation row (OPEN) → mail to SUPPORT_INBOX with summary + admin link,
// SERVICE receipt to the user with case id + expected response. The row is the record: mail failures never undo it.
// The support agent NEVER refunds, changes prices, gives discounts, promises anything legal or discloses others'
// data — those requests end here.

export const ESCALATION_REASONS = [
  "REFUND_OR_BILLING_DISPUTE",
  "WITHDRAWAL_HELP",
  "LEGAL_OR_PRIVACY",
  "DATA_REQUEST",
  "BUG",
  "ACCOUNT_ACCESS",
  "PRICING_OR_DISCOUNT",
  "B2B_SALES",
  "ANGRY_OR_COMPLAINT",
  "SECURITY",
  "OTHER",
] as const satisfies readonly EscalationReason[];

/** First human answer SLA in working days (docs/08 § 4); SECURITY = 4 working hours. */
export function expectedResponse(reason: EscalationReason, priority: EscalationPriority): string {
  const sla = getMessages().support.sla;
  if (reason === "SECURITY") return sla.SECURITY;
  return sla[priority];
}

/** SLA deadline used by the digest to sort/flag overdue escalations (working days, Mon–Fri). */
export function slaDeadline(createdAt: Date, reason: EscalationReason, priority: EscalationPriority): Date {
  if (reason === "SECURITY") return addWorkingHours(createdAt, 4);
  return addWorkingDays(createdAt, priority === "HIGH" ? 1 : priority === "NORMAL" ? 2 : 3);
}

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) left--;
  }
  return d;
}

function addWorkingHours(from: Date, hours: number): Date {
  const d = new Date(from);
  let left = hours;
  while (left > 0) {
    d.setUTCHours(d.getUTCHours() + 1);
    if (!isWeekend(d)) left--;
  }
  return d;
}

export interface EscalationDeps {
  db: PrismaClient;
  env: Pick<ServerEnv, "SUPPORT_INBOX" | "APP_URL">;
  sendMail?: typeof sendServiceEmail;
  now?: () => Date;
}

export interface EscalationInput {
  userId: string;
  organizationId: string;
  userEmail: string;
  conversationId: string | null;
  reason: EscalationReason;
  priority: EscalationPriority;
  summary: string;
}

export interface EscalationResult {
  escalationId: string;
  expectedResponse: string;
  created: boolean;
}

export async function createEscalation(deps: EscalationDeps, input: EscalationInput): Promise<EscalationResult> {
  const { db } = deps;
  const send = deps.sendMail ?? sendServiceEmail;
  // Summaries are written by the model or by code; mask numbers anyway and cap the length.
  const summary = maskSupportPii(input.summary).text.slice(0, 800);

  // One open case per conversation + reason: repeated messages do not flood the inbox.
  if (input.conversationId) {
    const existing = await db.escalation.findFirst({
      where: { conversationId: input.conversationId, reason: input.reason, status: { not: "RESOLVED" }, userId: input.userId, organizationId: input.organizationId },
      select: { id: true, priority: true },
    });
    if (existing) return { escalationId: existing.id, expectedResponse: expectedResponse(input.reason, existing.priority), created: false };
  }

  const row = await db.escalation.create({
    data: {
      conversationId: input.conversationId,
      userId: input.userId,
      organizationId: input.organizationId,
      reason: input.reason,
      priority: input.priority,
      summary,
      status: "OPEN",
      ...(deps.now ? { createdAt: deps.now() } : {}),
    },
  });
  if (input.conversationId) {
    await db.supportConversation.updateMany({ where: { id: input.conversationId, userId: input.userId }, data: { status: "ESCALATED" } });
  }
  await writeAudit(db, {
    action: "SUPPORT_ESCALATED",
    actorType: "SUPPORT_AGENT",
    actorUserId: input.userId,
    organizationId: input.organizationId,
    targetType: "escalation",
    targetId: row.id,
    metadata: { reason: input.reason, priority: input.priority },
  });
  const expected = expectedResponse(input.reason, input.priority);
  void captureServerEvent({ distinctId: input.userId, event: "support_escalated", properties: { reason: input.reason, priority: input.priority } });

  const inbox = deps.env.SUPPORT_INBOX;
  try {
    if (inbox) {
      await send(db, {
        template: "support-escalation",
        to: inbox,
        vars: { url: `${deps.env.APP_URL}/admin/support/${row.id}`, reason: `${input.reason} (${input.priority})`, summary },
        idempotencyKey: `support-escalation:${row.id}`,
        organizationId: input.organizationId,
      });
    } else {
      logger.warn("support.escalation_no_inbox", { escalationId: row.id, reason: input.reason });
    }
    await send(db, {
      template: "support-escalation-receipt",
      to: input.userEmail,
      vars: { url: `${deps.env.APP_URL}/konto/support`, escalationId: row.id, expected },
      idempotencyKey: `support-escalation-receipt:${row.id}`,
      userId: input.userId,
      organizationId: input.organizationId,
    });
  } catch (err) {
    logger.error("support.escalation_mail_failed", { escalationId: row.id, err });
  }
  return { escalationId: row.id, expectedResponse: expected, created: true };
}
