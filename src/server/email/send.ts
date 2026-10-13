import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type EmailMessage, type PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { logger } from "@/server/observability/logger";
import { isAllowedRecipient } from "./allowlist";
import { renderTemplate, TEMPLATES, type TemplateKey, type TemplateVars } from "./templates";
import { fileTransport, logTransport, resendTransport, type EmailTransport } from "./transports";

export type { EmailTransport } from "./transports";

// The single way out for email (docs/02-arkitektur.md § 1). M1 supports SERVICE mail only;
// MARKETING goes through the consent gate added in M5/M8 and is rejected here.

export interface SendArgs<K extends TemplateKey> {
  template: K;
  to: string;
  vars: TemplateVars<K>;
  idempotencyKey: string;
  userId?: string | null;
  organizationId?: string | null;
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
    });
    return db.emailMessage.update({ where: { id: message.id }, data: { status: "SENT", sentAt: new Date(), resendId: providerId, error: null } });
  } catch (err) {
    logger.error("email.send_failed", { template: args.template, transport: transport.name, err });
    await db.emailMessage.update({ where: { id: message.id }, data: { status: "FAILED", error: err instanceof Error ? err.message.slice(0, 500) : "unknown" } });
    throw err;
  }
}
