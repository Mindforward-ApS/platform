import { NextResponse } from "next/server";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { runStart } from "@/server/orgs/service";

// Post-login landing (callbackURL for magic link and SSO): choose or create the organization context.
export async function GET(request: Request) {
  try {
    const ctx = await requireUser();
    const { redirectTo } = await runStart(db(), { user: ctx.user, sessionId: ctx.session.id, activeOrganizationId: ctx.session.activeOrganizationId });
    const next = new URL(request.url).searchParams.get("next");
    const target = redirectTo === "/konto" && next?.startsWith("/") && !next.startsWith("//") ? next : redirectTo;
    return NextResponse.redirect(new URL(target, request.url));
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.redirect(new URL("/log-ind", request.url));
    throw err;
  }
}
