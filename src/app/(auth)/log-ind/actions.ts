"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";
import { getAuth } from "@/server/auth/better-auth";
import { PENDING_LOGIN_COOKIE, PENDING_LOGIN_MAX_AGE, sealPendingLogin, sendLoginCode } from "@/server/auth/login-code";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { requestMeta } from "@/server/security/request-meta";

// Public (pre-login) actions — allowlisted in tests/unit/authz-scan.test.ts. Rate-limited per email and IP
// (src/server/auth/login-code.ts + the emailOTP plugin config).

const nextPath = z
  .string()
  .optional()
  .transform((v) => safeNextPath(v) ?? undefined)
  .catch(undefined);

function callbackFor(next: string | undefined): string {
  return next ? `/start?next=${encodeURIComponent(next)}` : "/start";
}

const loginInput = z.object({ email: z.email().max(254), next: nextPath });

/** "Log ind": email → we send a 6-digit code → /tjek-mail, where it is typed. */
export async function requestLoginCode(formData: FormData) {
  const parsed = loginInput.safeParse({ email: formData.get("email"), next: formData.get("next") ?? undefined });
  if (!parsed.success) redirect("/log-ind?fejl=email");
  const email = parsed.data.email.trim().toLowerCase();
  const h = await headers();
  let result: Awaited<ReturnType<typeof sendLoginCode>>;
  try {
    result = await sendLoginCode(db(), getAuth().api, { email, ip: requestMeta(h).ip, headers: h });
  } catch (err) {
    logger.error("auth.login_code_failed", { err });
    redirect("/log-ind?fejl=generel");
  }
  if (!result.ok) redirect(`/log-ind?fejl=${result.error === "RATE_LIMITED" ? "rate" : "generel"}`);
  // Keep the address out of the URL: the code page reads it from a short-lived, sealed httpOnly cookie.
  (await cookies()).set(PENDING_LOGIN_COOKIE, sealPendingLogin({ email, next: parsed.data.next ?? null }, serverEnv().BETTER_AUTH_SECRET), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: PENDING_LOGIN_MAX_AGE,
    path: "/",
  });
  redirect("/tjek-mail");
}

const providerInput = z.object({ provider: z.enum(["microsoft", "google"]), next: nextPath });

export async function signInWithProvider(formData: FormData) {
  const parsed = providerInput.safeParse({ provider: formData.get("provider"), next: formData.get("next") ?? undefined });
  if (!parsed.success) redirect("/log-ind?fejl=generel");
  let url: string | undefined;
  try {
    const res = await getAuth().api.signInSocial({ body: { provider: parsed.data.provider, callbackURL: callbackFor(parsed.data.next) }, headers: await headers() });
    url = res.url;
  } catch (err) {
    logger.warn("auth.social_unavailable", { provider: parsed.data.provider, err });
  }
  redirect(url ?? "/log-ind?fejl=udbyder");
}
