import "server-only";
import { z } from "zod";
import type { PlacementResult, Prisma, PrismaClient } from "@/generated/prisma/client";
import { placementAnswersSchema, type PlacementAnswers, type PlacementTest } from "@/lib/schemas/placement";
import { getCatalog, getPlacementTestByVersion, testVersionOf, type PlacementTrack } from "./content";
import { catalogToPlanModules, generatePlan, type Plan, type PlanModule } from "./plan-generator";
import { hashAnonymousToken, newAnonymousToken } from "./tokens";

// Persistence around the pure scoring/plan code: PlacementResult rows, claim after signup, Assignments
// (source PLACEMENT) + TrackEnrollment. Every org-owned query filters on organizationId.

type Db = PrismaClient | Prisma.TransactionClient;

const contentLevel = z.object({ level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }).loose();

/**
 * Modules for the generator: the curriculum catalog plus every published DB module (DB wins for the fields it has).
 * `available` maps slug → Module.id for modules that can actually be assigned today.
 */
export async function planModules(db: Db): Promise<{ modules: PlanModule[]; available: Map<string, string> }> {
  const catalog = catalogToPlanModules(getCatalog());
  const rows = await db.module.findMany({
    where: { publishedVersionId: { not: null } },
    select: {
      id: true,
      slug: true,
      type: true,
      jobRole: true,
      requiredLicense: true,
      sortOrder: true,
      tracks: { select: { track: { select: { key: true } } } },
      publishedVersion: { select: { title: true, estimatedMinutes: true, content: true } },
    },
  });
  const bySlug = new Map(catalog.map((m) => [m.id, m]));
  const available = new Map<string, string>();
  for (const r of rows) {
    if (!r.publishedVersion) continue;
    available.set(r.slug, r.id);
    const known = bySlug.get(r.slug);
    const level = contentLevel.safeParse(r.publishedVersion.content);
    bySlug.set(r.slug, {
      id: r.slug,
      title: r.publishedVersion.title,
      level: level.success ? level.data.level : (known?.level ?? 1),
      type: r.type,
      tracks: r.tracks.map((t) => t.track.key),
      requiredLicense: r.requiredLicense,
      roles: r.jobRole ? [r.jobRole] : (known?.roles ?? []),
      minutes: r.publishedVersion.estimatedMinutes,
      sortOrder: known?.sortOrder ?? catalog.length + r.sortOrder,
    });
  }
  return { modules: [...bySlug.values()], available };
}

export function planFor(test: PlacementTest, answers: PlacementAnswers, modules: PlanModule[]): Plan {
  return generatePlan({ test, answers, jobRole: answers.profile.jobRole, licenseTier: answers.profile.licenseTier, modules });
}

export interface SaveInput {
  test: PlacementTest;
  answers: PlacementAnswers;
  durationSeconds: number;
  /** Logged-in learner: saved directly and the plan is applied to the active organization. */
  user?: { id: string; organizationId: string | null };
}

export async function savePlacement(db: PrismaClient, input: SaveInput): Promise<{ id: string; anonymousToken: string | null }> {
  const answers = placementAnswersSchema.parse(input.answers);
  const track = await db.track.findUnique({ where: { key: input.test.track }, select: { id: true, isActive: true } });
  if (!track?.isActive) throw new Error(`track ${input.test.track} is not active`);

  const { modules } = await planModules(db);
  const plan = planFor(input.test, answers, modules);
  const anonymous = input.user ? null : newAnonymousToken();

  return db.$transaction(async (tx) => {
    const result = await tx.placementResult.create({
      data: {
        userId: input.user?.id ?? null,
        organizationId: input.user?.organizationId ?? null,
        anonymousTokenHash: anonymous?.hash ?? null,
        trackId: track.id,
        licenseTier: input.test.track === "COPILOT" ? (answers.profile.licenseTier ?? "UNKNOWN") : null,
        jobRole: answers.profile.jobRole,
        testVersion: testVersionOf(input.test),
        answers: answers as unknown as Prisma.InputJsonValue,
        scorePct: plan.score.scorePct,
        level: plan.score.level,
        recommendedModuleIds: plan.items.map((i) => i.moduleId),
        durationSeconds: Math.round(input.durationSeconds),
      },
    });
    if (input.user?.organizationId) await applyPlacementPlan(tx, result, input.user.id, input.user.organizationId);
    return { id: result.id, anonymousToken: anonymous?.token ?? null };
  });
}

/** Assignments (source PLACEMENT, plan order) for modules that exist + TrackEnrollment(licenseTier, level). */
export async function applyPlacementPlan(db: Db, result: PlacementResult, userId: string, organizationId: string): Promise<number> {
  const { available } = await planModules(db);
  const moduleIds = result.recommendedModuleIds.flatMap((slug) => {
    const id = available.get(slug);
    return id ? [id] : [];
  });
  for (const [sortOrder, moduleId] of moduleIds.entries()) {
    const existing = await db.assignment.findUnique({ where: { organizationId_userId_moduleId: { organizationId, userId, moduleId } } });
    if (!existing) await db.assignment.create({ data: { organizationId, userId, moduleId, source: "PLACEMENT", sortOrder } });
    else if (existing.source === "PLACEMENT") await db.assignment.update({ where: { id: existing.id }, data: { sortOrder } });
  }
  await db.trackEnrollment.upsert({
    where: { organizationId_userId_trackId: { organizationId, userId, trackId: result.trackId } },
    create: { organizationId, userId, trackId: result.trackId, licenseTier: result.licenseTier, level: result.level, active: true },
    update: { licenseTier: result.licenseTier, level: result.level, active: true },
  });
  return moduleIds.length;
}

/** After signup/login: move the anonymous result to the user and create the plan. Single use. */
export async function claimPlacement(db: PrismaClient, args: { token: string; userId: string; organizationId: string }): Promise<string | null> {
  const hash = hashAnonymousToken(args.token);
  return db.$transaction(async (tx) => {
    const result = await tx.placementResult.findUnique({ where: { anonymousTokenHash: hash } });
    if (!result) return null;
    const claimed = await tx.placementResult.updateMany({
      where: { id: result.id, userId: null, claimedAt: null },
      data: { userId: args.userId, organizationId: args.organizationId, claimedAt: new Date(), anonymousTokenHash: null },
    });
    if (claimed.count === 0) return null;
    await applyPlacementPlan(tx, { ...result, userId: args.userId, organizationId: args.organizationId }, args.userId, args.organizationId);
    return result.id;
  });
}

export async function findAnonymousResult(db: Db, token: string): Promise<PlacementResult | null> {
  return db.placementResult.findUnique({ where: { anonymousTokenHash: hashAnonymousToken(token) } });
}

/** Latest result of a learner in an organization (org-scoped). */
export async function latestUserResult(db: Db, userId: string, organizationId: string | null): Promise<PlacementResult | null> {
  return db.placementResult.findFirst({ where: { userId, organizationId }, orderBy: { createdAt: "desc" } });
}

export interface ResultView {
  result: PlacementResult;
  test: PlacementTest;
  track: PlacementTrack;
  plan: Plan;
  available: Set<string>;
}

/** Re-score from the stored option ids against the exact test version that was taken. */
export async function resultView(db: Db, result: PlacementResult): Promise<ResultView | null> {
  const test = getPlacementTestByVersion(result.testVersion);
  const answers = placementAnswersSchema.safeParse(result.answers);
  if (!test || !answers.success) return null;
  const { modules, available } = await planModules(db);
  return { result, test, track: test.track as PlacementTrack, plan: planFor(test, answers.data, modules), available: new Set(available.keys()) };
}
