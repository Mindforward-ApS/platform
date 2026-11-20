import { NextResponse } from "next/server";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { resolvePostLogin } from "@/server/orgs/post-login";
import { PLACEMENT_COOKIE } from "@/server/placement/tokens";

// Post-login landing (callbackURL for SSO): choose or create the organization context.
// M5: an anonymous placement result in the httpOnly cookie is claimed here and turned into the user's plan.
// The email-code form resolves the same target itself (src/server/orgs/post-login.ts).
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();
    const placementToken = request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${PLACEMENT_COOKIE}=`))
      ?.slice(PLACEMENT_COOKIE.length + 1);
    const { target, placementConsumed } = await resolvePostLogin(db(), {
      user: ctx.user,
      sessionId: ctx.session.id,
      activeOrganizationId: ctx.session.activeOrganizationId,
      next: new URL(request.url).searchParams.get("next"),
      placementToken: placementToken ? decodeURIComponent(placementToken) : null,
    });
    const response = NextResponse.redirect(new URL(target, request.url));
    if (placementConsumed) response.cookies.delete(PLACEMENT_COOKIE);
    return response;
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.redirect(new URL("/log-ind", request.url));
    throw err;
  }
}
