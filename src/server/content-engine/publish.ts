import type { LicenseTier, ModuleVersionStatus, Prisma, PrismaClient } from "@/generated/prisma/client";
import { maxPoints, moduleSchema, type ModuleContent } from "@/lib/schemas/module";
import { writeAudit } from "@/server/audit/log";
import { hashContent } from "@/server/content/load-modules";
import type { Classification } from "./prompts/content-classify.v1";
import type { VerifyReport } from "./verify";

// Publication policy (docs/06 § 8), compare-and-set publishing, approve/reject and rollback (§ 11).
// HARD RULE (CLAUDE.md "ALDRIG"): never auto-publish CORE modules or modules that need new sandbox UI.

export type ReviewReason = "CORE" | "UI" | "VERIFY_FAILED" | "AUTOPUBLISH_OFF" | "SOURCE_NOT_ALLOWED" | "TRACK_INACTIVE" | "QUOTA" | "DEPRECATION" | "CONFLICT" | "MANUAL";

export interface PolicyInput {
  moduleType: string;
  stepTypes: string[];
  classification: Pick<Classification, "needsNewSandboxUi" | "affectsCore">;
  verifyPassed: boolean;
  autopublishEnabled: boolean;
  sourceAutoPublishAllowed: boolean;
  trackActive: boolean;
  quotaReached: boolean;
}

export type PolicyDecision = { action: "AUTO_PUBLISH" } | { action: "IN_REVIEW"; reasons: ReviewReason[]; createIssue: boolean };

export function decidePublication(p: PolicyInput): PolicyDecision {
  const reasons: ReviewReason[] = [];
  const onlyReadQuiz = p.stepTypes.length > 0 && p.stepTypes.every((t) => t === "READ" || t === "QUIZ");
  if (p.classification.affectsCore || p.moduleType === "CORE") reasons.push("CORE");
  if (p.classification.needsNewSandboxUi || !onlyReadQuiz) reasons.push("UI");
  if (p.moduleType !== "NEWS" && !reasons.includes("CORE")) reasons.push("MANUAL");
  if (!p.verifyPassed) reasons.push("VERIFY_FAILED");
  if (!p.autopublishEnabled) reasons.push("AUTOPUBLISH_OFF");
  if (!p.sourceAutoPublishAllowed) reasons.push("SOURCE_NOT_ALLOWED");
  if (!p.trackActive) reasons.push("TRACK_INACTIVE");
  if (p.quotaReached) reasons.push("QUOTA");
  if (reasons.length === 0) return { action: "AUTO_PUBLISH" };
  return { action: "IN_REVIEW", reasons, createIssue: reasons.includes("CORE") || reasons.includes("UI") };
}

/** Stored in ModuleVersion.verifyReport: the verification report plus why the version waits for review. */
export interface VersionMeta {
  verify: VerifyReport | null;
  reviewReasons: ReviewReason[];
  issueUrl?: string | null;
  rejectReason?: string;
}

export class PublishConflictError extends Error {
  constructor(message = "module pointer changed concurrently") {
    super(message);
    this.name = "PublishConflictError";
  }
}

export class AutoPublishForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutoPublishForbiddenError";
  }
}

const TIER: Record<string, LicenseTier> = { COPILOT_CHAT: "COPILOT_CHAT", COPILOT_M365: "COPILOT_M365", unknown: "UNKNOWN" };
const tierOf = (c: { requiresTier?: string | null }) => (c.requiresTier ? (TIER[c.requiresTier] ?? null) : null);

function searchTextOf(m: ModuleContent): string {
  const parts: string[] = [m.title, m.summary, ...m.objectives];
  for (const s of m.steps) {
    parts.push(s.title);
    if (s.type === "READ") parts.push(s.body);
    if (s.type === "QUIZ") parts.push(s.question);
  }
  return parts.join("\n");
}

