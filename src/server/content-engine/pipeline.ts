import type { ContentSource, ParserType, PipelineRunStatus, Prisma, PrismaClient, SnapshotOrigin, Track } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { logger } from "@/server/observability/logger";
import { contentBudget } from "./budget";
import { classifyEntry, routeClassification } from "./classify";
import { assertIndependentVerifier, ContentConfigError, type ContentConfig } from "./config";
import { diffEntries, recordChangeEvents } from "./diff";
import { draftModule, type DraftContext } from "./draft";
import { fetchSource, retryDelayMs, RETRY_SCHEDULE_MS, type FetchDeps } from "./fetch";
import { autopublishEnabled, pipelineEnabled } from "./flags";
import { buildIssue } from "./github";
import { deprecatedFeatureIds, findAffectedModules, mapFeatureNames, retireDateFor } from "./impact";
import type { CallContentModel, CreateIssue } from "./model";
import { copenhagenDate, type ParsedEntry } from "./normalize";
import { parseSource } from "./parsers";
import { contentClassifyV1, classificationSchema, type Classification } from "./prompts/content-classify.v1";
import { contentDraftV1 } from "./prompts/content-draft.v1";
import { contentVerifyV1 } from "./prompts/content-verify.v1";
import { decidePublication, publishVersion, PublishConflictError, saveModuleVersion, type ReviewReason, type VersionMeta } from "./publish";
import { finishRun, logModelCall, logStep, logVerifyReport, markRunPartial, startRun } from "./runlog";
import { storeSnapshot, snapshotEntries } from "./snapshot";
import { sourceConfig, type ParserConfig } from "./sources";
import { feedbackFrom, verifyModule, type VerifyReport } from "./verify";

// Orchestration (docs/06 § 0). Every function is idempotent and safe to re-run inside Inngest step.run:
// unique keys on PipelineRun / SourceSnapshot / ChangeEvent / ModuleVersion and status guards on ChangeEvent.

export interface PipelineDeps {
  db: PrismaClient;
  config: ContentConfig;
  callContentModel: CallContentModel;
  createIssue: CreateIssue;
  fetch?: Pick<FetchDeps, "fetchImpl" | "browserFetch" | "robotsCache">;
  now?: () => Date;
}

const nowOf = (deps: PipelineDeps) => deps.now?.() ?? new Date();
export const MAX_FETCH_ATTEMPTS = RETRY_SCHEDULE_MS.length + 1;

/** Earliest UTC instant of the Copenhagen calendar day of `now`. */
export function copenhagenDayStart(now: Date): Date {
  const day = copenhagenDate(now);
  const midnightUtc = Date.parse(`${day}T00:00:00Z`);
  for (const h of [2, 1]) {
    const candidate = new Date(midnightUtc - h * 3_600_000);
    if (copenhagenDate(candidate) === day) return candidate;
  }
  return new Date(midnightUtc);
}

// ── Source run ────────────────────────────────────────────────────────────

export async function beginSourceRun(deps: PipelineDeps, sourceId: string, opts: { manual?: boolean } = {}) {
  const now = nowOf(deps);
  const key = opts.manual ? `${sourceId}:manual:${now.toISOString().slice(0, 13)}` : `${sourceId}:${copenhagenDate(now)}`;
  return startRun(deps.db, { kind: opts.manual ? "MANUAL" : "DAILY_SOURCE", idempotencyKey: key, sourceId });
}

export type AttemptOutcome = { outcome: "DONE"; status: PipelineRunStatus; changeEventIds: string[] } | { outcome: "RETRY"; delayMs: number };

const done = (status: PipelineRunStatus, changeEventIds: string[] = []): AttemptOutcome => ({ outcome: "DONE", status, changeEventIds });

async function end(deps: PipelineDeps, runId: string, status: PipelineRunStatus, error?: string): Promise<AttemptOutcome> {
  await finishRun(deps.db, runId, status, error);
  return done(status);
}

