"use server";

import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/server/auth/better-auth";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth-cookies";
import { safeNextPath } from "@/lib/safe-next";
import { logger } from "@/server/observability/logger";

// Public (pre-login) actions — allowlisted in tests/unit/authz-scan.test.ts. Rate-limited per email and IP.

const nextPath = z
  .string()
  .optional()
  .transform((v) => safeNextPath(v) ?? undefined)
  .catch(undefined);

function callbackFor(next: string | undefined): string {
  return next ? `/start?next=${encodeURIComponent(next)}` : "/start";
}

const magicLinkInput = z.object({ email: z.email().max(254), next: nextPath, from: z.enum(["log-ind", "opret"]).catch("log-ind") });

export async function requestMagicLink(formData: FormData) {
  const parsed = magicLinkInput.safeParse({ email: formData.get("email"), next: formData.get("next") ?? undefined, from: formData.get("from") });
  const from = parsed.success ? parsed.data.from : "log-ind";
  if (!parsed.success) redirect(`/${from}?fejl=email`);

  try {
    await getAuth().api.signInMagicLink({ body: { email: parsed.data.email, callbackURL: callbackFor(parsed.data.next) }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError && err.status === "TOO_MANY_REQUESTS") redirect(`/${from}?fejl=rate`);
    logger.error("auth.magic_link_failed", { err });
    redirect(`/${from}?fejl=generel`);
  }
  // Keep the address out of the URL: the confirmation page reads it from a short-lived httpOnly cookie.
  (await cookies()).set(PENDING_EMAIL_COOKIE, parsed.data.email, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 15 * 60, path: "/tjek-mail" });
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
