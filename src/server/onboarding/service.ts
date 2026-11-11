import "server-only";
import type { MembershipRole, OnboardingProfile, OrganizationType, PrismaClient, TrackKey } from "@/generated/prisma/client";
import {
  nextOpenStep,
  type OnboardingRole,
  type OnboardingSnapshot,
  type PersonalPlanChoiceKey,
  type StartPathKey,
  type TeamSizeBandKey,
} from "@/lib/config/onboarding";
import { writeAudit } from "@/server/audit/log";
import { businessOrgInput, createBusinessOrg } from "@/server/orgs/service";

// Sign-up onboarding (approved preview, Marco 11 Nov 2026). Answers are stored per user per organization in
// OnboardingProfile; the chosen track is also a TrackEnrollment, and a taken test is a PlacementResult.
// Every write is scoped to the caller's own membership (userId + organizationId from the session, never input).

export class OnboardingError extends Error {
  constructor(public readonly code: "NOT_MEMBER" | "WRONG_ORG_TYPE" | "INVALID" | "TRACK_UNAVAILABLE") {
    super(code);
    this.name = "OnboardingError";
  }
}

export interface Owner {
  userId: string;
  organizationId: string;
}

export const TRACK_SLUGS = { chatgpt: "CHATGPT", copilot: "COPILOT", claude: "CLAUDE" } as const satisfies Record<string, TrackKey>;
export type TrackSlug = keyof typeof TRACK_SLUGS;
export const isTrackSlug = (s: unknown): s is TrackSlug => typeof s === "string" && s in TRACK_SLUGS;
export const slugOfTrack = (key: TrackKey): TrackSlug | null => (Object.entries(TRACK_SLUGS).find(([, k]) => k === key)?.[0] as TrackSlug | undefined) ?? null;

/** Who the signed-in user is in this organization, for the step list. */
export function roleFor(orgType: OrganizationType, membershipRole: MembershipRole): OnboardingRole {
  if (orgType === "PERSONAL") return "privat";
  return membershipRole === "LEARNER" ? "medarbejder" : "virksomhed";
}

// ── Sign-up profile ───────────────────────────────────────────────────────

/**
 * After the code is confirmed: store first/last name and phone from the sign-up form. Never overwrites what an
 * existing user already has (signing up again with a known email is just a login).
 */
export async function applySignupProfile(db: PrismaClient, userId: string, input: { firstName: string; lastName: string; phone: string }): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, firstName: true, lastName: true, phone: true } });
  if (!user) return;
  const data: { name?: string; firstName?: string; lastName?: string; phone?: string } = {};
  if (!user.name.trim()) data.name = `${input.firstName} ${input.lastName}`;
  if (!user.firstName) data.firstName = input.firstName;
  if (!user.lastName) data.lastName = input.lastName;
  if (!user.phone) data.phone = input.phone;
  if (Object.keys(data).length > 0) await db.user.update({ where: { id: userId }, data });
}

// ── Reading state ─────────────────────────────────────────────────────────

export interface OnboardingContext {
  role: OnboardingRole;
  orgType: OrganizationType;
  membershipRole: MembershipRole;
  organizationName: string;
  profile: OnboardingProfile | null;
  trackKey: TrackKey | null;
  hasPlacementForTrack: boolean;
  latestPlacementLevel: number | null;
}

async function membershipOf(db: PrismaClient, owner: Owner) {
  const m = await db.membership.findFirst({
    where: { userId: owner.userId, organizationId: owner.organizationId, deactivatedAt: null, organization: { deletedAt: null } },
    select: { role: true, organization: { select: { type: true, name: true } } },
  });
  if (!m) throw new OnboardingError("NOT_MEMBER");
  return m;
}

