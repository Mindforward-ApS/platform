import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateModule } from "../../scripts/content-validate";
import { seedContentSources, seedTracks } from "@/server/content/seed";
import { loadContentConfig, type ContentConfig } from "@/server/content-engine/config";
import { AUTOPUBLISH_FLAG, PIPELINE_FLAG, setKillSwitch } from "@/server/content-engine/flags";
import type { CreateIssue } from "@/server/content-engine/model";
import { featureRetire, freshnessAudit, upcomingRetirements } from "@/server/content-engine/maintenance";
import { ingestManualPaste, processChange, runSource, type PipelineDeps } from "@/server/content-engine/pipeline";
import { publishVersion, rejectVersion, rollbackModule, AutoPublishForbiddenError, type VersionMeta } from "@/server/content-engine/publish";
import { moduleSchema } from "@/lib/schemas/module";
import { customGptsClassification, customGptsDraft, mockContentModel, supportedVerify, type MockOptions } from "../fixtures/release-notes/mock-model";
import { makeUser, testDb } from "./helpers";

const KEY = "openai-chatgpt-rn";
const fixture = (name: string) => readFileSync(`tests/fixtures/release-notes/${name}`, "utf8");
const DAY = 86_400_000;

/** Serves fixtures instead of the network: robots.txt → 404, the page → current body (+ ETag/304 support). */
function fakeSite() {
  const state = { body: fixture("chatgpt-rn.html"), etag: null as string | null, status: 200, requests: 0 };
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
    state.requests++;
    const inm = new Headers(init?.headers).get("if-none-match");
    if (state.etag && inm === state.etag) return new Response(null, { status: 304 });
    return new Response(state.body, { status: state.status, headers: state.etag ? { etag: state.etag } : {} });
  }) as typeof fetch;
  return { state, fetchImpl };
}

let source: { id: string };
let config: ContentConfig;

async function cleanup() {
  const db = testDb();
  await db.module.deleteMany({ where: { OR: [{ slug: { startsWith: "news-" } }, { slug: { startsWith: "core-it-" } }] } });
  await db.pipelineRun.deleteMany({});
  await db.sourceSnapshot.deleteMany({});
  await db.featureFlag.deleteMany({ where: { key: { in: [PIPELINE_FLAG, AUTOPUBLISH_FLAG] } } });
  await db.budgetMonth.deleteMany({ where: { scope: "CONTENT_ENGINE" } });
  await db.contentSource.updateMany({ data: { etag: null, lastModified: null, status: "ACTIVE" } });
}

function deps(site: ReturnType<typeof fakeSite>, mock: ReturnType<typeof mockContentModel>, extra: Partial<PipelineDeps> = {}) {
  const createIssue = vi.fn<CreateIssue>(async (i) => ({ url: `https://github.com/owner/greb/issues/${i.marker.length}` }));
  const d: PipelineDeps = { db: testDb(), config, callContentModel: mock.call, createIssue, fetch: { fetchImpl: site.fetchImpl, robotsCache: new Map() }, ...extra };
  return { d, createIssue };
}

/** Day 1 = baseline (old fixture); day 2 = the custom GPTs entry appears. Returns the NEW change event ids. */
async function baselineThenNewEntry(d: PipelineDeps, site: ReturnType<typeof fakeSite>, start = Date.now()) {
  const day1 = await runSource({ ...d, now: () => new Date(start) }, source.id);
  site.state.body = fixture("chatgpt-rn-v2.html");
  const day2 = await runSource({ ...d, now: () => new Date(start + DAY) }, source.id);
  return { day1, day2 };
}

async function enableAll(on = true) {
  await setKillSwitch(testDb(), PIPELINE_FLAG, on, null);
  await setKillSwitch(testDb(), AUTOPUBLISH_FLAG, on, null);
}

beforeEach(async () => {
  await seedTracks(testDb());
  await seedContentSources(testDb());
  await cleanup();
  source = await testDb().contentSource.findUniqueOrThrow({ where: { key: KEY } });
  config = loadContentConfig({ CONTENT_DRAFT_MODEL: "mock-small", CONTENT_VERIFY_MODEL: "mock-large", APP_URL: "https://mindforward.dk", CONTENT_MONTHLY_BUDGET_DKK: "300" });
});

