import "server-only";
import type { EscalationPriority, EscalationReason } from "@/generated/prisma/client";
import { sendServiceEmail } from "@/server/email/send";
import { logger } from "@/server/observability/logger";
import type { BillingDeps } from "./deps";

// M6 escalations (docs/00-beslutninger.md § 10a): an Escalation row for the later inbox (M10) + a plain
// SERVICE mail to SUPPORT_INBOX now.
export async function escalate(
  deps: BillingDeps,
  args: { reason: EscalationReason; summary: string; organizationId?: string | null; userId?: string | null; priority?: EscalationPriority; key: string },
): Promise<void> {
  const row = await deps.db.escalation.create({
    data: { reason: args.reason, summary: args.summary, organizationId: args.organizationId ?? null, userId: args.userId ?? null, priority: args.priority ?? "NORMAL" },
  });
  const inbox = deps.env.SUPPORT_INBOX;
  if (!inbox) {
    logger.warn("billing.escalation_no_inbox", { reason: args.reason, escalationId: row.id });
    return;
  }
  try {
    await sendServiceEmail(deps.db, {
      template: "support-escalation",
      to: inbox,
      vars: { url: `${deps.env.APP_URL}/admin`, reason: args.reason, summary: args.summary },
      idempotencyKey: `escalation:${args.key}`,
      organizationId: args.organizationId ?? null,
    });
  } catch (err) {
    // The Escalation row is the record; a failed mail must not undo the customer's request.
    logger.error("billing.escalation_mail_failed", { reason: args.reason, escalationId: row.id, err });
  }
}