export async function loadOnboarding(db: PrismaClient, owner: Owner): Promise<OnboardingContext> {
  const m = await membershipOf(db, owner);
  const profile = await db.onboardingProfile.findUnique({ where: { organizationId_userId: { organizationId: owner.organizationId, userId: owner.userId } } });
  const track = profile?.trackId ? await db.track.findUnique({ where: { id: profile.trackId }, select: { key: true } }) : null;
  const placement = profile?.trackId
    ? await db.placementResult.findFirst({ where: { userId: owner.userId, trackId: profile.trackId }, orderBy: { createdAt: "desc" }, select: { level: true } })
    : null;
  return {
    role: roleFor(m.organization.type, m.role),
    orgType: m.organization.type,
    membershipRole: m.role,
    organizationName: m.organization.name,
    profile,
    trackKey: track?.key ?? null,
    hasPlacementForTrack: Boolean(placement),
    latestPlacementLevel: placement?.level ?? null,
  };
}

export function snapshotOf(ctx: OnboardingContext): OnboardingSnapshot {
  return {
    role: ctx.role,
    hasPersonalPlan: Boolean(ctx.profile?.personalPlan),
    hasTeamSize: Boolean(ctx.profile?.teamSizeBand),
    startPath: ctx.profile?.startPath ?? null,
    hasTrack: Boolean(ctx.profile?.trackId),
    hasPlacementForTrack: ctx.hasPlacementForTrack,
  };
}

export const nextStepFor = (ctx: OnboardingContext) => nextOpenStep(snapshotOf(ctx));

async function upsertProfile(db: PrismaClient, owner: Owner, data: Partial<Pick<OnboardingProfile, "personalPlan" | "friendEmail" | "studentEmail" | "teamSizeBand" | "startPath" | "trackId" | "completedAt">>) {
  return db.onboardingProfile.upsert({
    where: { organizationId_userId: { organizationId: owner.organizationId, userId: owner.userId } },
    create: { ...owner, ...data },
    update: data,
  });
}

// ── Answers ───────────────────────────────────────────────────────────────

/** Privat: membership choice (+ friend's email or study mail). Only the OWNER of a PERSONAL org. */
export async function savePersonalPlan(
  db: PrismaClient,
  owner: Owner,
  input: { plan: PersonalPlanChoiceKey; friendEmail?: string | null; studentEmail?: string | null },
): Promise<void> {
  const m = await membershipOf(db, owner);
  if (m.organization.type !== "PERSONAL" || m.role !== "OWNER") throw new OnboardingError("WRONG_ORG_TYPE");
  if (input.plan === "FRIEND" && !input.friendEmail) throw new OnboardingError("INVALID");
  if (input.plan === "STUDENT" && !input.studentEmail) throw new OnboardingError("INVALID");
  await upsertProfile(db, owner, {
    personalPlan: input.plan,
    friendEmail: input.plan === "FRIEND" ? (input.friendEmail ?? null) : null,
    studentEmail: input.plan === "STUDENT" ? (input.studentEmail ?? null) : null,
  });
}

/**
 * Erhverv: company name + team size. Creates the BUSINESS org (the user becomes OWNER, session switches to it)
 * the first time; if the active org is already a business the user administers, only the answers are updated.
 */
export async function saveCompany(
  db: PrismaClient,
  args: { userId: string; sessionId: string; activeOrganizationId: string | null; name: string; band: TeamSizeBandKey },
): Promise<{ organizationId: string }> {
  const { name } = businessOrgInput.parse({ name: args.name });
  if (args.activeOrganizationId) {
    const m = await db.membership.findFirst({
      where: { userId: args.userId, organizationId: args.activeOrganizationId, deactivatedAt: null },
      select: { role: true, organization: { select: { type: true, name: true } } },
    });
    if (m?.organization.type === "BUSINESS" && (m.role === "OWNER" || m.role === "ADMIN")) {
      const owner = { userId: args.userId, organizationId: args.activeOrganizationId };
      if (m.role === "OWNER" && m.organization.name !== name) {
        await db.organization.update({ where: { id: owner.organizationId }, data: { name } });
        await writeAudit(db, { action: "ORG_RENAMED", actorUserId: args.userId, organizationId: owner.organizationId, targetType: "organization", targetId: owner.organizationId });
      }
      await upsertProfile(db, owner, { teamSizeBand: args.band });
      return { organizationId: owner.organizationId };
    }
  }
  const org = await createBusinessOrg(db, { userId: args.userId, sessionId: args.sessionId, name });
  await upsertProfile(db, { userId: args.userId, organizationId: org.id }, { teamSizeBand: args.band });
  return { organizationId: org.id };
}