describe("content sources seed", () => {
  it("seeds the official sources; Gemini is seeded but disabled; re-seeding keeps the admin's enabled switch", async () => {
    const all = await testDb().contentSource.findMany({ include: { track: true } });
    expect(all.map((s) => s.key).sort()).toEqual(["claude-rn", "gemini-rn", "ms-learn-copilot-rn", "ms-m365-roadmap", "openai-chatgpt-business-rn", "openai-chatgpt-rn", "workspace-gemini-feed"]);
    expect(all.filter((s) => s.track.key === "GEMINI").every((s) => !s.enabled && !s.autoPublishAllowed)).toBe(true);
    expect(all.find((s) => s.key === "ms-learn-copilot-rn")?.attribution).toContain("CC BY 4.0");
    await testDb().contentSource.update({ where: { key: KEY }, data: { enabled: false } });
    await seedContentSources(testDb());
    expect((await testDb().contentSource.findUniqueOrThrow({ where: { key: KEY } })).enabled).toBe(false);
    await testDb().contentSource.update({ where: { key: KEY }, data: { enabled: true } });
  });
});

describe("pipeline end-to-end against fixtures", () => {
  it("baseline → new entry → classify → draft → verify → auto-published NEWS module with full run log", async () => {
    await enableAll();
    const site = fakeSite();
    const mock = mockContentModel();
    const { d } = deps(site, mock);
    const { day1, day2 } = await baselineThenNewEntry(d, site);

    expect(day1).toMatchObject({ status: "SUCCESS", changeEventIds: [] });
    expect(await testDb().changeEvent.count({ where: { sourceId: source.id, kind: "BASELINE" } })).toBe(3);
    expect(mock.calls).toHaveLength(0); // the baseline is never classified
    expect(day2.changeEventIds).toHaveLength(1);

    const result = await processChange({ ...d, now: () => new Date(Date.now() + DAY) }, day2.changeEventIds[0]!);
    expect(result).toMatchObject({ status: "PUBLISHED", published: true });

    const version = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: result.moduleVersionId! }, include: { module: true } });
    expect(version.module.publishedVersionId).toBe(version.id);
    expect(version).toMatchObject({ status: "PUBLISHED", origin: "AUTO", publishedById: null });
    const content = moduleSchema.parse(version.content);
    expect(validateModule(content, undefined, "auto")).toEqual([]);
    expect(content.type).toBe("NEWS");
    expect(content.steps.every((s) => s.type === "READ" || s.type === "QUIZ")).toBe(true);
    expect(content.autoUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(content.sources?.[0]?.url).toContain("help.openai.com");
    expect(content.featureRefs).toEqual(["chatgpt.custom-gpts", "chatgpt.skills", "chatgpt.plugins"]);
    expect(version.modelIds).toMatchObject({ draft: "mock-small", verify: "mock-large" });

    const run = await testDb().pipelineRun.findUniqueOrThrow({ where: { id: day2.runId } });
    expect(run.tokensIn).toBe(3000);
    expect(Number(run.costDkk)).toBeCloseTo(0.15);
    expect(run.modelIds).toMatchObject({ CONTENT_CLASSIFY: "mock-small", CONTENT_DRAFT: "mock-small", CONTENT_VERIFY: "mock-large" });
    expect(run.promptVersions).toMatchObject({ CONTENT_DRAFT: "content-draft.v1", CONTENT_VERIFY: "content-verify.v1" });
    expect((run.verifyReport as Record<string, { passed: boolean }>)[result.changeEventId]?.passed).toBe(true);
    expect((run.steps as { step: string }[]).map((s) => s.step)).toEqual(expect.arrayContaining(["fetch", "snapshot", "diff", "classify", "verify", "publish"]));
    expect(await testDb().auditLog.count({ where: { action: "MODULE_PUBLISH", targetId: version.id, actorType: "CONTENT_ENGINE" } })).toBe(1);

    // Re-running is a no-op (idempotent).
    expect(await processChange(d, result.changeEventId)).toMatchObject({ reason: "already processed" });
  });

  it("custom GPTs retirement: affected CORE module gets an IN_REVIEW draft + retire date + a deprecation issue; NEWS still auto-publishes", async () => {
    await enableAll();
    const db = testDb();
    const track = await db.track.findUniqueOrThrow({ where: { key: "CHATGPT" } });
    const core = await db.module.create({ data: { slug: "core-it-assistants", type: "CORE", tracks: { create: { trackId: track.id } } } });
    const v1 = await db.moduleVersion.create({
      data: { moduleId: core.id, version: 1, status: "PUBLISHED", schemaVersion: "1", title: "Egne assistenter", content: { id: "core-it-assistants" }, maxPoints: 10, estimatedMinutes: 8, featureRefs: ["chatgpt.custom-gpts"], searchText: "custom GPTs", contentHash: "x", publishedAt: new Date() },
    });
    await db.module.update({ where: { id: core.id }, data: { publishedVersionId: v1.id } });

    const site = fakeSite();
    const { d, createIssue } = deps(site, mockContentModel());
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!);

    expect(result.published).toBe(true);
    expect(createIssue).toHaveBeenCalledTimes(1);
    const issue = createIssue.mock.calls[0]![0];
    expect(issue.labels).toEqual(expect.arrayContaining(["content-engine", "track:CHATGPT", "deprecation"]));
    expect(issue.body).toContain(`<!-- greb-change-event:${result.changeEventId} -->`);
    expect(issue.body).toContain("core-it-assistants");
    const mod = await db.module.findUniqueOrThrow({ where: { id: core.id }, include: { versions: true } });
    expect(mod.publishedVersionId).toBe(v1.id); // CORE is never touched automatically
    expect(mod.retiringAt?.toISOString().slice(0, 10)).toBe("2026-12-11");
    expect(mod.versions.find((v) => v.version === 2)?.status).toBe("IN_REVIEW");
    const ce = await db.changeEvent.findUniqueOrThrow({ where: { id: result.changeEventId } });
    expect(ce.affectedModuleIds).toEqual([core.id]);
    expect(ce.githubIssueUrl).toMatch(/^https:\/\/github.com\//);
  });
});