/** One fetch attempt (+ snapshot + diff). The caller sleeps `delayMs` between attempts (Inngest step.sleep). */
export async function sourceRunAttempt(deps: PipelineDeps, runId: string, attempt: number): Promise<AttemptOutcome> {
  const { db } = deps;
  const run = await db.pipelineRun.findUniqueOrThrow({ where: { id: runId }, include: { source: { include: { track: true } } } });
  if (run.status !== "RUNNING") {
    const ids = (await db.changeEvent.findMany({ where: { pipelineRunId: run.id, status: "NEW" }, select: { id: true } })).map((r) => r.id);
    return done(run.status, ids);
  }
  const source = run.source;
  if (!source) return end(deps, run.id, "FAILED", "source missing");
  if (!source.enabled) {
    await logStep(db, run.id, { step: "fetch", status: "skipped", detail: { reason: "source disabled" } });
    return end(deps, run.id, "SKIPPED_KILL_SWITCH", "source disabled");
  }
  const cfg = sourceConfig(source.key);
  if (!cfg) return end(deps, run.id, "FAILED", `no parser config for ${source.key} in content/sources.json`);

  const now = nowOf(deps);
  const result = await fetchSource(
    { url: source.url, etag: source.etag, lastModified: source.lastModified, fetchMode: source.fetchMode },
    { userAgent: deps.config.userAgent, ...deps.fetch, now: () => now.getTime() },
  );
  await db.contentSource.update({ where: { id: source.id }, data: { lastFetchedAt: now } });
  const detail = { attempt, kind: result.kind, ...("status" in result ? { httpStatus: result.status } : {}), ...("reason" in result ? { reason: result.reason } : {}) };
  await logStep(db, run.id, { step: "fetch", status: result.kind === "OK" || result.kind === "NOT_MODIFIED" ? "ok" : "failed", detail });

  switch (result.kind) {
    case "NOT_MODIFIED":
      await db.contentSource.update({ where: { id: source.id }, data: { lastSuccessAt: now, status: "ACTIVE" } });
      return end(deps, run.id, "NO_CHANGE");
    case "RETRY":
      if (attempt + 1 < MAX_FETCH_ATTEMPTS) return { outcome: "RETRY", delayMs: retryDelayMs(attempt, result.retryAfterMs) };
      logger.error("content.source_failed", { source: source.key, reason: result.reason });
      return end(deps, run.id, "FAILED", result.reason);
    case "FAILED":
      logger.error("content.source_failed", { source: source.key, reason: result.reason });
      return end(deps, run.id, "FAILED", result.reason);
    case "ROBOTS_DISALLOWED":
      await db.contentSource.update({ where: { id: source.id }, data: { status: "MANUAL_ONLY" } });
      logger.error("content.source_robots_disallowed", { source: source.key });
      return end(deps, run.id, "FAILED", result.reason);
    case "CHALLENGE":
      await db.contentSource.update({ where: { id: source.id }, data: { status: "DEGRADED" } });
      logger.error("content.source_degraded", { source: source.key, status: result.status });
      return end(deps, run.id, "FAILED", result.reason);
    case "OK":
      return ingestBody(deps, run.id, source, {
        body: result.body,
        httpStatus: result.status,
        etag: result.etag,
        lastModified: result.lastModified,
        origin: result.origin,
        parserType: source.parserType,
        parser: cfg.parser,
      });
  }
}

