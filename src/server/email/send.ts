import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type EmailMessage, type PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { logger } from "@/server/observability/logger";
import { isAllowedRecipient } from "./allowlist";
import { canSendMarketing, emailHash, unsubscribeSecret, signUnsubscribeToken } from "./consent";
import { EnvValidationError } from "@/lib/env.schema";
import { marketingConfig } from "@/lib/config/marketing";
import { monthKey, monthRange } from "@/server/modules/monthly-clock";
import { marketingEnabled } from "./flags";
import { CAP_LOOKBACK_DAYS, isQuietTime, nextSendWindow, withinFrequencyCaps } from "./marketing-rules";
import { assertTemplateVars } from "./template-schema";
import { renderTemplate, TEMPLATES, type MarketingTemplateKey, type TemplateKey, type TemplateVars } from "./templates";
import type { MarketingBaseVars, MarketingSender } from "./templates/marketing";
import { fileTransport, logTransport, resendTransport, type EmailTransport } from "./transports";

export type { EmailTransport } from "./transports";

// The single way out for email (docs/02-arkitektur.md § 1). SERVICE mail via sendServiceEmail; MARKETING only
// via sendMarketingEmail below, which enforces the consent gate (M5) and delivers (M8).

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
/** Login/security mails go out even after a hard bounce (the user may have fixed their inbox). */
const SERVICE_BYPASS_SUPPRESSION = new Set<string>(["magic-link"]);

