import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";
import { getWorkProfile } from "@/server/connectors/service";
import { logger } from "@/server/observability/logger";
import { claimPlacement } from "@/server/placement/service";
import { runStart } from "./service";
import { needsProfile } from "./start";

// Where a user goes right after signing in (SSO callback /start and the email-code form share this): choose or
// create the organization context, claim an anonymous placement result, then pick the landing page.

export interface PostLoginArgs {
  user: { id: string; email: string; name: string };
  sessionId: string;
  activeOrganizationId: string | null;
  next: string | null;
  placementToken: string | null;
}

export async function resolvePostLogin(db: PrismaClient, args: PostLoginArgs): Promise<{ target: string; placementConsumed: boolean }> {
  const { redirectTo, organizationId } = await runStart(db, { user: args.user, sessionId: args.sessionId, activeOrganizationId: args.activeOrganizationId });
  const next = safeNextPath(args.next);
  let target = redirectTo === "/konto" && next ? next : redirectTo;

  let claimed = false;
  if (args.placementToken && organizationId) {
    try {
      claimed = Boolean(await claimPlacement(db, { token: args.placementToken, userId: args.user.id, organizationId }));
    } catch (err) {
      logger.error("placement.claim_failed", { err });
    }
    if (claimed && target === "/konto") target = "/plan";
  }
  // Signed-in home is /hjem (Marco 14 Oct 2026); runStart keeps "/konto" as its generic "you're in" target.
  if (target === "/konto") target = "/hjem";
  // Work profile (industry → connector recommendations): once, skippable, behind PROFILE_STEP_AFTER_LOGIN.
  if (target === "/hjem" && organizationId && serverEnv().PROFILE_STEP_AFTER_LOGIN) {
    if (needsProfile(await getWorkProfile(db, { userId: args.user.id, organizationId }))) target = "/profil/virksomhed";
  }
  return { target, placementConsumed: Boolean(args.placementToken && organizationId) };
}