export async function saveStartPath(db: PrismaClient, owner: Owner, path: StartPathKey): Promise<void> {
  await membershipOf(db, owner);
  await upsertProfile(db, owner, { startPath: path });
}

/** Tool choice: stored on the profile and as an active TrackEnrollment (keeps an existing Copilot tier). */
export async function saveTrack(db: PrismaClient, owner: Owner, trackKey: TrackKey): Promise<{ trackId: string }> {
  await membershipOf(db, owner);
  const track = await db.track.findUnique({ where: { key: trackKey }, select: { id: true, isActive: true } });
  if (!track?.isActive) throw new OnboardingError("TRACK_UNAVAILABLE");
  await db.$transaction(async (tx) => {
    await tx.onboardingProfile.upsert({
      where: { organizationId_userId: { organizationId: owner.organizationId, userId: owner.userId } },
      create: { ...owner, trackId: track.id },
      update: { trackId: track.id },
    });
    await tx.trackEnrollment.upsert({
      where: { organizationId_userId_trackId: { ...owner, trackId: track.id } },
      create: { ...owner, trackId: track.id, active: true },
      update: { active: true },
    });
  });
  return { trackId: track.id };
}

/** "Din plan er klar" → set once. */
export async function completeOnboarding(db: PrismaClient, owner: Owner): Promise<void> {
  await membershipOf(db, owner);
  await db.onboardingProfile.updateMany({ where: { ...owner, completedAt: null }, data: { completedAt: new Date() } });
}

/** True when an invited employee has not been through the (short) onboarding in this organization yet. */
export async function needsLearnerOnboarding(db: PrismaClient, owner: Owner): Promise<boolean> {
  const m = await db.membership.findFirst({
    where: { userId: owner.userId, organizationId: owner.organizationId, deactivatedAt: null },
    select: { role: true, organization: { select: { type: true } } },
  });
  if (!m || m.organization.type !== "BUSINESS" || m.role !== "LEARNER") return false;
  const profile = await db.onboardingProfile.findUnique({ where: { organizationId_userId: owner }, select: { completedAt: true } });
  return !profile?.completedAt;
}

// ── "Din plan er klar" ────────────────────────────────────────────────────

export interface PlanPreview {
  trackSlug: TrackSlug;
  toolName: string;
  levelName: string;
  lessons: string[];
  firstLessonHref: string;
}

/**
 * The course level to start on: from the latest placement level (1 = first course level) when the test was
 * taken, otherwise the first level. Shows the first three lessons of that level and links the first ready one.
 */
export async function planPreview(db: PrismaClient, ctx: OnboardingContext): Promise<PlanPreview | null> {
  const slug = ctx.trackKey ? slugOfTrack(ctx.trackKey) : null;
  if (!slug) return null;
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      toolName: true,
      levels: {
        orderBy: { sortOrder: "asc" },
        select: {
          name: true,
          modules: {
            orderBy: { sortOrder: "asc" },
            select: { status: true, lessons: { orderBy: { sortOrder: "asc" }, select: { slug: true, title: true, status: true } } },
          },
        },
      },
    },
  });
  if (!course || course.levels.length === 0) return null;
  const fromTest = ctx.profile?.startPath === "PLACEMENT_TEST" && ctx.latestPlacementLevel !== null;
  const index = fromTest ? Math.min(Math.max((ctx.latestPlacementLevel ?? 1) - 1, 0), course.levels.length - 1) : 0;
  const level = course.levels[index] ?? course.levels[0];
  if (!level) return null;
  const lessons = level.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, ready: l.status === "READY" && m.status === "READY" })));
  const first = lessons.find((l) => l.ready);
  return {
    trackSlug: slug,
    toolName: course.toolName,
    levelName: level.name,
    lessons: lessons.slice(0, 3).map((l) => l.title),
    firstLessonHref: first ? `/forloeb/${slug}/${first.slug}` : `/forloeb/${slug}`,
  };
}
