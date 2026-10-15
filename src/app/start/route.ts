import { NextResponse } from "next/server";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { serverEnv } from "@/lib/env";
import { getWorkProfile } from "@/server/connectors/service";
import { runStart } from "@/server/orgs/service";
import { needsProfile } from "@/server/orgs/start";
import { claimPlacement } from "@/server/placement/service";
import { PLACEMENT_COOKIE } from "@/server/placement/tokens";

// Post-login landing (callbackURL for magic link and SSO): choose or create the organization context.
// M5: an anonymous placement result in the httpOnly cookie is claimed here and turned into the user's plan.
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();
    const { redirectTo, organizationId } = await runStart(db(), { user: ctx.user, sessionId: ctx.session.id, activeOrganizationId: ctx.session.activeOrganizationId });
    const next = new URL(request.url).searchParams.get("next");
    let target = redirectTo === "/konto" && next?.startsWith("/") && !next.startsWith("//") ? next : redirectTo;

    const placementToken = request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${PLACEMENT_COOKIE}=`))
      ?.slice(PLACEMENT_COOKIE.length + 1);
    let claimed = false;
    if (placementToken && organizationId) {
      try {
        claimed = Boolean(await claimPlacement(db(), { token: decodeURIComponent(placementToken), userId: ctx.user.id, organizationId }));
      } catch (err) {
        logger.error("placement.claim_failed", { err });
      }
      if (claimed && target === "/konto") target = "/plan";
    }
    // Signed-in home is /hjem (Marco 14 Oct 2026); runStart keeps "/konto" as its generic "you're in" target.
    if (target === "/konto") target = "/hjem";
    // Work profile (industry → connector recommendations): once, skippable, behind PROFILE_STEP_AFTER_LOGIN.
    if (target === "/hjem" && organizationId && serverEnv().PROFILE_STEP_AFTER_LOGIN) {
      if (needsProfile(await getWorkProfile(db(), { userId: ctx.user.id, organizationId }))) target = "/profil/virksomhed";
    }

    const response = NextResponse.redirect(new URL(target, request.url));
    if (placementToken && organizationId) response.cookies.delete(PLACEMENT_COOKIE);
    return response;
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.redirect(new URL("/log-ind", request.url));
    throw err;
  }
}
