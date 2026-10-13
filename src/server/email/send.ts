import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type EmailMessage, type PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { logger } from "@/server/observability/logger";
import { isAllowedRecipient } from "./allowlist";
import { canSendMarketing } from "./consent";
import { renderTemplate, TEMPLATES, type TemplateKey, type TemplateVars } from "./templates";
import { fileTransport, logTransport, resendTransport, type EmailTransport } from "./transports";

export type { EmailTransport } from "./transports";

// The single way out for email (docs/02-arkitektur.md § 1). SERVICE mail via sendServiceEmail; MARKETING only
// via sendMarketingEmail below, which enforces the consent gate (M5) — actual marketing delivery arrives in M8.

export interface SendArgs<K extends TemplateKey> {
  template: K;
  to: string;
  vars: TemplateVars<K>;
  idempotencyKey: string;
  userId?: string | null;
  organizationId?: string | null;
  /** Optional files (M7: company report CSV/PDF). Content is base64. */
  attachments?: { filename: string; contentBase64: string }[];
}

export interface SendOptions {
  transport?: EmailTransport;
  allowlist?: string;
  enforceAllowlist?: boolean;
}

function defaultTransport(): EmailTransport {
  const env = serverEnv();
  const kind = env.EMAIL_TRANSPORT ?? (env.RESEND_API_KEY ? "resend" : "log");
  if (kind === "resend" && env.RESEND_API_KEY) return resendTransport(env.RESEND_API_KEY);
  if (kind === "file") return fileTransport(env.EMAIL_OUTBOX_DIR ?? ".e2e-outbox");
  return logTransport();
}

const DONE: EmailMessage["status"][] = ["SENT", "DELIVERED", "SUPPRESSED"];

export async function sendServiceEmail<K extends TemplateKey>(db: PrismaClient, args: SendArgs<K>, opts: SendOptions = {}): Promise<EmailMessage> {
  const def = TEMPLATES[args.template];
  if (def.category !== "SERVICE") throw new Error(`Template ${args.template} is not a SERVICE template`);

  const env = serverEnv();
  const to = args.to.trim().toLowerCase();
  const rendered = await renderTemplate(args.template, args.vars);

  let message: EmailMessage;
  try {
    message = await db.emailMessage.create({
      data: {
        id: randomUUID(),
        category: "SERVICE",
        template: args.template,
        templateVersion: rendered.version,
        toEmail: to,
        userId: args.userId ?? null,
        organizationId: args.organizationId ?? null,
        idempotencyKey: args.idempotencyKey,
        subject: rendered.subject,
      },
    });
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    message = await db.emailMessage.findUniqueOrThrow({ where: { idempotencyKey: args.idempotencyKey } });
    if (DONE.includes(message.status)) return message;
  }

  const enforceAllowlist = opts.enforceAllowlist ?? env.VERCEL_ENV !== "production";
  if (enforceAllowlist && !isAllowedRecipient(to, opts.allowlist ?? env.EMAIL_ALLOWLIST)) {
    logger.warn("email.suppressed_not_allowlisted", { template: args.template, toDomain: to.split("@")[1] });
    return db.emailMessage.update({ where: { id: message.id }, data: { status: "SUPPRESSED", error: "not on EMAIL_ALLOWLIST" } });
  }

  const transport = opts.transport ?? defaultTransport();
  try {
    const { providerId } = await transport.send({
      from: env.EMAIL_FROM_SERVICE,
      to,
      replyTo: env.EMAIL_REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template: args.template,
      idempotencyKey: args.idempotencyKey,
      ...(args.attachments ? { attachments: args.attachments } : {}),
    });
    return db.emailMessage.update({ where: { id: message.id }, data: { status: "SENT", sentAt: new Date(), resendId: providerId, error: null } });
  } catch (err) {
    logger.error("email.send_failed", { template: args.template, transport: transport.name, err });
    await db.emailMessage.update({ where: { id: message.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" } });
    throw err;
  }
}

// ─── MARKETING (M5: consent gate only — no marketing mail is sent before M8) ───

export type MarketingRefusal = "KILL_SWITCH" | "NO_CONSENT" | "NOT_CONFIRMED" | "WITHDRAWN" | "SUPPRESSED" | "CONSENT_MISMATCH";

export interface MarketingSendArgs<K extends TemplateKey> extends SendArgs<K> {
  /** REQUIRED (docs/03 § 8): the CONFIRMED ConsentRecord this mail relies on; must be the address's latest record. */
  consentRecordId: string;
}

/**
 * The only way a MARKETING mail may leave (docs/09 § 2.1). Checked at send time, never at scheduling time:
 * kill switch → latest ConsentRecord must be CONFIRMED (double opt-in) → no EmailSuppression → the caller's
 * consentRecordId must be that record. Refusals are returned, never thrown, so flows can skip and move on.
 */
export async function sendMarketingEmail<K extends TemplateKey>(
  db: PrismaClient,
  args: MarketingSendArgs<K>,
  opts: SendOptions & { marketingEnabled?: boolean; pepper?: string } = {},
): Promise<{ sent: false; reason: MarketingRefusal }> {
  if (!args.consentRecordId) throw new Error("sendMarketingEmail requires consentRecordId");
  const enabled = opts.marketingEnabled ?? serverEnv().MARKETING_EMAIL_ENABLED;
  const refuse = (reason: MarketingRefusal) => {
    logger.info("email.marketing_refused", { template: args.template, reason });
    return { sent: false as const, reason };
  };
  if (!enabled) return refuse("KILL_SWITCH");

  const gate = await canSendMarketing(db, args.to, { pepper: opts.pepper });
  if (!gate.allowed) return refuse(gate.reason);
  if (gate.consentRecordId !== args.consentRecordId) return refuse("CONSENT_MISMATCH");

  const categoryOf = (key: TemplateKey): EmailMessage["category"] => TEMPLATES[key].category;
  if (categoryOf(args.template) !== "MARKETING") throw new Error(`Template ${args.template} is not a MARKETING template`);
  // Delivery (EMAIL_FROM_MARKETING, List-Unsubscribe + one-click, sender footer, frequency caps, quiet hours) is M8.
  throw new Error("MARKETING delivery is not available before M8");
}
