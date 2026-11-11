"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { PERSONAL_PLAN_CHOICES, START_PATHS, TEAM_SIZE_BANDS } from "@/lib/config/onboarding";
import { serverEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n";
import { orgAdminErrorMessage } from "@/server/admin/context";
import { requireActiveMembership, requireUser } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { getAuth } from "@/server/auth/better-auth";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import {
  completeOnboarding,
  isTrackSlug,
  loadOnboarding,
  OnboardingError,
  planPreview,
  saveCompany,
  savePersonalPlan,
  saveStartPath,
  saveTrack,
  TRACK_SLUGS,
} from "@/server/onboarding/service";
import { createJoinLink, inviteByEmail } from "@/server/orgs/invitations";

// Onboarding steps after sign-in (approved preview, Marco 11 Nov 2026). Every action authenticates first and
// writes only to the caller's own membership (organization from the session, never from the form).

const MEMBERS = ["OWNER", "ADMIN", "LEARNER"] as const;
const optionalEmail = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.email().max(254).optional());

async function member() {
  const ctx = await requireActiveMembership(MEMBERS);
  return { ctx, owner: { userId: ctx.user.id, organizationId: ctx.membership.organizationId } };
}

const membershipInput = z.object({ plan: z.enum(PERSONAL_PLAN_CHOICES), friendEmail: optionalEmail, studentEmail: optionalEmail });

export async function saveMembership(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { owner } = await member();
  const t = getMessages().onboarding.membership.errors;
  const parsed = membershipInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues.some((i) => i.path[0] === "plan") ? t.choose : formData.get("plan") === "FRIEND" ? t.friendEmail : t.studentEmail };
  const { plan, friendEmail, studentEmail } = parsed.data;
  if (plan === "FRIEND" && !friendEmail) return { error: t.friendEmail };
  if (plan === "STUDENT" && !studentEmail) return { error: t.studentEmail };
  try {
    // TODO(billing): FRIEND and STUDENT have no Stripe price yet — the choice is recorded only (see docs/OPEN-QUESTIONS.md).
    await savePersonalPlan(db(), owner, { plan, friendEmail: friendEmail ?? null, studentEmail: studentEmail ?? null });
  } catch (err) {
    if (err instanceof OnboardingError) return { error: getMessages().onboarding.signup.errors.generic };
    throw err;
  }
  redirect("/kom-i-gang?trin=start");
}

const companyInput = z.object({ name: z.string().trim().min(2).max(120), band: z.enum(TEAM_SIZE_BANDS) });

/** Erhverv: creates the company (user = OWNER) or updates it on a second visit. */
export async function saveCompanyStep(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireUser();
  const parsed = companyInput.safeParse({ name: formData.get("name"), band: formData.get("band") });
  if (!parsed.success) return { error: getMessages().onboarding.company.errors.invalid };
  // TODO(billing): SIZE_10_PLUS (55 kr) and ENTERPRISE have no Stripe price/flow yet — recorded only.
  await saveCompany(db(), { userId: ctx.user.id, sessionId: ctx.session.id, activeOrganizationId: ctx.session.activeOrganizationId, name: parsed.data.name, band: parsed.data.band });
  redirect("/kom-i-gang?trin=inviter");
}

async function teamAdmin() {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { type: true } });
  if (org.type !== "BUSINESS") throw new OnboardingError("WRONG_ORG_TYPE");
  return { ctx, scope: { organizationId: ctx.membership.organizationId, actorUserId: ctx.user.id } };
}

/** "Send N invitationer": the existing invitation system (DPA + seat rules apply), role LEARNER. */
export async function inviteTeam(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { scope } = await teamAdmin();
  const raw = z.string().max(20_000).catch("").parse(formData.get("emails") ?? "");
  const h = await headers();
  try {
    await inviteByEmail(
      db(),
      async (email, role) => {
        const inv = await getAuth().api.createInvitation({ headers: h, body: { email, role, organizationId: scope.organizationId } });
        return { id: inv.id };
      },
      { ...scope, raw, role: "LEARNER" },
    );
  } catch (err) {
    const message = orgAdminErrorMessage(err);
    if (message) return { error: message };
    logger.warn("onboarding.invite_failed", { err });
    return { error: getMessages().orgAdmin.errors.generic };
  }
  redirect("/kom-i-gang?trin=start");
}

/** "Lav et link": the org's join link (shown once; only its hash is stored). */
export async function makeInviteLink(_prev: FormState | null): Promise<FormState> {
  const { scope } = await teamAdmin();
  try {
    const token = await createJoinLink(db(), scope);
    return { ok: getMessages().orgAdmin.link.created, detail: `${serverEnv().APP_URL}/deltag/${token}` };
  } catch (err) {
    return { error: orgAdminErrorMessage(err) ?? getMessages().orgAdmin.errors.generic };
  }
}

export async function saveStart(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { owner } = await member();
  const path = z.enum(START_PATHS).safeParse(formData.get("path"));
  if (!path.success) return { error: getMessages().onboarding.start.errors.choose };
  await saveStartPath(db(), owner, path.data);
  redirect("/kom-i-gang?trin=vaerktoej");
}

/** Tool → TrackEnrollment. With "Tag niveautesten" the existing test for that track comes next. */
export async function saveTool(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const { owner } = await member();
  const slug = formData.get("track");
  if (!isTrackSlug(slug)) return { error: getMessages().onboarding.tool.errors.choose };
  try {
    await saveTrack(db(), owner, TRACK_SLUGS[slug]);
  } catch (err) {
    if (err instanceof OnboardingError) return { error: getMessages().onboarding.tool.errors.choose };
    throw err;
  }
  const o = await loadOnboarding(db(), owner);
  if (o.profile?.startPath === "PLACEMENT_TEST") redirect(`/niveautest/${slug}?fra=kom-i-gang`);
  redirect("/kom-i-gang?trin=plan");
}

/** "Start første lektion": marks the onboarding done and opens the first lesson of the plan. */
export async function finishOnboarding() {
  const { owner } = await member();
  await completeOnboarding(db(), owner);
  const plan = await planPreview(db(), await loadOnboarding(db(), owner));
  redirect(plan?.firstLessonHref ?? "/hjem");
}