describe("publication policy", () => {
  it("verification failure → nothing published, one re-draft, run logged with the reason", async () => {
    await enableAll();
    const site = fakeSite();
    const mock = mockContentModel({ verify: (ids) => ({ ...supportedVerify(ids), claims: ids.map((id) => ({ id, verdict: "CONTRADICTED", reason: "Datoen er forkert." })) }) });
    const { d } = deps(site, mock);
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!);

    expect(result.published).toBe(false);
    expect(mock.calls.filter((c) => c.feature === "CONTENT_DRAFT")).toHaveLength(2);
    expect(mock.calls[mock.calls.length - 1]!.request.user).toBeDefined();
    const version = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: result.moduleVersionId! }, include: { module: true } });
    expect(version.status).toBe("IN_REVIEW"); // relevance 0.9 ≥ 0.8
    expect(version.module.publishedVersionId).toBeNull();
    expect((version.verifyReport as unknown as VersionMeta).reviewReasons).toContain("VERIFY_FAILED");
    const run = await testDb().pipelineRun.findUniqueOrThrow({ where: { id: day2.runId } });
    const report = (run.verifyReport as Record<string, { passed: boolean; errors: { code: string }[] }>)[result.changeEventId]!;
    expect(report.passed).toBe(false);
    expect(report.errors[0]!.code).toBe("CLAIM_CONTRADICTED");
    expect(await testDb().auditLog.count({ where: { action: "MODULE_PUBLISH", targetId: version.id } })).toBe(0);
  });

  it("verification failure with lower relevance → ARCHIVED", async () => {
    await enableAll();
    const site = fakeSite();
    const plain = { ...customGptsClassification, changeType: "NEW_FEATURE" as const, deprecations: [], relevance: 0.7 };
    const mock = mockContentModel({ classification: plain, verify: (ids) => ({ claims: ids.map((id) => ({ id, verdict: "PARTIAL", reason: "x" })), language: { status: "PASS", fixes: [] } }) });
    const { d } = deps(site, mock);
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!);
    expect(result.status).toBe("FAILED");
    expect((await testDb().moduleVersion.findUniqueOrThrow({ where: { id: result.moduleVersionId! } })).status).toBe("ARCHIVED");
  });

  it("a claim without source is rejected — never published", async () => {
    await enableAll();
    const site = fakeSite();
    const draft = structuredClone(customGptsDraft);
    draft.reads[0]!.claims[0] = { ...draft.reads[0]!.claims[0]!, quote: null, charStart: null, charEnd: null };
    const mock = mockContentModel({ draft });
    const { d } = deps(site, mock);
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!);
    expect(result.published).toBe(false);
    expect(mock.calls.filter((c) => c.feature === "CONTENT_VERIFY")).toHaveLength(0); // stopped before the verifier model
    const meta = (await testDb().moduleVersion.findUniqueOrThrow({ where: { id: result.moduleVersionId! } })).verifyReport as unknown as VersionMeta;
    expect(meta.verify?.errors.map((e) => e.code)).toContain("CLAIM_WITHOUT_SOURCE");
  });

  it("CORE/UI-affecting draft is never auto-published and opens exactly one GitHub issue (mocked)", async () => {
    await enableAll();
    const site = fakeSite();
    const mock = mockContentModel({ classification: { ...customGptsClassification, changeType: "NEW_FEATURE", deprecations: [], affectsCore: true, needsNewSandboxUi: true } });
    const { d, createIssue } = deps(site, mock);
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!);

    expect(result).toMatchObject({ status: "IN_REVIEW", published: false });
    expect(createIssue).toHaveBeenCalledTimes(1);
    expect(createIssue.mock.calls[0]![0].labels).toEqual(expect.arrayContaining(["needs-sandbox-ui", "affects-core"]));
    const v = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: result.moduleVersionId! }, include: { module: true } });
    expect(v.module.publishedVersionId).toBeNull();
    expect((v.verifyReport as unknown as VersionMeta).reviewReasons).toEqual(expect.arrayContaining(["CORE", "UI"]));
    expect(await processChange(d, result.changeEventId)).toMatchObject({ reason: "already processed" });
    expect(createIssue).toHaveBeenCalledTimes(1);
  });

  it("the auto path refuses anything but NEWS with READ/QUIZ (hard guard)", async () => {
    const db = testDb();
    const mod = await db.module.create({ data: { slug: "core-it-guard", type: "CORE" } });
    const content = JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")) as object;
    const v = await db.moduleVersion.create({ data: { moduleId: mod.id, version: 1, status: "IN_REVIEW", schemaVersion: "1", title: "x", content, maxPoints: 1, estimatedMinutes: 8, searchText: "", contentHash: "x" } });
    await expect(publishVersion(db, v.id, { actorUserId: null, auto: true })).rejects.toBeInstanceOf(AutoPublishForbiddenError);
  });
});

