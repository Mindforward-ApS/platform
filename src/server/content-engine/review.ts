import type { PrismaClient } from "@/generated/prisma/client";
import type { ContentConfig } from "./config";
import { autopublishEnabled, pipelineEnabled } from "./flags";
import type { VersionMeta } from "./publish";
import { diffLines, moduleLines, type DiffLine } from "./text-diff";

// Read model for /admin/indhold (GREB_ADMIN only). Content-engine data only — never learners' prompt text.

export interface ReviewItem {
  versionId: string;
  moduleId: string;
  slug: string;
  moduleType: string;
  version: number;
  title: string;
  origin: string;
  createdAt: Date;
  reasons: string[];
  issueUrl: string | null;
  sourceLinks: string[];
  verify: VersionMeta["verify"];
  diff: DiffLine[] | null;
  previewLines: string[];
}

function sourceLinks(content: unknown): string[] {
  const urls = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (k === "url" && typeof val === "string" && /^https:\/\//.test(val)) urls.add(val);
        else walk(val);
      }
    }
  };
  walk(content);
  return [...urls];
}

const asMeta = (json: unknown): VersionMeta => {
  const m = (json ?? {}) as Partial<VersionMeta>;
  return { verify: m.verify ?? null, reviewReasons: Array.isArray(m.reviewReasons) ? m.reviewReasons : [], issueUrl: m.issueUrl ?? null };
};

export async function loadContentAdmin(db: PrismaClient, config: ContentConfig) {
  const [pipelineOn, autopublishOn, sources, inReview, published, runs] = await Promise.all([
    pipelineEnabled(db, config),
    autopublishEnabled(db, config),
    db.contentSource.findMany({ orderBy: { key: "asc" }, include: { track: { select: { key: true } } } }),
    db.moduleVersion.findMany({ where: { status: "IN_REVIEW" }, orderBy: { createdAt: "asc" }, take: 50, include: { module: { select: { slug: true, type: true, publishedVersion: { select: { content: true, version: true } } } }, changeEvent: { select: { githubIssueUrl: true } } } }),
    db.module.findMany({
      where: { publishedVersionId: { not: null } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, slug: true, type: true, isStale: true, retiringAt: true, publishedVersion: { select: { id: true, version: true, title: true, origin: true, publishedAt: true } } },
    }),
    db.pipelineRun.findMany({ orderBy: { startedAt: "desc" }, take: 20, include: { source: { select: { key: true } } } }),
  ]);

  const queue: ReviewItem[] = await Promise.all(
    inReview.map(async (v) => {
      const meta = asMeta(v.verifyReport);
      const previous =
        v.module.publishedVersion ??
        (await db.moduleVersion.findFirst({ where: { moduleId: v.moduleId, version: { lt: v.version } }, orderBy: { version: "desc" }, select: { content: true, version: true } }));
      return {
        versionId: v.id,
        moduleId: v.moduleId,
        slug: v.module.slug,
        moduleType: v.module.type,
        version: v.version,
        title: v.title,
        origin: v.origin,
        createdAt: v.createdAt,
        reasons: meta.reviewReasons,
        issueUrl: meta.issueUrl ?? v.changeEvent?.githubIssueUrl ?? null,
        sourceLinks: sourceLinks(v.content),
        verify: meta.verify,
        diff: previous ? diffLines(moduleLines(previous.content), moduleLines(v.content)) : null,
        previewLines: moduleLines(v.content),
      };
    }),
  );

  return {
    switches: { pipeline: pipelineOn, autopublish: autopublishOn },
    sources: sources.map((s) => ({ id: s.id, key: s.key, track: s.track.key, url: s.url, status: s.status, enabled: s.enabled, lastSuccessAt: s.lastSuccessAt })),
    queue,
    published: published.map((m) => ({ moduleId: m.id, slug: m.slug, type: m.type, isStale: m.isStale, retiringAt: m.retiringAt, version: m.publishedVersion! })),
    runs: runs.map((r) => ({
      id: r.id,
      kind: r.kind,
      source: r.source?.key ?? null,
      status: r.status,
      startedAt: r.startedAt,
      tokensIn: r.tokensIn,
      tokensOut: r.tokensOut,
      costDkk: Number(r.costDkk),
      error: r.error,
      steps: Array.isArray(r.steps) ? (r.steps as { step?: string; status?: string; changeEventId?: string }[]) : [],
      modelIds: r.modelIds,
      promptVersions: r.promptVersions,
    })),
  };
}

export type ContentAdminData = Awaited<ReturnType<typeof loadContentAdmin>>;