async function ingestBody(
  deps: PipelineDeps,
  runId: string,
  source: ContentSource & { track: Track },
  input: { body: Buffer; httpStatus: number; etag: string | null; lastModified: string | null; origin: SnapshotOrigin; parserType: ParserType; parser: ParserConfig },
): Promise<AttemptOutcome> {
  const { db } = deps;
  const now = nowOf(deps);
  let entries: ParsedEntry[];
  try {
    entries = parseSource(input.parserType, input.body.toString("utf8"), input.parser, source.url);
  } catch (err) {
    logger.error("content.parse_failed", { source: source.key, err });
    return end(deps, runId, "FAILED", `parse failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
  if (entries.length === 0) {
    logger.error("content.parser_zero_entries", { source: source.key });
    await logStep(db, runId, { step: "parse", status: "failed", detail: { entries: 0 } });
    return end(deps, runId, "FAILED", "parser returned 0 entries (source structure changed?)");
  }
  const snap = await storeSnapshot(db, {
    sourceId: source.id,
    fetchedAt: now,
    httpStatus: input.httpStatus,
    etag: input.etag,
    origin: input.origin,
    parserVersion: String(input.parser.version),
    raw: input.body,
    entries,
  });
  await db.contentSource.update({
    where: { id: source.id },
    data: { lastSuccessAt: now, status: "ACTIVE", ...(input.origin === "FETCH" ? { etag: input.etag, lastModified: input.lastModified } : {}) },
  });
  await logStep(db, runId, { step: "snapshot", status: "ok", detail: { entries: entries.length, contentHash: snap.contentHash, unchanged: snap.unchanged } });
  if (snap.unchanged) return end(deps, runId, "NO_CHANGE");

  const diff = diffEntries(snap.previousEntries, entries, { now, maxAgeDays: deps.config.maxEntryAgeDays, anomalyThreshold: deps.config.anomalyNewEntries });
  const ids = await recordChangeEvents(db, { sourceId: source.id, snapshotId: snap.snapshotId, pipelineRunId: runId, diff });
  await logStep(db, runId, {
    step: "diff",
    status: "ok",
    detail: { events: diff.events.length, baseline: snap.previousEntries === null, removedKeys: diff.removedKeys, anomaly: diff.anomaly, ignoredOld: diff.ignoredOld },
  });
  if (diff.anomaly) logger.error("content.diff_anomaly", { source: source.key, added: diff.events.length });

  if (!(await pipelineEnabled(db, deps.config))) {
    await logStep(db, runId, { step: "classify", status: "skipped", detail: { reason: "CONTENT_PIPELINE_ENABLED is off" } });
    await finishRun(db, runId, "SKIPPED_KILL_SWITCH", "pipeline kill switch is off — snapshot stored, nothing classified");
    return done("SKIPPED_KILL_SWITCH");
  }
  await finishRun(db, runId, "SUCCESS");
  return done("SUCCESS", ids);
}

/** Runs a source to completion without Inngest (tests, scripts). `sleep` receives the backoff delays. */
export async function runSource(deps: PipelineDeps, sourceId: string, opts: { manual?: boolean; sleep?: (ms: number) => Promise<void> } = {}) {
  const { run } = await beginSourceRun(deps, sourceId, opts);
  for (let attempt = 0; ; attempt++) {
    const r = await sourceRunAttempt(deps, run.id, attempt);
    if (r.outcome === "DONE") return { runId: run.id, ...r };
    await (opts.sleep ?? (async () => {}))(r.delayMs);
  }
}

/** Admin "Indsæt manuelt" (docs/06 § 2): pasted text becomes a MANUAL_PASTE snapshot; same pipeline from here. */
export async function ingestManualPaste(deps: PipelineDeps, sourceId: string, text: string, actorUserId: string) {
  const { db } = deps;
  const source = await db.contentSource.findUniqueOrThrow({ where: { id: sourceId }, include: { track: true } });
  const { run } = await startRun(db, { kind: "MANUAL", idempotencyKey: `${sourceId}:paste:${nowOf(deps).toISOString()}`, sourceId });
  await writeAudit(db, { action: "CONTENT_MANUAL_PASTE", actorUserId, targetType: "ContentSource", targetId: sourceId, metadata: { key: source.key, chars: text.length } });
  const r = await ingestBody(deps, run.id, source, {
    body: Buffer.from(text, "utf8"),
    httpStatus: 200,
    etag: null,
    lastModified: null,
    origin: "MANUAL_PASTE",
    parserType: "MARKDOWN",
    parser: { version: Number(source.parserVersion) || 1, entryHeadings: [1, 2, 3] },
  });
  return { runId: run.id, ...r };
}

// ── Change processing ─────────────────────────────────────────────────────

export interface ChangeResult {
  changeEventId: string;
  status: string;
  moduleVersionId?: string;
  published?: boolean;
  issueUrl?: string | null;
  reason?: string;
}

async function countToday(db: PrismaClient, now: Date) {
  const since = copenhagenDayStart(now);
  const [classified, drafted] = await Promise.all([
    db.changeEvent.count({ where: { classification: { not: { equals: null } } as Prisma.JsonNullableFilter<"ChangeEvent">, updatedAt: { gte: since } } }),
    db.moduleVersion.count({ where: { origin: "AUTO", changeEventId: { not: null }, createdAt: { gte: since } } }),
  ]);
  return { classified, drafted };
}

async function autoPublishedToday(db: PrismaClient, trackId: string, now: Date) {
  return db.moduleVersion.count({ where: { origin: "AUTO", status: "PUBLISHED", publishedById: null, publishedAt: { gte: copenhagenDayStart(now) }, module: { tracks: { some: { trackId } } } } });
}

async function moduleSlugFor(db: PrismaClient, ce: { id: string; sourceId: string; entryKey: string }, track: string, now: Date) {
  const earlier = await db.moduleVersion.findFirst({ where: { changeEvent: { sourceId: ce.sourceId, entryKey: ce.entryKey } }, select: { module: { select: { slug: true } } }, orderBy: { createdAt: "desc" } });
  return earlier?.module.slug ?? `news-${track.toLowerCase()}-${copenhagenDate(now).replace(/-/g, "")}-${ce.id.slice(-8).toLowerCase().replace(/[^a-z0-9]/g, "0")}`;
}

export async function processChange(deps: PipelineDeps, changeEventId: string): Promise<ChangeResult> {
  const { db, config } = deps;
  const ce = await db.changeEvent.findUniqueOrThrow({ where: { id: changeEventId }, include: { source: { include: { track: true } }, snapshot: { select: { id: true, entries: true, fetchedAt: true } } } });
  if (ce.status !== "NEW") return { changeEventId, status: ce.status, reason: "already processed" };
  const runId = ce.pipelineRunId;
  if (!runId) return { changeEventId, status: ce.status, reason: "no pipeline run" };
  const step = (name: string, status: "ok" | "skipped" | "failed" | "info", detail?: Prisma.InputJsonValue) => logStep(db, runId, { step: name, status, changeEventId, detail });
  const now = nowOf(deps);

  if (!(await pipelineEnabled(db, config))) {
    await step("classify", "skipped", { reason: "kill switch" });
    return { changeEventId, status: "NEW", reason: "kill switch" };
  }
  const budget = await contentBudget(db, config, now);
  if (budget.exceeded) {
    await step("classify", "skipped", { reason: "monthly content budget reached", spentDkk: budget.spentDkk, limitDkk: budget.limitDkk });
    await db.pipelineRun.update({ where: { id: runId }, data: { status: "SKIPPED_BUDGET" } });
    return { changeEventId, status: "NEW", reason: "budget" };
  }
  try {
    assertIndependentVerifier(config);
  } catch (err) {
    const message = err instanceof ContentConfigError ? err.message : "model config error";
    await step("config", "failed", { reason: message });
    await markRunPartial(db, runId, message);
    return { changeEventId, status: "NEW", reason: message };
  }
  const caps = await countToday(db, now);
  if (caps.classified >= config.dailyCaps.classify) {
    await step("classify", "skipped", { reason: "daily classify cap" });
    return { changeEventId, status: "NEW", reason: "daily cap" };
  }

  try {
    // Entry text from the snapshot (the text sourceRefs are checked against).
    const entry = snapshotEntries(ce.snapshot.entries).find((e) => e.entryKey === ce.entryKey);
    if (!entry) throw new Error("entry missing in snapshot");
    const track = ce.source.track;

    // 1. classify
    const cls = await classifyEntry(deps.callContentModel, { sourceKey: ce.source.key, track: track.key, url: entry.url, date: entry.date, title: entry.title, text: entry.text });
    await logModelCall(db, runId, { feature: "CONTENT_CLASSIFY", promptVersion: `${contentClassifyV1.key}.${contentClassifyV1.version}`, modelId: cls.modelId, usage: cls.usage });
    if (!cls.ok || !cls.classification) {
      await db.changeEvent.update({ where: { id: ce.id }, data: { status: "FAILED" } });
      await step("classify", "failed", { error: cls.error ?? "unknown" });
      await markRunPartial(db, runId, `classify failed for ${ce.id}`);
      return { changeEventId, status: "FAILED", reason: cls.error };
    }
    const c = cls.classification;
    await db.changeEvent.update({ where: { id: ce.id }, data: { status: "CLASSIFIED", classification: c as unknown as Prisma.InputJsonValue, changeType: c.changeType, relevance: c.relevance } });
    const route = routeClassification(c, config.relevanceThreshold);
    await step("classify", "ok", { route, relevance: c.relevance, changeType: c.changeType });
    if (route === "SKIP") {
      await db.changeEvent.update({ where: { id: ce.id }, data: { status: "SKIPPED" } });
      return { changeEventId, status: "SKIPPED" };
    }

    // 2. impact analysis for deprecations (always, regardless of relevance)
    let affected: Awaited<ReturnType<typeof findAffectedModules>> = [];
    if (route === "IMPACT_AND_DRAFT") {
      const dep = deprecatedFeatureIds(c, track.key);
      affected = await findAffectedModules(db, dep.ids);
      const retiringAt = retireDateFor(dep.ids);
      for (const m of affected) {
        if (retiringAt) await db.module.update({ where: { id: m.moduleId }, data: { retiringAt } });
        const current = await db.moduleVersion.findUniqueOrThrow({ where: { id: m.versionId } });
        // An IN_REVIEW copy of the live version: the owner (or a Claude Code PR) updates it; never auto-published.
        const pending = await db.moduleVersion.findFirst({ where: { moduleId: m.moduleId, status: "IN_REVIEW", pipelineRunId: runId } });
        if (!pending && m.type !== "NEWS") {
          await saveModuleVersion(db, {
            slug: m.slug,
            track: track.key,
            content: current.content,
            status: "IN_REVIEW",
            origin: "AUTO",
            changeEventId: null,
            pipelineRunId: runId,
            draftAttempt: 0,
            promptVersions: {},
            modelIds: {},
            meta: { verify: null, reviewReasons: ["DEPRECATION"] },
          });
        }
      }
      await db.changeEvent.update({ where: { id: ce.id }, data: { affectedModuleIds: affected.map((m) => m.moduleId) } });
      await step("impact", "ok", { featureIds: dep.ids, unknownAliases: dep.unknown, affected: affected.map((m) => m.slug) });
      if (affected.length > 0) logger.error("content.deprecation_hits_published_modules", { changeEventId: ce.id, modules: affected.map((m) => m.slug) });
    }

    // 3. draft → verify (one automatic re-draft with the verifier's feedback)
    if (caps.drafted >= config.dailyCaps.draft) {
      await step("draft", "skipped", { reason: "daily draft cap" });
      await db.changeEvent.update({ where: { id: ce.id }, data: { status: "NEW" } });
      return { changeEventId, status: "NEW", reason: "daily cap" };
    }
    const featureRefs = mapFeatureNames([...c.features, ...c.deprecations.map((d) => d.feature)], track.key).ids;
    const slug = await moduleSlugFor(db, ce, track.key, now);
    const ctx: DraftContext = {
      changeEventId: ce.id,
      snapshotId: ce.snapshot.id,
      track: track.key,
      moduleSlug: slug,
      version: 1,
      entry,
      source: { title: sourceConfig(ce.source.key)?.title ?? ce.source.key, url: ce.source.url, attribution: ce.source.attribution },
      classification: c,
      featureRefs,
      today: copenhagenDate(now),
    };
    const sourceHosts = [...new Set([new URL(ce.source.url).hostname, new URL(entry.url).hostname])];
    let report: VerifyReport = { passed: false, stage: "schema", schemaErrors: [], errors: [], claims: [], promptVersion: `${contentVerifyV1.key}.${contentVerifyV1.version}` };
    let content: unknown = null;
    let draftModel = "";
    let verifyModel = "";
    let attempt = 0;
    for (; attempt <= config.maxRedrafts; attempt++) {
      const d = await draftModule(deps.callContentModel, ctx, attempt > 0 ? feedbackFrom(report) : undefined);
      draftModel = d.modelId;
      await logModelCall(db, runId, { feature: "CONTENT_DRAFT", promptVersion: `${contentDraftV1.key}.${contentDraftV1.version}`, modelId: d.modelId, usage: d.usage });
      if (!d.ok || !d.content) {
        report = { ...report, passed: false, stage: "schema", schemaErrors: [d.error ?? "invalid draft"], errors: [], claims: [] };
      } else {
        content = d.content;
        const v = await verifyModule(deps.callContentModel, d.content, { changeEventId: ce.id, snapshotId: ce.snapshot.id, sourceText: entry.text, sourceHosts, appHost: new URL(config.appUrl).hostname, regionKnown: c.region.status === "known" }, d.modelId);
        report = v.report;
        if (v.report.verifierModel) {
          verifyModel = v.report.verifierModel;
          await logModelCall(db, runId, { feature: "CONTENT_VERIFY", promptVersion: `${contentVerifyV1.key}.${contentVerifyV1.version}`, modelId: v.report.verifierModel, usage: v.usage });
        }
      }
      await step("verify", report.passed ? "ok" : "failed", { attempt, stage: report.stage, errors: report.errors.slice(0, 10).map((e) => e.code), schemaErrors: report.schemaErrors.slice(0, 5) });
      if (report.passed) break;
      if ((await contentBudget(db, config, nowOf(deps))).exceeded) break;
    }
    const finalAttempt = Math.min(attempt, config.maxRedrafts);
    await db.changeEvent.update({ where: { id: ce.id }, data: { status: "DRAFTED" } });
    await logVerifyReport(db, runId, ce.id, report);
    if (report.passed && content) (content as { verifiedAt?: string | null }).verifiedAt = nowOf(deps).toISOString();

    // 4. publication policy
    const steps = content && typeof content === "object" && Array.isArray((content as { steps?: unknown }).steps) ? ((content as { steps: { type: string }[] }).steps.map((s) => s.type)) : [];
    const decision = report.passed
      ? decidePublication({
          moduleType: "NEWS",
          stepTypes: steps,
          classification: c,
          verifyPassed: true,
          autopublishEnabled: await autopublishEnabled(db, config),
          sourceAutoPublishAllowed: ce.source.autoPublishAllowed,
          trackActive: track.isActive,
          quotaReached: (await autoPublishedToday(db, track.id, now)) >= config.autopublishPerTrackPerDay,
        })
      : { action: "IN_REVIEW" as const, reasons: ["VERIFY_FAILED" as ReviewReason, ...(c.affectsCore ? ["CORE" as ReviewReason] : []), ...(c.needsNewSandboxUi ? ["UI" as ReviewReason] : [])], createIssue: c.affectsCore || c.needsNewSandboxUi };

    const promptVersions = { draft: `${contentDraftV1.key}.${contentDraftV1.version}`, verify: `${contentVerifyV1.key}.${contentVerifyV1.version}`, classify: `${contentClassifyV1.key}.${contentClassifyV1.version}` };
    const modelIds = { classify: cls.modelId, draft: draftModel, verify: verifyModel || null };
    const failedLowRelevance = !report.passed && c.relevance < config.reviewRelevance && !(decision.action === "IN_REVIEW" && decision.createIssue);
    const meta: VersionMeta = { verify: report, reviewReasons: decision.action === "IN_REVIEW" ? decision.reasons : [] };
    const version = await saveModuleVersion(db, {
      slug,
      track: track.key,
      content,
      status: decision.action === "AUTO_PUBLISH" ? "DRAFT" : failedLowRelevance ? "ARCHIVED" : "IN_REVIEW",
      origin: "AUTO",
      changeEventId: ce.id,
      pipelineRunId: runId,
      draftAttempt: finalAttempt,
      promptVersions,
      modelIds,
      meta,
    });

    let published = false;
    if (decision.action === "AUTO_PUBLISH") {
      try {
        await publishVersion(db, version.id, { actorUserId: null, auto: true });
        published = true;
      } catch (err) {
        if (!(err instanceof PublishConflictError)) throw err;
        await db.moduleVersion.update({ where: { id: version.id }, data: { status: "IN_REVIEW", verifyReport: { ...meta, reviewReasons: ["CONFLICT"] } as unknown as Prisma.InputJsonValue } });
      }
    }

    // 5. GitHub issue for UI/CORE changes and deprecations that hit published modules (idempotent per change event)
    let issueUrl: string | null = ce.githubIssueUrl;
    const needsIssue = (decision.action === "IN_REVIEW" && decision.createIssue) || affected.length > 0;
    if (needsIssue && !issueUrl) {
      const issue = buildIssue({
        changeEventId: ce.id,
        title: (content as { title?: string } | null)?.title ?? entry.title,
        track: track.key,
        entryUrl: entry.url,
        fetchedAt: ce.snapshot.fetchedAt,
        snapshotId: ce.snapshot.id,
        classification: c,
        entryText: entry.text,
        affectedModules: affected.map((m) => ({ slug: m.slug, title: m.title, type: m.type, version: m.version, featureRefs: m.featureRefs })),
        moduleVersionId: version.id,
        moduleJson: content,
      });
      try {
        issueUrl = (await deps.createIssue(issue)).url;
        await db.changeEvent.update({ where: { id: ce.id }, data: { githubIssueUrl: issueUrl } });
        await db.moduleVersion.update({ where: { id: version.id }, data: { verifyReport: { ...meta, issueUrl } as unknown as Prisma.InputJsonValue } });
        await step("issue", "ok", { url: issueUrl });
      } catch (err) {
        await step("issue", "failed", { error: err instanceof Error ? err.message : "unknown" });
        await markRunPartial(db, runId, `GitHub issue failed for ${ce.id}`);
      }
    }

    const finalStatus = published ? "PUBLISHED" : failedLowRelevance ? "FAILED" : "IN_REVIEW";
    await db.changeEvent.update({ where: { id: ce.id }, data: { status: finalStatus } });
    await step("publish", published ? "ok" : "info", { decision: decision.action, reasons: decision.action === "IN_REVIEW" ? decision.reasons : [], versionId: version.id });
    return { changeEventId, status: finalStatus, moduleVersionId: version.id, published, issueUrl, reason: decision.action === "IN_REVIEW" ? decision.reasons.join(",") : undefined };
  } catch (err) {
    logger.error("content.change_failed", { changeEventId, err });
    await db.changeEvent.update({ where: { id: ce.id }, data: { status: "FAILED" } });
    await step("process", "failed", { error: err instanceof Error ? err.message : "unknown" });
    await markRunPartial(db, runId, `change ${ce.id} failed: ${err instanceof Error ? err.message : "unknown"}`);
    return { changeEventId, status: "FAILED", reason: err instanceof Error ? err.message : "unknown" };
  }
}

/** For the review UI: classification of a change event, Zod-checked. */
export function parseClassification(json: unknown): Classification | null {
  const r = classificationSchema.safeParse(json);
  return r.success ? r.data : null;
}
