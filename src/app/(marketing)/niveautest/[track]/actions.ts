"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { placementConfig } from "@/lib/config/placement";
import { serverEnv } from "@/lib/env";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { getPlacementTest, trackFromSlug } from "@/server/placement/content";
import { submitPlacement } from "@/server/placement/submit";
import { PLACEMENT_COOKIE } from "@/server/placement/tokens";
import { requestMeta } from "@/server/security/request-meta";

// Public (pre-login) action — allowlisted in tests/unit/authz-scan.test.ts. Bot protection (honeypot + minimum
// time + 10/hour per IP) lives in src/server/placement/submit.ts. Logged-in users save straight to their account.

const ERROR_PARAM = { BOT: "generel", INCOMPLETE: "mangler", TOO_FAST: "hurtig", EXPIRED: "udloebet", RATE_LIMITED: "graense" } as const;

export async function submitPlacementTest(formData: FormData) {
  const slug = z.string().max(20).catch("").parse(formData.get("track"));
  const track = trackFromSlug(slug);
  if (!track) redirect("/niveautest");

  const fields: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string" && k.length <= 40) fields[k] = v.slice(0, 200);

  const ctx = await getAuthContext();
  let user: { id: string; organizationId: string | null } | undefined;
  if (ctx) {
    const orgId = ctx.session.activeOrganizationId;
    const member = orgId ? await db().membership.findFirst({ where: { userId: ctx.user.id, organizationId: orgId, deactivatedAt: null }, select: { id: true } }) : null;
    user = { id: ctx.user.id, organizationId: member ? orgId : null };
  }

  let outcome: Awaited<ReturnType<typeof submitPlacement>>;
  try {
    outcome = await submitPlacement(db(), {
      test: getPlacementTest(track),
      fields,
      meta: requestMeta(await headers()),
      user,
      secret: serverEnv().BETTER_AUTH_SECRET,
    });
  } catch (err) {
    logger.error("placement.submit_failed", { err });
    redirect(`/niveautest/${slug}?fejl=generel`);
  }
  if (!outcome.ok) {
    if (outcome.error === "BOT") logger.warn("placement.bot_rejected", {});
    redirect(`/niveautest/${slug}?fejl=${ERROR_PARAM[outcome.error]}`);
  }
  if (outcome.anonymousToken) {
    (await cookies()).set(PLACEMENT_COOKIE, outcome.anonymousToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: placementConfig.resultCookieMaxAgeSeconds,
    });
  }
  redirect("/niveautest/resultat");
}
