import "server-only";
import { Webhook, WebhookVerificationError } from "svix";
import { z } from "zod";
import { Prisma, type PrismaClient, type SuppressionReason } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { logger } from "@/server/observability/logger";
import { emailHash, normalizeEmail, withdrawMarketingConsent } from "./consent";

// Resend → us (docs/09 § 2, § 8; docs/02 webhooks). Resend signs with Svix: headers svix-id, svix-timestamp,
// svix-signature; the svix package verifies the HMAC over the RAW body (and the 5-minute timestamp window)
// BEFORE anything is parsed. Idempotent via WebhookEvent (provider RESEND, externalId = svix-id; Resend keeps
// the svix-id across retries).
//   email.delivered  → EmailMessage DELIVERED
//   email.bounced    → hard (Permanent) bounce: EmailMessage BOUNCED + EmailSuppression HARD_BOUNCE (also SERVICE)
//   email.complained → EmailMessage COMPLAINED + EmailSuppression COMPLAINT + ConsentRecord WITHDRAWN

const eventSchema = z.object({
  type: z.string().min(1).max(100),
  created_at: z.string().optional(),
  data: z
    .object({
      email_id: z.string().optional(),
      to: z.union([z.array(z.string()), z.string()]).optional(),
      bounce: z.object({ type: z.string().optional(), subType: z.string().optional() }).partial().optional(),
    })
    .passthrough(),
});

export interface ResendWebhookDeps {
  db: PrismaClient;
  secret?: string;
  pepper?: string;
  now?: Date;
}

export interface WebhookResponse {
  status: number;
  body: { ok: boolean; duplicate?: boolean; error?: string };
}

type Headers = { get(name: string): string | null };

export async function handleResendWebhook(deps: ResendWebhookDeps, raw: string, headers: Headers): Promise<WebhookResponse> {
  const secret = deps.secret ?? serverEnv().RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("resend.webhook_not_configured", { variable: "RESEND_WEBHOOK_SECRET" });
    return { status: 503, body: { ok: false, error: "not configured" } };
  }
  const svixId = headers.get("svix-id") ?? "";
  try {
    new Webhook(secret).verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": headers.get("svix-timestamp") ?? "",
      "svix-signature": headers.get("svix-signature") ?? "",
    });
  } catch (err) {
    if (!(err instanceof WebhookVerificationError)) logger.warn("resend.webhook_verify_error", { err });
    return { status: 400, body: { ok: false, error: "invalid signature" } };
  }

  // Only now is the body parsed.
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { status: 400, body: { ok: false, error: "invalid json" } };
  }
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return { status: 400, body: { ok: false, error: "invalid event" } };
  const event = parsed.data;

  let row;
  try {
    row = await deps.db.webhookEvent.create({ data: { provider: "RESEND", externalId: svixId, type: event.type, payload: payload as Prisma.InputJsonValue } });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const existing = await deps.db.webhookEvent.findUniqueOrThrow({ where: { provider_externalId: { provider: "RESEND", externalId: svixId } } });
    if (existing.status === "PROCESSED" || existing.status === "IGNORED") return { status: 200, body: { ok: true, duplicate: true } };
    row = existing; // RECEIVED/FAILED earlier → process again
  }

  try {
    const handled = await applyResendEvent(deps, event);
    await deps.db.webhookEvent.update({ where: { id: row.id }, data: { status: handled ? "PROCESSED" : "IGNORED", processedAt: deps.now ?? new Date(), error: null } });
    return { status: 200, body: { ok: true } };
  } catch (err) {
    logger.error("resend.webhook_failed", { type: event.type, err });
    await deps.db.webhookEvent.update({ where: { id: row.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" } });
    return { status: 500, body: { ok: false, error: "processing failed" } };
  }
}

type ResendEvent = z.infer<typeof eventSchema>;

async function applyResendEvent(deps: ResendWebhookDeps, event: ResendEvent): Promise<boolean> {
  const { db } = deps;
  const now = deps.now ?? new Date();
  const message = event.data.email_id ? await db.emailMessage.findUnique({ where: { resendId: event.data.email_id } }) : null;
  const toRaw = Array.isArray(event.data.to) ? event.data.to[0] : event.data.to;
  const email = message?.toEmail ?? (toRaw ? normalizeEmail(toRaw.replace(/^.*<([^>]+)>.*$/, "$1")) : null);

  const suppress = async (reason: SuppressionReason, appliesToService: boolean) => {
    if (!email) return;
    const pepper = deps.pepper ?? serverEnv().EMAIL_HASH_PEPPER;
    if (!pepper) throw new Error("EMAIL_HASH_PEPPER missing — cannot record suppression");
    const hash = emailHash(email, pepper);
    await db.emailSuppression.upsert({
      where: { emailHash: hash },
      create: { emailHash: hash, reason, appliesToService },
      update: appliesToService ? { reason, appliesToService: true } : { reason },
    });
  };

  switch (event.type) {
    case "email.delivered":
      if (message && !["BOUNCED", "COMPLAINED"].includes(message.status)) {
        await db.emailMessage.update({ where: { id: message.id }, data: { status: "DELIVERED", deliveredAt: now, lastEventAt: now } });
      }
      return true;
    case "email.bounced": {
      // Resend: bounce.type "Permanent" = hard, "Temporary"/"Transient" = soft. Missing → treat as hard (fail safe).
      const kind = event.data.bounce?.type?.toLowerCase();
      const hard = !kind || kind === "permanent";
      if (message) await db.emailMessage.update({ where: { id: message.id }, data: { lastEventAt: now, ...(hard ? { status: "BOUNCED" } : {}) } });
      if (hard) await suppress("HARD_BOUNCE", true);
      return true;
    }
    case "email.complained":
      if (message) await db.emailMessage.update({ where: { id: message.id }, data: { status: "COMPLAINED", lastEventAt: now } });
      await suppress("COMPLAINT", false);
      if (email) await withdrawMarketingConsent(db, { email, source: "EMAIL_COMPLAINT", ip: null, userAgent: null }, { now, pepper: deps.pepper });
      return true;
    default:
      if (message) await db.emailMessage.update({ where: { id: message.id }, data: { lastEventAt: now } });
      return false;
  }
}