export async function sendServiceEmail<K extends TemplateKey>(db: PrismaClient, args: SendArgs<K>, opts: SendOptions = {}): Promise<EmailMessage> {
  const def = TEMPLATES[args.template];
  if (def.category !== "SERVICE") throw new Error(`Template ${args.template} is not a SERVICE template`);

  // M8: SERVICE mails never carry offer/discount data (docs/09 § 1).
  assertTemplateVars(args.template, def.category, args.vars);

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

  // docs/09 § 2: a hard bounce (appliesToService) also stops SERVICE mail — except login/security mails.
  if (!SERVICE_BYPASS_SUPPRESSION.has(args.template) && env.EMAIL_HASH_PEPPER) {
    const hit = await db.emailSuppression.count({ where: { emailHash: emailHash(to, env.EMAIL_HASH_PEPPER), appliesToService: true } });
    if (hit > 0) return db.emailMessage.update({ where: { id: message.id }, data: { status: "SUPPRESSED", error: "hard bounce suppression" } });
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

// ─── MARKETING (M5 gate + M8 delivery) ───────────────────────────────────

export type MarketingRefusal =
  | "KILL_SWITCH"
  | "NO_CONSENT"
  | "NOT_CONFIRMED"
  | "WITHDRAWN"
  | "SUPPRESSED"
  | "CONSENT_MISMATCH"
  | "FREQUENCY_CAP"
  | "NEWSLETTER_LIMIT"
  | "FLOW_ACTIVE"
  | "QUIET_HOURS"
  | "NOT_ALLOWLISTED";

export type MarketingResult = { sent: true; message: EmailMessage; duplicate?: true } | { sent: false; reason: MarketingRefusal; retryAt?: Date };

/** Template variables a caller provides: the unsubscribe link and the sender are always injected here. */
export type MarketingCallerVars<K extends TemplateKey> = Omit<TemplateVars<K>, "unsubscribeUrl" | "sender">;

export interface MarketingSendArgs<K extends TemplateKey> extends Omit<SendArgs<K>, "vars"> {
  vars: MarketingCallerVars<K>;
  /** REQUIRED (docs/03 § 8): the CONFIRMED ConsentRecord this mail relies on; must be the address's latest record. */
  consentRecordId: string;
}

export interface MarketingSendOptions extends SendOptions {
  marketingEnabled?: boolean;
  pepper?: string;
  now?: Date;
  unsubscribeSecret?: string;
  appUrl?: string;
  sender?: MarketingSender;
}

function marketingSender(explicit?: MarketingSender): MarketingSender {
  if (explicit) return explicit;
  const env = serverEnv();
  const missing = (["COMPANY_CVR", "COMPANY_ADDRESS"] as const).filter((k) => !env[k]);
  if (missing.length > 0) throw new EnvValidationError([...missing], missing.map((k) => `  - ${k}: påkrævet for markedsføringsmails (afsender i footer)`).join("\n"));
  return { name: env.COMPANY_LEGAL_NAME, cvr: env.COMPANY_CVR ?? "", address: env.COMPANY_ADDRESS ?? "" };
}

const MARKETING_LIVE: EmailMessage["status"][] = ["QUEUED", "SENT", "DELIVERED"];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The only way a MARKETING mail may leave (docs/09 § 2.1). Everything is checked AT SEND TIME, never when a
 * flow is scheduled: kill switch (FeatureFlag > env) → latest ConsentRecord CONFIRMED (double opt-in) and no
 * EmailSuppression → the caller's consentRecordId is that record → frequency caps (2/7 d, 6/30 d, newsletter
 * 1/month, one flow at a time) → quiet hours (deferred with retryAt). Refusals are returned, never thrown.
 * Delivery: EMAIL_FROM_MARKETING, unsubscribe link + sender in the footer, List-Unsubscribe (+ one-click POST).
 */
export async function sendMarketingEmail<K extends TemplateKey>(db: PrismaClient, args: MarketingSendArgs<K>, opts: MarketingSendOptions = {}): Promise<MarketingResult> {
  if (!args.consentRecordId) throw new Error("sendMarketingEmail requires consentRecordId");
  const now = opts.now ?? new Date();
  const refuse = (reason: MarketingRefusal, retryAt?: Date): MarketingResult => {
    logger.info("email.marketing_refused", { template: args.template, reason });
    return retryAt ? { sent: false, reason, retryAt } : { sent: false, reason };
  };
  const enabled = opts.marketingEnabled ?? (await marketingEnabled(db));
  if (!enabled) return refuse("KILL_SWITCH");

  const gate = await canSendMarketing(db, args.to, { pepper: opts.pepper });
  if (!gate.allowed) return refuse(gate.reason);
  if (gate.consentRecordId !== args.consentRecordId) return refuse("CONSENT_MISMATCH");

  if (TEMPLATES[args.template].category !== "MARKETING") throw new Error(`Template ${args.template} is not a MARKETING template`);
  const template = args.template as MarketingTemplateKey;
  const to = args.to.trim().toLowerCase();

  // Idempotent: a mail already handed to the transport is neither sent nor counted again.
  const existing = await db.emailMessage.findUnique({ where: { idempotencyKey: args.idempotencyKey } });
  if (existing && DONE.includes(existing.status)) return { sent: true, message: existing, duplicate: true };

  const previous = await db.emailMessage.findMany({
    where: {
      toEmail: to,
      category: "MARKETING",
      status: { in: MARKETING_LIVE },
      createdAt: { gt: new Date(now.getTime() - CAP_LOOKBACK_DAYS * DAY_MS) },
      idempotencyKey: { not: args.idempotencyKey },
    },
    select: { createdAt: true, template: true },
  });
  if (!withinFrequencyCaps(previous.map((p) => p.createdAt), now)) return refuse("FREQUENCY_CAP");
  if (template === "newsletter") {
    const { start, end } = monthRange(monthKey(now));
    const thisMonth = await db.emailMessage.count({
      where: { toEmail: to, template: "newsletter", status: { in: MARKETING_LIVE }, createdAt: { gte: start, lt: end }, idempotencyKey: { not: args.idempotencyKey } },
    });
    if (thisMonth >= marketingConfig.newsletterPerMonth) return refuse("NEWSLETTER_LIMIT");
    // One flow at a time (docs/09 § 4): nurture outranks the newsletter.
    const nurtureSince = now.getTime() - marketingConfig.nurtureActiveDays * DAY_MS;
    if (previous.some((p) => p.template.startsWith("nurture-") && p.createdAt.getTime() > nurtureSince)) return refuse("FLOW_ACTIVE");
  }
  if (isQuietTime(now)) return refuse("QUIET_HOURS", nextSendWindow(now));

  const env = serverEnv();
  const appUrl = opts.appUrl ?? env.APP_URL;
  const token = encodeURIComponent(signUnsubscribeToken(to, unsubscribeSecret(opts.unsubscribeSecret)));
  const unsubscribePage = `${appUrl}/afmeld?t=${token}`;
  const oneClick = `${appUrl}/api/afmeld?t=${token}`;
  const injected: Pick<MarketingBaseVars, "unsubscribeUrl" | "sender"> = { unsubscribeUrl: unsubscribePage, sender: marketingSender(opts.sender) };
  const vars = { ...args.vars, ...injected } as unknown as TemplateVars<K>;
  const rendered = await renderTemplate(args.template, vars);

  let message: EmailMessage;
  try {
    message =
      existing ??
      (await db.emailMessage.create({
        data: {
          id: randomUUID(),
          category: "MARKETING",
          template: args.template,
          templateVersion: rendered.version,
          toEmail: to,
          userId: args.userId ?? null,
          organizationId: args.organizationId ?? null,
          consentRecordId: gate.consentRecordId,
          idempotencyKey: args.idempotencyKey,
          subject: rendered.subject,
          createdAt: now,
        },
      }));
  } catch (err) {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
    const raced = await db.emailMessage.findUniqueOrThrow({ where: { idempotencyKey: args.idempotencyKey } });
    if (DONE.includes(raced.status)) return { sent: true, message: raced, duplicate: true };
    message = raced;
  }

  const enforceAllowlist = opts.enforceAllowlist ?? env.VERCEL_ENV !== "production";
  if (enforceAllowlist && !isAllowedRecipient(to, opts.allowlist ?? env.EMAIL_ALLOWLIST)) {
    await db.emailMessage.update({ where: { id: message.id }, data: { status: "SUPPRESSED", error: "not on EMAIL_ALLOWLIST" } });
    return refuse("NOT_ALLOWLISTED");
  }

  const transport = opts.transport ?? defaultTransport();
  try {
    const { providerId } = await transport.send({
      from: env.EMAIL_FROM_MARKETING,
      to,
      replyTo: env.EMAIL_REPLY_TO,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      template: args.template,
      idempotencyKey: args.idempotencyKey,
      // RFC 2369 + RFC 8058 one-click (Gmail/Yahoo bulk-sender requirement, docs/09 § 8).
      headers: { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    const sent = await db.emailMessage.update({ where: { id: message.id }, data: { status: "SENT", sentAt: now, resendId: providerId, error: null } });
    return { sent: true, message: sent };
  } catch (err) {
    logger.error("email.send_failed", { template: args.template, transport: transport.name, err });
    await db.emailMessage.update({ where: { id: message.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" } });
    throw err;
  }
}

