import "server-only";
import { APIError } from "better-auth/api";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { onboardingKind } from "@/lib/config/onboarding";
import { safeNextPath } from "@/lib/safe-next";
import { consumeRateLimit, peekRateLimit, RATE_LIMITS, rateLimitKeys } from "@/server/security/rate-limit";
import { decryptSecret, encryptSecret } from "./secret-box";

// Sign-in and sign-up with a 6-digit code by email (Better Auth emailOTP). The server actions in
// src/app/(auth) only translate FormData/cookies/redirects; the rules live here and are integration-tested.
// auth.api calls from the server skip Better Auth's own limiter, so the per-IP and per-email limits are applied here.

/** Short-lived httpOnly cookie between "send code" and "type code" (sealed with BETTER_AUTH_SECRET). */
export const PENDING_LOGIN_COOKIE = "greb_pending_login";
export const PENDING_LOGIN_MAX_AGE = 30 * 60;

const pendingSchema = z.object({
  email: z.email().max(254),
  next: z.string().max(200).nullable().optional(),
  kind: onboardingKind.nullable().optional(),
  signup: z.object({ firstName: z.string().max(60), lastName: z.string().max(60), phone: z.string().max(20) }).nullable().optional(),
});
export type PendingLogin = z.infer<typeof pendingSchema>;

export function sealPendingLogin(p: PendingLogin, secret: string): string {
  return encryptSecret(JSON.stringify(pendingSchema.parse({ ...p, next: safeNextPath(p.next) })), secret);
}

export function openPendingLogin(raw: string | undefined, secret: string): PendingLogin | null {
  if (!raw) return null;
  try {
    const parsed = pendingSchema.safeParse(JSON.parse(decryptSecret(raw, secret)));
    return parsed.success ? { ...parsed.data, next: safeNextPath(parsed.data.next) } : null;
  } catch {
    return null;
  }
}

/** The two Better Auth endpoints we use (auth.api in the app; the same object in tests). */
export interface OtpApi {
  sendVerificationOTP(args: { body: { email: string; type: "sign-in" }; headers: Headers }): Promise<unknown>;
  signInEmailOTP(args: { body: { email: string; otp: string; name?: string }; headers: Headers }): Promise<{ token: string; user: { id: string } }>;
}

export type SendCodeResult = { ok: true } | { ok: false; error: "RATE_LIMITED" };
export type VerifyCodeResult = { ok: true; userId: string; sessionToken: string; created: boolean } | { ok: false; error: "INVALID" | "EXPIRED" | "RATE_LIMITED" };

const ipKey = (ip: string | null) => ip ?? "unknown";

export async function sendLoginCode(db: PrismaClient, api: OtpApi, args: { email: string; ip: string | null; headers: Headers }): Promise<SendCodeResult> {
  // The per-email limit (5 / 15 min) is counted inside the plugin's sendVerificationOTP (better-auth.ts), which
  // also covers direct calls to /api/auth. The plugin swallows errors from that callback, so peek first to be able
  // to tell the user instead of silently sending nothing.
  const byEmail = await peekRateLimit(db, rateLimitKeys.loginCodeEmail(args.email), RATE_LIMITS.loginCodePerEmail);
  if (!byEmail.allowed) return { ok: false, error: "RATE_LIMITED" };
  const ip = await consumeRateLimit(db, rateLimitKeys.loginCodeIp(ipKey(args.ip)), RATE_LIMITS.loginCodePerIp);
  if (!ip.allowed) return { ok: false, error: "RATE_LIMITED" };
  await api.sendVerificationOTP({ body: { email: args.email, type: "sign-in" }, headers: args.headers });
  return { ok: true };
}

function otpErrorCode(err: unknown): string | null {
  if (!(err instanceof APIError)) return null;
  const body = err.body as { code?: unknown } | undefined;
  return typeof body?.code === "string" ? body.code : null;
}

export async function verifyLoginCode(
  db: PrismaClient,
  api: OtpApi,
  args: { email: string; code: string; ip: string | null; headers: Headers; name?: string },
): Promise<VerifyCodeResult> {
  const [byIp, byEmail] = await Promise.all([
    consumeRateLimit(db, rateLimitKeys.loginCodeVerifyIp(ipKey(args.ip)), RATE_LIMITS.loginCodeVerifyPerIp),
    consumeRateLimit(db, rateLimitKeys.loginCodeVerifyEmail(args.email), RATE_LIMITS.loginCodeVerifyPerEmail),
  ]);
  if (!byIp.allowed || !byEmail.allowed) return { ok: false, error: "RATE_LIMITED" };
  const existed = await db.user.count({ where: { email: args.email.toLowerCase() } });
  try {
    const res = await api.signInEmailOTP({ body: { email: args.email, otp: args.code, ...(args.name ? { name: args.name } : {}) }, headers: args.headers });
    return { ok: true, userId: res.user.id, sessionToken: res.token, created: existed === 0 };
  } catch (err) {
    const code = otpErrorCode(err);
    if (code === "INVALID_OTP") return { ok: false, error: "INVALID" };
    if (code === "OTP_EXPIRED" || code === "TOO_MANY_ATTEMPTS") return { ok: false, error: "EXPIRED" };
    throw err;
  }
}
