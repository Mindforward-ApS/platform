"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { onboardingKind, signupInput } from "@/lib/config/onboarding";
import { serverEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n";
import { safeNextPath } from "@/lib/safe-next";
import { getAuth } from "@/server/auth/better-auth";
import { PENDING_LOGIN_COOKIE, PENDING_LOGIN_MAX_AGE, sealPendingLogin, sendLoginCode } from "@/server/auth/login-code";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { requestMeta } from "@/server/security/request-meta";

// Public (pre-login) action — allowlisted in tests/unit/authz-scan.test.ts. "Tilmeld": fornavn, efternavn,
// telefon, e-mail → a 6-digit code by email (rate-limited per email and IP) → /opret/kode.

export interface SignupFormState {
  error?: string;
  values?: { firstName: string; lastName: string; phone: string; email: string };
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.slice(0, 300) : "");

export async function requestSignupCode(_prev: SignupFormState | null, formData: FormData): Promise<SignupFormState> {
  const t = getMessages().onboarding.signup.errors;
  const values = { firstName: str(formData.get("firstName")), lastName: str(formData.get("lastName")), phone: str(formData.get("phone")), email: str(formData.get("email")) };
  const kind = onboardingKind.optional().catch(undefined).parse(formData.get("kind") ?? undefined);
  const next = safeNextPath(z.string().max(200).catch("").parse(formData.get("next") ?? ""));
  const parsed = signupInput.safeParse({ ...values, kind });
  if (!parsed.success) {
    const phoneOnly = parsed.error.issues.every((i) => i.path[0] === "phone");
    return { error: phoneOnly ? t.phone : t.invalid, values };
  }

  const h = await headers();
  try {
    const res = await sendLoginCode(db(), getAuth().api, { email: parsed.data.email, ip: requestMeta(h).ip, headers: h });
    if (!res.ok) return { error: res.error === "RATE_LIMITED" ? t.rate : t.generic, values };
  } catch (err) {
    logger.error("auth.signup_code_failed", { err });
    return { error: t.generic, values };
  }
  const { firstName, lastName, phone, email } = parsed.data;
  (await cookies()).set(
    PENDING_LOGIN_COOKIE,
    sealPendingLogin({ email, next, kind: kind ?? null, signup: { firstName, lastName, phone } }, serverEnv().BETTER_AUTH_SECRET),
    { httpOnly: true, sameSite: "lax", secure: true, maxAge: PENDING_LOGIN_MAX_AGE, path: "/" },
  );
  redirect("/opret/kode");
}