describe("kill switches", () => {
  it("CONTENT_PIPELINE_ENABLED off stops the next run after the snapshot — no model calls", async () => {
    await setKillSwitch(testDb(), PIPELINE_FLAG, false, null);
    const site = fakeSite();
    const mock = mockContentModel();
    const { d } = deps(site, mock);
    const { day2 } = await baselineThenNewEntry(d, site);
    expect(day2.status).toBe("SKIPPED_KILL_SWITCH");
    expect(day2.changeEventIds).toEqual([]);
    expect(await testDb().sourceSnapshot.count({ where: { sourceId: source.id } })).toBe(2); // snapshots are still stored
    expect(mock.calls).toHaveLength(0);
    expect(await testDb().auditLog.count({ where: { action: "KILL_SWITCH_CHANGED", targetId: PIPELINE_FLAG } })).toBeGreaterThan(0);
  });

  it("CONTENT_AUTOPUBLISH_ENABLED off sends a passing NEWS draft to review", async () => {
    await setKillSwitch(testDb(), PIPELINE_FLAG, true, null);
    await setKillSwitch(testDb(), AUTOPUBLISH_FLAG, false, null);
    const site = fakeSite();
    const { d } = deps(site, mockContentModel());
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!);
    expect(result).toMatchObject({ status: "IN_REVIEW", published: false, reason: "AUTOPUBLISH_OFF" });
  });

  it("monthly content budget reached → no LLM calls (only fetch/snapshot/diff)", async () => {
    await enableAll();
    config = { ...config, monthlyBudgetDkk: 0 };
    const site = fakeSite();
    const mock = mockContentModel();
    const { d } = deps(site, mock);
    const { day2 } = await baselineThenNewEntry(d, site);
    expect(await processChange(d, day2.changeEventIds[0]!)).toMatchObject({ status: "NEW", reason: "budget" });
    expect(mock.calls).toHaveLength(0);
    expect((await testDb().pipelineRun.findUniqueOrThrow({ where: { id: day2.runId } })).status).toBe("SKIPPED_BUDGET");
  });
});