/** Creates the Module (first time) and a new ModuleVersion. Invalid content is stored as-is for review (maxPoints 0). */
export async function saveModuleVersion(
  db: PrismaClient,
  input: {
    slug: string;
    track: string;
    content: unknown;
    status: Extract<ModuleVersionStatus, "DRAFT" | "IN_REVIEW" | "ARCHIVED">;
    origin: "AUTO" | "MANUAL";
    changeEventId: string | null;
    pipelineRunId: string | null;
    draftAttempt: number;
    promptVersions: Prisma.InputJsonValue;
    modelIds: Prisma.InputJsonValue;
    meta: VersionMeta;
  },
) {
  const parsed = moduleSchema.safeParse(input.content);
  const valid = parsed.success ? parsed.data : null;
  const raw = (input.content ?? {}) as Partial<ModuleContent>;
  return db.$transaction(async (tx) => {
    const track = await tx.track.findUniqueOrThrow({ where: { key: input.track as "CHATGPT" } });
    const mod = await tx.module.upsert({ where: { slug: input.slug }, create: { slug: input.slug, type: valid?.type ?? "NEWS", requiredLicense: valid ? tierOf(valid) : null }, update: {} });
    await tx.moduleTrack.upsert({ where: { moduleId_trackId: { moduleId: mod.id, trackId: track.id } }, create: { moduleId: mod.id, trackId: track.id }, update: {} });
    const last = await tx.moduleVersion.findFirst({ where: { moduleId: mod.id }, orderBy: { version: "desc" }, select: { version: true } });
    const version = (last?.version ?? 0) + 1;
    const content = valid ? { ...valid, version } : { ...(raw as object), version };
    return tx.moduleVersion.create({
      data: {
        moduleId: mod.id,
        version,
        status: input.status,
        origin: input.origin,
        schemaVersion: "1",
        title: String(raw.title ?? input.slug).slice(0, 200),
        content: content as Prisma.InputJsonValue,
        maxPoints: valid ? maxPoints(valid) : 0,
        estimatedMinutes: valid?.minutes ?? 5,
        requiredLicense: valid ? tierOf(valid) : null,
        featureRefs: valid?.featureRefs ?? [],
        searchText: valid ? searchTextOf(valid) : String(raw.title ?? ""),
        contentHash: hashContent(content),
        changeEventId: input.changeEventId,
        pipelineRunId: input.pipelineRunId,
        draftAttempt: input.draftAttempt,
        promptVersions: input.promptVersions,
        modelIds: input.modelIds,
        verifyReport: input.meta as unknown as Prisma.InputJsonValue,
        archivedAt: input.status === "ARCHIVED" ? new Date() : null,
      },
    });
  });
}

/**
 * Publishes a version: compare-and-set on Module.publishedVersionId (expected = current pointer), status PUBLISHED,
 * AuditLog MODULE_PUBLISH. `auto` = content engine without a human → only NEWS with READ/QUIZ is allowed.
 */
export async function publishVersion(db: PrismaClient, versionId: string, opts: { actorUserId: string | null; auto: boolean; expectedPublishedVersionId?: string | null }) {
  const v = await db.moduleVersion.findUniqueOrThrow({ where: { id: versionId }, include: { module: true } });
  const content = moduleSchema.safeParse(v.content);
  if (!content.success) throw new AutoPublishForbiddenError("module content is invalid");
  if (opts.auto) {
    if (v.module.type !== "NEWS" || content.data.type !== "NEWS") throw new AutoPublishForbiddenError("only NEWS modules may be auto-published");
    if (content.data.steps.some((s) => s.type !== "READ" && s.type !== "QUIZ")) throw new AutoPublishForbiddenError("auto-published modules may only contain READ and QUIZ");
  }
  if (v.status === "PUBLISHED" && v.module.publishedVersionId === v.id) return v;
  const expected = opts.expectedPublishedVersionId === undefined ? v.module.publishedVersionId : opts.expectedPublishedVersionId;
  const now = new Date();
  return db.$transaction(async (tx) => {
    const cas = await tx.module.updateMany({ where: { id: v.moduleId, publishedVersionId: expected }, data: { publishedVersionId: v.id, requiredLicense: v.requiredLicense, isStale: false } });
    if (cas.count !== 1) throw new PublishConflictError();
    const updated = await tx.moduleVersion.update({ where: { id: v.id }, data: { status: "PUBLISHED", publishedAt: now, publishedById: opts.actorUserId, archivedAt: null } });
    if (v.changeEventId) await tx.changeEvent.update({ where: { id: v.changeEventId }, data: { status: "PUBLISHED" } });
    await writeAudit(tx, {
      action: "MODULE_PUBLISH",
      actorType: opts.actorUserId ? "USER" : "CONTENT_ENGINE",
      actorUserId: opts.actorUserId,
      targetType: "ModuleVersion",
      targetId: v.id,
      metadata: { moduleId: v.moduleId, slug: v.module.slug, version: v.version, previousVersionId: expected ?? null, auto: opts.auto },
    });
    return updated;
  });
}

