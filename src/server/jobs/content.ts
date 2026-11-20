import "server-only";
import { z } from "zod";
import { contentDeps } from "@/server/content-engine/deps";
import { featureRetire, freshnessAudit, upcomingRetirements } from "@/server/content-engine/maintenance";
import { copenhagenDate } from "@/server/content-engine/normalize";
import { beginSourceRun, MAX_FETCH_ATTEMPTS, processChange, sourceRunAttempt } from "@/server/content-engine/pipeline";
import { inngest } from "./client";

// Content engine jobs (docs/02 § 5, docs/06). One step.run per side effect; all bodies are idempotent through DB keys.

export const CONTENT_SOURCE_RUN = "content/source.run";
export const CONTENT_CHANGE_CREATED = "content/change.created";
export const CONTENT_FEATURE_RETIRE = "content/feature.retire-date";

const sourceRunData = z.object({ sourceId: z.string(), date: z.string(), runKey: z.string(), manual: z.boolean().optional() });

export const contentDailyFanoutJob = inngest.createFunction(
  { id: "content.daily-fanout", retries: 3, triggers: { cron: "TZ=Europe/Copenhagen 15 5 * * *" } },
  async ({ step }) => {
    const date = copenhagenDate();
    const plan = await step.run("plan", async () => {
      const { db } = contentDeps();
      const sources = await db.contentSource.findMany({ where: { enabled: true }, select: { id: true, url: true } });
      // Change events left NEW by a kill switch, budget stop or daily cap are retried the next day.
      const pending = await db.changeEvent.findMany({ where: { status: "NEW", createdAt: { lt: new Date(Date.now() - 12 * 3_600_000) } }, select: { id: true }, take: 20 });
      return { sources, pending: pending.map((p) => p.id), retirements: upcomingRetirements(new Date()) };
    });
    const events = [
      ...plan.sources.map((s) => ({ name: CONTENT_SOURCE_RUN, id: `${s.id}:${date}`, data: { sourceId: s.id, date, runKey: `${s.id}:${date}`, host: new URL(s.url).host } })),
      ...plan.pending.map((id) => ({ name: CONTENT_CHANGE_CREATED, id: `${id}:retry:${date}`, data: { changeEventId: id } })),
      ...plan.retirements.map((r) => ({ name: CONTENT_FEATURE_RETIRE, id: `${r.featureId}:${r.date}`, ts: r.ts, data: { featureId: r.featureId, date: r.date } })),
    ];
    if (events.length > 0) await step.sendEvent("fan-out", events);
    return { date, sources: plan.sources.length, pending: plan.pending.length, retirements: plan.retirements.length };
  },
);

export const contentSourceRunJob = inngest.createFunction(
  {
    id: "content.source-run",
    retries: 3,
    triggers: { event: CONTENT_SOURCE_RUN },
    idempotency: "event.data.runKey", // "{sourceId}:{date}" daily, "{sourceId}:manual:{hour}" from the admin button
    concurrency: { limit: 1, key: "event.data.host" }, // polite: one request at a time per host
  },
  async ({ event, step }) => {
    const data = sourceRunData.parse(event.data);
    const { runId } = await step.run("begin", async () => ({ runId: (await beginSourceRun(contentDeps(), data.sourceId, { manual: data.manual })).run.id }));
    let changeEventIds: string[] = [];
    let status = "RUNNING";
    for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
      const r = await step.run(`fetch-snapshot-diff-${attempt}`, () => sourceRunAttempt(contentDeps(), runId, attempt));
      if (r.outcome === "DONE") {
        changeEventIds = r.changeEventIds;
        status = r.status;
        break;
      }
      await step.sleep(`backoff-${attempt}`, r.delayMs); // 1 → 5 → 30 min (Retry-After wins)
    }
    if (changeEventIds.length > 0) {
      await step.sendEvent("changes", changeEventIds.map((id) => ({ name: CONTENT_CHANGE_CREATED, id, data: { changeEventId: id } })));
    }
    return { runId, status, changes: changeEventIds.length };
  },
);

export const contentChangeProcessJob = inngest.createFunction(
  {
    id: "content.change-process",
    retries: 2,
    triggers: { event: CONTENT_CHANGE_CREATED },
    idempotency: "event.data.changeEventId",
    concurrency: { limit: 1 }, // LLM calls one at a time: daily caps and the budget stay exact
  },
  async ({ event, step }) => {
    const { changeEventId } = z.object({ changeEventId: z.string() }).parse(event.data);
    return step.run("process", () => processChange(contentDeps(), changeEventId));
  },
);

export const contentFreshnessAuditJob = inngest.createFunction(
  { id: "content.freshness-audit", retries: 2, triggers: { cron: "TZ=Europe/Copenhagen 0 4 * * 0" } },
  async ({ step }) => step.run("audit", () => freshnessAudit(contentDeps())),
);

export const contentFeatureRetireJob = inngest.createFunction(
  { id: "content.feature-retire", retries: 3, triggers: { event: CONTENT_FEATURE_RETIRE }, idempotency: "event.data.featureId + ':' + event.data.date" },
  async ({ event, step }) => {
    const { featureId, date } = z.object({ featureId: z.string(), date: z.string() }).parse(event.data);
    return step.run("retire", () => featureRetire(contentDeps(), featureId, date));
  },
);

export const contentFunctions = [contentDailyFanoutJob, contentSourceRunJob, contentChangeProcessJob, contentFreshnessAuditJob, contentFeatureRetireJob];