describe("unchanged source", () => {
  it("304 Not Modified → NO_CHANGE, no snapshot, no draft", async () => {
    await enableAll();
    const site = fakeSite();
    site.state.etag = '"v1"';
    const mock = mockContentModel();
    const { d } = deps(site, mock);
    const start = Date.now();
    await runSource({ ...d, now: () => new Date(start) }, source.id);
    expect((await testDb().contentSource.findUniqueOrThrow({ where: { id: source.id } })).etag).toBe('"v1"');
    const second = await runSource({ ...d, now: () => new Date(start + DAY) }, source.id);
    expect(second.status).toBe("NO_CHANGE");
    expect(await testDb().sourceSnapshot.count({ where: { sourceId: source.id } })).toBe(1);
    expect(mock.calls).toHaveLength(0);
  });

  it("same content hash (only noise changed) → NO_CHANGE, no change events", async () => {
    await enableAll();
    const site = fakeSite();
    const { d } = deps(site, mockContentModel());
    const start = Date.now();
    await runSource({ ...d, now: () => new Date(start) }, source.id);
    site.state.body = fixture("chatgpt-rn.html").replace("Updated 5 minutes ago", "Updated 3 hours ago").replace("utm_medium=email", "utm_medium=social");
    const second = await runSource({ ...d, now: () => new Date(start + DAY) }, source.id);
    expect(second).toMatchObject({ status: "NO_CHANGE", changeEventIds: [] });
    expect(await testDb().changeEvent.count({ where: { sourceId: source.id, kind: { not: "BASELINE" } } })).toBe(0);
  });

  it("retries 5xx with 1 → 5 → 30 min backoff, then fails the run", async () => {
    const site = fakeSite();
    site.state.status = 503;
    const sleep = vi.fn(async () => {});
    const { d } = deps(site, mockContentModel());
    const r = await runSource(d, source.id, { sleep });
    expect(r.status).toBe("FAILED");
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([60_000, 300_000, 1_800_000]);
    expect(site.state.requests).toBe(4);
  });
});

describe("review actions and rollback", () => {
  it("approve publishes an IN_REVIEW version with an audit row; reject archives it", async () => {
    await setKillSwitch(testDb(), PIPELINE_FLAG, true, null);
    const site = fakeSite();
    const { d } = deps(site, mockContentModel());
    const { day2 } = await baselineThenNewEntry(d, site);
    const result = await processChange(d, day2.changeEventIds[0]!); // autopublish off → IN_REVIEW
    const admin = await makeUser();
    await publishVersion(testDb(), result.moduleVersionId!, { actorUserId: admin.id, auto: false });
    const v = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: result.moduleVersionId! }, include: { module: true } });
    expect(v).toMatchObject({ status: "PUBLISHED", publishedById: admin.id });
    expect(v.module.publishedVersionId).toBe(v.id);
    expect(await testDb().auditLog.count({ where: { action: "MODULE_PUBLISH", actorUserId: admin.id, targetId: v.id } })).toBe(1);

    await expect(rejectVersion(testDb(), v.id, { actorUserId: admin.id })).rejects.toThrow();
  });

  it("rollback restores the previous version; with no previous version the module is unpublished", async () => {
    await enableAll();
    const site = fakeSite();
    const { d } = deps(site, mockContentModel());
    const start = Date.now();
    const { day2 } = await baselineThenNewEntry(d, site, start);
    const first = await processChange(d, day2.changeEventIds[0]!);
    // Day 3: the same entry is modified → MODIFIED event → version 2 of the same module.
    site.state.body = fixture("chatgpt-rn-v3.html");
    const day3 = await runSource({ ...d, now: () => new Date(start + 2 * DAY) }, source.id);
    expect(day3.changeEventIds).toHaveLength(1);
    expect((await testDb().changeEvent.findUniqueOrThrow({ where: { id: day3.changeEventIds[0]! } })).kind).toBe("MODIFIED");
    const second = await processChange(d, day3.changeEventIds[0]!);
    expect(second.published).toBe(true);
    const v2 = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: second.moduleVersionId! } });
    const v1 = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: first.moduleVersionId! } });
    expect([v1.moduleId, v1.version, v2.version]).toEqual([v2.moduleId, 1, 2]);

    const admin = await makeUser();
    expect(await rollbackModule(testDb(), v2.moduleId, { actorUserId: admin.id })).toEqual({ restoredVersionId: v1.id });
    const mod = await testDb().module.findUniqueOrThrow({ where: { id: v2.moduleId } });
    expect(mod.publishedVersionId).toBe(v1.id);
    expect((await testDb().moduleVersion.findUniqueOrThrow({ where: { id: v2.id } })).status).toBe("ARCHIVED");
    expect(await testDb().auditLog.count({ where: { action: "MODULE_ROLLBACK", targetId: v2.moduleId } })).toBe(1);

    await rollbackModule(testDb(), v2.moduleId, { actorUserId: admin.id });
    expect((await testDb().module.findUniqueOrThrow({ where: { id: v2.moduleId } })).publishedVersionId).toBeNull();
  });
});

