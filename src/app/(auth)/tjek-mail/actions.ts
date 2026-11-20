"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { FormState } from "@/components/admin/action-form";
import { serverEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n";
import { loginCodeSchema } from "@/lib/login-code";
import { getAuth } from "@/server/auth/better-auth";
import { openPendingLogin, PENDING_LOGIN_COOKIE, sendLoginCode, verifyLoginCode } from "@/server/auth/login-code";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { applySignupProfile } from "@/server/onboarding/service";
import { resolvePostLogin } from "@/server/orgs/post-login";
import { PLACEMENT_COOKIE } from "@/server/placement/tokens";
import { requestMeta } from "@/server/security/request-meta";

// Public (pre-login) actions — allowlisted in tests/unit/authz-scan.test.ts: they ARE the login. The email comes
// from the sealed pending cookie set when the code was sent, never from the form. Rate limits in login-code.ts.

async function pending() {
  return openPendingLogin((await cookies()).get(PENDING_LOGIN_COOKIE)?.value, serverEnv().BETTER_AUTH_SECRET);
}

/** Type the 6-digit code → signed in (a new email creates the user) → onboarding or /start. */
export async function verifyCode(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const t = getMessages().onboarding.code.errors;
  const p = await pending();
  if (!p) return { error: t.missing };
  const code = loginCodeSchema.safeParse(formData.get("code") ?? "");
  if (!code.success) return { error: t.invalid };

  const h = await headers();
  const signup = p.signup ?? null;
  let result: Awaited<ReturnType<typeof verifyLoginCode>>;
  try {
    result = await verifyLoginCode(db(), getAuth().api, {
      email: p.email,
      code: code.data,
      ip: requestMeta(h).ip,
      headers: h,
      ...(signup ? { name: `${signup.firstName} ${signup.lastName}` } : {}),
    });
  } catch (err) {
    logger.error("auth.login_code_verify_failed", { err });
    return { error: t.generic };
  }
  if (!result.ok) return { error: result.error === "RATE_LIMITED" ? t.rate : result.error === "EXPIRED" ? t.expired : t.invalid };

  const jar = await cookies();
  jar.delete(PENDING_LOGIN_COOKIE);
  if (signup) await applySignupProfile(db(), result.userId, signup);
  // Erhverv sign-up: the company is created on "Om jeres virksomhed", so no PERSONAL org now.
  if (signup && p.kind === "virksomhed" && !p.next) redirect("/kom-i-gang?type=virksomhed&trin=velkommen");

  // Everyone else: pick or create the organization now, like /start does after SSO. The new session cookie is not
  // readable in this request, so the session is looked up by its token. A server-action redirect must land on a page
  // (not the /start route handler), so the final target is resolved here.
  const [session, user] = await Promise.all([
    db().session.findUnique({ where: { token: result.sessionToken }, select: { id: true, activeOrganizationId: true } }),
    db().user.findUniqueOrThrow({ where: { id: result.userId }, select: { id: true, email: true, name: true } }),
  ]);
  if (!session) redirect("/log-ind?fejl=generel");
  const { target, placementConsumed } = await resolvePostLogin(db(), {
    user,
    sessionId: session.id,
    activeOrganizationId: session.activeOrganizationId,
    next: p.next ?? null,
    placementToken: jar.get(PLACEMENT_COOKIE)?.value ?? null,
  });
  if (placementConsumed) jar.delete(PLACEMENT_COOKIE);
  // A new private sign-up continues in the onboarding unless an invitation or a saved result is waiting.
  redirect(signup && !p.next && target === "/hjem" ? "/kom-i-gang?trin=velkommen" : target);
}

/** "Send igen": a fresh code to the pending address. */
export async function resendCode(_prev: FormState | null): Promise<FormState> {
  const m = getMessages().onboarding.code;
  const p = await pending();
  if (!p) return { error: m.errors.missing };
  const h = await headers();
  try {
    const res = await sendLoginCode(db(), getAuth().api, { email: p.email, ip: requestMeta(h).ip, headers: h });
    if (!res.ok) return { error: res.error === "RATE_LIMITED" ? m.errors.rate : m.errors.generic };
  } catch (err) {
    logger.error("auth.login_code_failed", { err });
    return { error: m.errors.generic };
  }
  return { ok: m.resent };
}
