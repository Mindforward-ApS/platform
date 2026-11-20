import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { consentConfig, placementRateLimits } from "@/lib/config/placement";
import type { PlacementAnswers, PlacementTest } from "@/lib/schemas/placement";
import { grantMarketingConsent, type RequestMeta } from "@/server/email/consent";
import { sendServiceEmail, type SendOptions } from "@/server/email/send";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { hashKey } from "@/server/security/request-meta";
import { z } from "zod";
import { savePlacement } from "./service";
import { checkStartToken } from "./tokens";

// Public form handling (no login required) with bot protection: honeypot + minimum time + rate limits (docs/02 § 7).
// Server actions in src/app only translate FormData/cookies/redirects; the rules live here and are integration-tested.

export const HONEYPOT_FIELD = "website";

export type SubmitError = "BOT" | "INCOMPLETE" | "TOO_FAST" | "EXPIRED" | "RATE_LIMITED";

export interface SubmitInput {
  test: PlacementTest;
  fields: Record<string, string | undefined>;
  meta: RequestMeta;
  user?: { id: string; organizationId: string | null };
  secret: string;
  nowMs?: number;
}

/** FormData fields → answers (option ids only). Unknown option ids and missing required answers → null. */
export function parseAnswers(test: PlacementTest, fields: Record<string, string | undefined>): PlacementAnswers | null {
  const questions: Record<string, string> = {};
  for (const q of test.questions) {
    const v = fields[q.id];
    if (!v || !q.options.some((o) => o.id === v)) return null;
    questions[q.id] = v;
  }
  const profile: PlacementAnswers["profile"] = { jobRole: null, licenseTier: null };
  for (const p of test.profileQuestions) {
    const v = fields[p.id];
    const valid = p.options.find((o) => o.id === v);
    if (!valid) {
      if (p.required) return null;
      continue;
    }
    if (p.kind === "JOB_ROLE") profile.jobRole = p.options.find((o) => o.id === v)?.id ?? null;
    else profile.licenseTier = p.options.find((o) => o.id === v)?.id ?? null;
  }
  return { profile, questions };
}

export async function submitPlacement(
  db: PrismaClient,
  input: SubmitInput,
): Promise<{ ok: true; resultId: string; anonymousToken: string | null } | { ok: false; error: SubmitError }> {
  const nowMs = input.nowMs ?? Date.now();
  if (input.fields[HONEYPOT_FIELD]) return { ok: false, error: "BOT" };
  const start = checkStartToken(input.fields.startToken ?? "", input.test.track, nowMs, input.secret);
  if (!start.ok) return { ok: false, error: start.reason === "INVALID" ? "BOT" : start.reason };
  const answers = parseAnswers(input.test, input.fields);
  if (!answers) return { ok: false, error: "INCOMPLETE" };

  const limit = await consumeRateLimit(db, `placement:ip:${hashKey(input.meta.ip)}`, placementRateLimits.submitPerIp, nowMs);
  if (!limit.allowed) return { ok: false, error: "RATE_LIMITED" };

  const saved = await savePlacement(db, { test: input.test, answers, durationSeconds: start.elapsedSeconds, user: input.user });
  return { ok: true, resultId: saved.id, anonymousToken: saved.anonymousToken };
}

// ─── Marketing consent signup (result page) ────────────────────────────

export type ConsentError = "NOT_TICKED" | "INVALID_EMAIL" | "RATE_LIMITED" | "BOT";

export interface ConsentSignupInput {
  email: string;
  /** The checkbox value; must be exactly "yes" (unticked boxes send nothing). */
  consent: string | undefined;
  honeypot: string | undefined;
  meta: RequestMeta;
  appUrl: string;
  userId?: string | null;
  organizationId?: string | null;
  nowMs?: number;
}

export async function signupMarketingConsent(
  db: PrismaClient,
  input: ConsentSignupInput,
  sendOpts: SendOptions = {},
): Promise<{ ok: true } | { ok: false; error: ConsentError }> {
  if (input.honeypot) return { ok: false, error: "BOT" };
  if (input.consent !== "yes") return { ok: false, error: "NOT_TICKED" };
  const email = z.email().max(254).safeParse(input.email.trim().toLowerCase());
  if (!email.success) return { ok: false, error: "INVALID_EMAIL" };

  const nowMs = input.nowMs ?? Date.now();
  for (const [key, rule] of [
    [`consent:ip:${hashKey(input.meta.ip)}`, placementRateLimits.consentPerIp],
    [`consent:email:${hashKey(email.data)}`, placementRateLimits.consentPerEmail],
  ] as const) {
    if (!(await consumeRateLimit(db, key, rule, nowMs)).allowed) return { ok: false, error: "RATE_LIMITED" };
  }

  const grant = await grantMarketingConsent(
    db,
    { email: email.data, source: "PLACEMENT_RESULT", ip: input.meta.ip, userAgent: input.meta.userAgent, userId: input.userId, organizationId: input.organizationId },
    new Date(nowMs),
  );
  // Same answer either way, so the form does not reveal whether an address is subscribed.
  if (grant.status === "ALREADY_CONFIRMED") return { ok: true };

  await sendServiceEmail(
    db,
    {
      template: "marketing-confirm",
      to: email.data,
      vars: { url: `${input.appUrl}/samtykke/bekraeft?t=${encodeURIComponent(grant.token)}`, expiresDays: consentConfig.confirmationValidDays },
      idempotencyKey: `marketing-confirm:${grant.grantId}`,
      userId: input.userId ?? null,
    },
    sendOpts,
  );
  return { ok: true };
}