describe("manual paste", () => {
  it("turns pasted release notes into a MANUAL_PASTE snapshot", async () => {
    await enableAll();
    const admin = await makeUser();
    const { d } = deps(fakeSite(), mockContentModel());
    const r = await ingestManualPaste(d, source.id, "## October 12, 2026\n### Custom GPTs are being retired\nStarting December 11, 2026, custom GPTs will no longer be available in ChatGPT.", admin.id);
    expect(r.outcome).toBe("DONE");
    expect((await testDb().sourceSnapshot.findFirstOrThrow({ where: { sourceId: source.id } })).origin).toBe("MANUAL_PASTE");
    expect(await testDb().auditLog.count({ where: { action: "CONTENT_MANUAL_PASTE", actorUserId: admin.id } })).toBe(1);
  });
});

describe("freshness audit and retire date", () => {
  it("flags a published module whose quote vanished and the verifier says CONTRADICTED; is idempotent per ISO week", async () => {
    await enableAll();
    const site = fakeSite();
    const { d } = deps(site, mockContentModel());
    const start = Date.now();
    const { day2 } = await baselineThenNewEntry(d, site, start);
    const published = await processChange(d, day2.changeEventIds[0]!);
    // The source rewrites the entry: the quotes are gone.
    site.state.body = fixture("chatgpt-rn-v2.html").replace("Starting December 11, 2026, custom GPTs will no longer be available in ChatGPT.", "Custom GPTs remain available.");
    await setKillSwitch(testDb(), PIPELINE_FLAG, false, null); // only snapshot the new state
    await runSource({ ...d, now: () => new Date(start + 2 * DAY) }, source.id);

    const verifier = mockContentModel({ verify: (ids) => ({ claims: ids.map((id) => ({ id, verdict: "CONTRADICTED", reason: "Kilden siger noget andet nu." })), language: { status: "PASS", fixes: [] } }) });
    const audit = await freshnessAudit({ ...d, callContentModel: verifier.call });
    expect(audit.skipped).toBe(false);
    const v = await testDb().moduleVersion.findUniqueOrThrow({ where: { id: published.moduleVersionId! }, include: { module: true } });
    expect(v.module.isStale).toBe(true);
    expect(await freshnessAudit({ ...d, callContentModel: verifier.call })).toMatchObject({ skipped: true });
  });

  it("retire date marks modules that still reference the feature", async () => {
    const db = testDb();
    const mod = await db.module.create({ data: { slug: "core-it-retire", type: "CORE" } });
    const v = await db.moduleVersion.create({ data: { moduleId: mod.id, version: 1, status: "PUBLISHED", schemaVersion: "1", title: "x", content: {}, maxPoints: 1, estimatedMinutes: 8, featureRefs: ["chatgpt.custom-gpts"], searchText: "", contentHash: "x" } });
    await db.module.update({ where: { id: mod.id }, data: { publishedVersionId: v.id } });
    const { d } = deps(fakeSite(), mockContentModel());
    const r = await featureRetire(d, "chatgpt.custom-gpts", "2026-12-11");
    expect(r.modules).toContain("core-it-retire");
    expect((await db.module.findUniqueOrThrow({ where: { id: mod.id } })).isStale).toBe(true);
    expect(await featureRetire(d, "chatgpt.custom-gpts", "2026-12-11")).toMatchObject({ skipped: true });
    expect(upcomingRetirements(new Date("2026-12-10T12:00:00Z")).map((x) => x.featureId)).toEqual(["chatgpt.custom-gpts"]);
  });
});
