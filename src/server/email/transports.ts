import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { httpRequest } from "@/server/http";
import { logger } from "@/server/observability/logger";

export interface OutgoingEmail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  template: string;
  idempotencyKey: string;
  /** Extra headers, e.g. List-Unsubscribe + List-Unsubscribe-Post on MARKETING mails (M8). */
  headers?: Record<string, string>;
}

export interface EmailTransport {
  name: string;
  send(message: OutgoingEmail): Promise<{ providerId: string | null }>;
}

const resendResponse = z.object({ id: z.string() });

/** Resend REST API via the shared HTTP helper (timeout + retry; the Idempotency-Key makes the POST retry-safe). */
export function resendTransport(apiKey: string): EmailTransport {
  return {
    name: "resend",
    async send(m) {
      const res = await httpRequest("https://api.resend.com/emails", {
        service: "resend",
        method: "POST",
        idempotencyKey: m.idempotencyKey,
        timeoutMs: 10_000,
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ from: m.from, to: [m.to], reply_to: m.replyTo, subject: m.subject, html: m.html, text: m.text, ...(m.headers ? { headers: m.headers } : {}) }),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
      return { providerId: resendResponse.parse(await res.json()).id };
    },
  };
}

/** E2E: writes each mail as JSON so Playwright can read the magic link. Never allowed in production (env.ts). */
export function fileTransport(dir: string): EmailTransport {
  return {
    name: "file",
    async send(m) {
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${Date.now()}-${m.idempotencyKey.replace(/[^a-z0-9-]/gi, "_")}.json`);
      await writeFile(file, JSON.stringify({ to: m.to, from: m.from, subject: m.subject, text: m.text, html: m.html, template: m.template, headers: m.headers ?? {} }));
      return { providerId: null };
    },
  };
}

/** Local development without Resend: prints the plain-text body (contains the login link) to the dev console. */
export function logTransport(): EmailTransport {
  return {
    name: "log",
    async send(m) {
      logger.info("email.logged", { template: m.template, toDomain: m.to.split("@")[1] });
      if (process.env.NODE_ENV === "development") console.log(`\n--- email til ${m.to}: ${m.subject}\n${m.text}\n---\n`);
      return { providerId: null };
    },
  };
}