export async function rejectVersion(db: PrismaClient, versionId: string, opts: { actorUserId: string; reason?: string }) {
  const v = await db.moduleVersion.findUniqueOrThrow({ where: { id: versionId }, include: { module: { select: { slug: true } } } });
  if (v.status !== "IN_REVIEW" && v.status !== "DRAFT") throw new PublishConflictError("only drafts in review can be rejected");
  const meta = { ...((v.verifyReport ?? {}) as object), rejectReason: opts.reason ?? "" };
  await db.$transaction(async (tx) => {
    await tx.moduleVersion.update({ where: { id: v.id }, data: { status: "ARCHIVED", archivedAt: new Date(), verifyReport: meta as Prisma.InputJsonValue } });
    if (v.changeEventId) await tx.changeEvent.update({ where: { id: v.changeEventId }, data: { status: "SKIPPED" } });
    await writeAudit(tx, { action: "MODULE_REJECT", actorUserId: opts.actorUserId, targetType: "ModuleVersion", targetId: v.id, metadata: { slug: v.module.slug, version: v.version, reason: (opts.reason ?? "").slice(0, 500) } });
  });
}

/**
 * Rollback (docs/06 § 11): pointer → the previous PUBLISHED version; the current one → ARCHIVED. Without a previous
 * version the module is unpublished. Attempts keep referencing their ModuleVersion, so old results stay valid.
 */
export async function rollbackModule(db: PrismaClient, moduleId: string, opts: { actorUserId: string | null }) {
  const mod = await db.module.findUniqueOrThrow({ where: { id: moduleId }, include: { publishedVersion: true } });
  const current = mod.publishedVersion;
  if (!current) throw new PublishConflictError("module is not published");
  const previous = await db.moduleVersion.findFirst({
    where: { moduleId, status: "PUBLISHED", id: { not: current.id }, version: { lt: current.version } },
    orderBy: { version: "desc" },
  });
  await db.$transaction(async (tx) => {
    const cas = await tx.module.updateMany({ where: { id: moduleId, publishedVersionId: current.id }, data: { publishedVersionId: previous?.id ?? null, requiredLicense: previous?.requiredLicense ?? mod.requiredLicense } });
    if (cas.count !== 1) throw new PublishConflictError();
    await tx.moduleVersion.update({ where: { id: current.id }, data: { status: "ARCHIVED", archivedAt: new Date() } });
    await writeAudit(tx, {
      action: previous ? "MODULE_ROLLBACK" : "MODULE_UNPUBLISH",
      actorType: opts.actorUserId ? "USER" : "SYSTEM",
      actorUserId: opts.actorUserId,
      targetType: "Module",
      targetId: moduleId,
      metadata: { slug: mod.slug, fromVersionId: current.id, toVersionId: previous?.id ?? null },
    });
  });
  return { restoredVersionId: previous?.id ?? null };
}

/** Bulk rollback: every AUTO version published by this PipelineRun that is still live. */
export async function rollbackPipelineRun(db: PrismaClient, pipelineRunId: string, opts: { actorUserId: string | null }) {
  const live = await db.moduleVersion.findMany({ where: { pipelineRunId, origin: "AUTO", status: "PUBLISHED", publishedIn: { isNot: null } }, select: { moduleId: true } });
  for (const v of live) await rollbackModule(db, v.moduleId, opts);
  return live.length;
}
