import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";

// Fixed-window rate limiter backed by the `rate_limit` table (docs/02-arkitektur.md § 7).
// One SQL statement records the request and returns the window state, so concurrent requests cannot all pass.

export interface RateLimitRule {
  /** Window length in seconds. */
  window: number;
  max: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window frees up (only when blocked). */
  retryAfter: number | null;
}

export function evaluateWindow(state: { count: number; windowStartMs: number }, nowMs: number, rule: RateLimitRule): RateLimitResult {
  if (state.count <= rule.max) return { allowed: true, retryAfter: null };
  const remainingMs = state.windowStartMs + rule.window * 1000 - nowMs;
  return { allowed: false, retryAfter: Math.max(1, Math.ceil(remainingMs / 1000)) };
}

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export const rateLimitKeys = {
  magicLinkEmail: (email: string) => `magic-link:email:${hashIdentifier(email)}`,
};

export const RATE_LIMITS = {
  /** docs/02 § 7: 5 / 15 min per email. The per-IP rule (20 / hour) is a Better Auth custom rule. */
  magicLinkPerEmail: { window: 15 * 60, max: 5 },
  magicLinkPerIp: { window: 60 * 60, max: 20 },
} satisfies Record<string, RateLimitRule>;

export async function consumeRateLimit(
  db: PrismaClient,
  key: string,
  rule: RateLimitRule,
  nowMs: number = Date.now(),
): Promise<RateLimitResult> {
  const windowMs = rule.window * 1000;
  const rows = await db.$queryRaw<{ count: number; lastRequest: bigint }[]>`
    INSERT INTO "rate_limit" ("id", "key", "count", "lastRequest")
    VALUES (${randomUUID()}, ${key}, 1, ${nowMs})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limit"."lastRequest" <= ${nowMs - windowMs} THEN 1 ELSE "rate_limit"."count" + 1 END,
      "lastRequest" = CASE WHEN "rate_limit"."lastRequest" <= ${nowMs - windowMs} THEN ${nowMs} ELSE "rate_limit"."lastRequest" END
    RETURNING "count", "lastRequest"`;
  const row = rows[0];
  if (!row) throw new Error("rate limit upsert returned no row");
  return evaluateWindow({ count: Number(row.count), windowStartMs: Number(row.lastRequest) }, nowMs, rule);
}
