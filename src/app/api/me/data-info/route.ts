import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { acknowledgeFirstLoginInfo } from "@/server/admin/first-login";
import { AuthzError, requireActiveMembership } from "@/server/auth/authz";
import { db } from "@/server/db";

// Acknowledges the first-login data information (docs/10 § 1.6) → AuditLog FIRST_LOGIN_INFO_SHOWN, then /konto.
// A plain form POST + 303 (full page load) on purpose: see src/app/(learner)/konto/data-info/page.tsx.

export async function POST() {
  try {
    const ctx = await requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]);
    await acknowledgeFirstLoginInfo(db(), ctx.user.id, ctx.membership.organizationId);
  } catch (err) {
    if (!(err instanceof AuthzError)) throw err;
    return NextResponse.redirect(new URL("/log-ind", serverEnv().APP_URL), 303);
  }
  return NextResponse.redirect(new URL("/konto", serverEnv().APP_URL), 303);
}
