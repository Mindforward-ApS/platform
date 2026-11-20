import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Actor, PlayableOptions } from "./attempts";

// Module list for /moduler: modules on the learner's active tracks (TrackEnrollment in the active org), or on all
// active tracks when the learner has not chosen any yet (placement comes in M5).

export interface CatalogEntry {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  level: number;
  /** Number of steps in the module (display only). */
  steps: number;
  status: "NONE" | "ASSIGNED" | "IN_PROGRESS" | "PASSED" | "REMOVED";
  bestScorePct: number | null;
}

export async function listModulesForLearner(db: PrismaClient, actor: Actor, opts: PlayableOptions): Promise<CatalogEntry[]> {
  const enrollments = await db.trackEnrollment.findMany({
    where: { userId: actor.userId, organizationId: actor.organizationId, active: true, track: { isActive: true } },
    select: { trackId: true },
  });
  const trackIds = enrollments.length > 0 ? enrollments.map((e) => e.trackId) : (await db.track.findMany({ where: { isActive: true }, select: { id: true } })).map((t) => t.id);
  const statuses = opts.allowUnpublished ? (["PUBLISHED", "IN_REVIEW"] as const) : (["PUBLISHED"] as const);

  const modules = await db.module.findMany({
    where: { tracks: { some: { trackId: { in: trackIds } } }, versions: { some: { status: { in: [...statuses] } } } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      publishedVersion: { select: { status: true, title: true, estimatedMinutes: true, content: true } },
      versions: { where: { status: { in: [...statuses] } }, orderBy: { version: "desc" }, take: 1, select: { title: true, estimatedMinutes: true, content: true } },
      assignments: { where: { userId: actor.userId, organizationId: actor.organizationId }, select: { status: true, bestScorePct: true } },
    },
  });

  return modules.flatMap((m) => {
    const version = m.publishedVersion?.status === "PUBLISHED" ? m.publishedVersion : m.versions[0];
    if (!version) return [];
    const content = version.content as { summary?: unknown; level?: unknown; steps?: unknown };
    const assignment = m.assignments[0];
    return [
      {
        slug: m.slug,
        title: version.title,
        summary: typeof content.summary === "string" ? content.summary : "",
        minutes: version.estimatedMinutes,
        level: typeof content.level === "number" ? content.level : 1,
        steps: Array.isArray(content.steps) ? content.steps.length : 0,
        status: assignment?.status ?? "NONE",
        bestScorePct: assignment?.bestScorePct === null || assignment?.bestScorePct === undefined ? null : Number(assignment.bestScorePct),
      },
    ];
  });
}
