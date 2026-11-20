import type { Prisma } from "@/generated/prisma/client";
import { moduleSchema } from "@/lib/schemas/module";
import { logger } from "@/server/observability/logger";
import { contentBudget } from "./budget";
import { copenhagenDate, isoWeek } from "./normalize";
import type { PipelineDeps } from "./pipeline";
import { contentVerifyV1 } from "./prompts/content-verify.v1";
import { finishRun, logModelCall, logStep, startRun } from "./runlog";
import { snapshotEntries } from "./snapshot";
import { featureRegistry, type Feature } from "./sources";
import { collectClaims, verifyClaimsAgainst } from "./verify";

// Weekly freshness audit (docs/06 § 14) and the retire-date job (§ 12.7).

export async function freshnessAudit(deps: PipelineDeps, registry: Feature[] = featureRegistry()) {
  const { db, config } = deps;
  const now = deps.now?.() ?? new Date();
  const { run, created } = await startRun(db, { kind: "FRESHNESS_AUDIT", idempotencyKey: `freshness:${isoWeek(now)}` });
  if (!created && run.status !== "RUNNING") return { runId: run.id, skipped: true };

  const modules = await db.module.findMany({ where: { publishedVersionId: { not: null } }, include: { publishedVersion: true } });
  const latestBySource = new Map<string, ReturnType<typeof snapshotEntries>>();
  const stale: string[] = [];
  const checked: string[] = [];
  const oldNews: string[] = [];
  const coreFeatures: Record<string, string[]> = {};
  const byId = new Map(registry.map((f) => [f.id, f]));

  for (const m of modules) {
    const v = m.publishedVersion!;
    if (m.type === "CORE") coreFeatures[m.slug] = v.featureRefs;
    if (m.type === "NEWS" && v.publishedAt && now.getTime() - v.publishedAt.getTime() > config.newsMaxAgeDays * 86_400_000) oldNews.push(m.slug);

    // Registry: references to deprecated/retired features → retire banner / stale.
    for (const ref of v.featureRefs) {
      const f = byId.get(ref);
      if (!f || f.status === "ACTIVE") continue;
      const retiringAt = f.retireDate ? new Date(`${f.retireDate}T00:00:00Z`) : null;
      await db.module.update({ where: { id: m.id }, data: { ...(retiringAt ? { retiringAt } : {}), ...(f.status === "RETIRED" ? { isStale: true } : {}) } });
      if (f.status === "RETIRED") stale.push(m.slug);
    }

    const content = moduleSchema.safeParse(v.content);
    if (!content.success) continue;
    const claims = collectClaims(content.data).filter((c) => c.kind === "FACT" && c.sourceRef);
    if (claims.length === 0) continue;
    checked.push(m.slug);

    for (const c of claims) {
      const ref = c.sourceRef!;
      const snap = await db.sourceSnapshot.findUnique({ where: { id: ref.snapshotId }, select: { sourceId: true } });
      const ce = await db.changeEvent.findUnique({ where: { id: ref.changeEventId }, select: { entryKey: true } });
      if (!snap) continue;
      if (!latestBySource.has(snap.sourceId)) {
        const latest = await db.sourceSnapshot.findFirst({ where: { sourceId: snap.sourceId }, orderBy: { fetchedAt: "desc" }, select: { entries: true } });
        latestBySource.set(snap.sourceId, latest ? snapshotEntries(latest.entries) : []);
      }
      const entries = latestBySource.get(snap.sourceId)!;
      if (entries.some((e) => e.text.includes(ref.quote))) continue;
      const current = entries.find((e) => e.entryKey === ce?.entryKey);
      if (!current) {
        await logStep(db, run.id, { step: "freshness", status: "info", detail: { module: m.slug, claim: c.id, note: "source entry no longer present" } });
        continue;
      }
      if ((await contentBudget(db, config, now)).exceeded) {
        await logStep(db, run.id, { step: "freshness", status: "skipped", detail: { reason: "budget" } });
        continue;
      }
      const res = await verifyClaimsAgainst(deps.callContentModel, current.text, [{ id: c.id, text: c.text, quote: ref.quote }]);
      await logModelCall(db, run.id, { feature: "CONTENT_VERIFY", promptVersion: `${contentVerifyV1.key}.${contentVerifyV1.version}`, modelId: res.modelId, usage: res.usage });
      const verdict = res.verdicts?.find((x) => x.id === c.id)?.verdict;
      if (verdict === "CONTRADICTED" || verdict === "NOT_SUPPORTED" || !res.verdicts) {
        await db.module.update({ where: { id: m.id }, data: { isStale: true } });
        stale.push(m.slug);
        await logStep(db, run.id, { step: "freshness", status: "failed", detail: { module: m.slug, claim: c.id, verdict: verdict ?? "unparseable" } });
      }
    }
  }
  const summary = { checked: checked.length, stale: [...new Set(stale)], newsOlderThanLimit: oldNews, coreFeatureRefs: coreFeatures } satisfies Prisma.InputJsonValue;
  await logStep(db, run.id, { step: "summary", status: "ok", detail: summary });
  await finishRun(db, run.id, "SUCCESS");
  if (summary.stale.length > 0) logger.warn("content.freshness_stale", { modules: summary.stale });
  return { runId: run.id, skipped: false, ...summary };
}

/** content/feature.retire-date: published modules that still reference the feature → stale + alarm. */
export async function featureRetire(deps: PipelineDeps, featureId: string, date: string) {
  const { db } = deps;
  const { run, created } = await startRun(db, { kind: "RETIRE_DATE", idempotencyKey: `${featureId}:${date}` });
  if (!created && run.status !== "RUNNING") return { runId: run.id, skipped: true, modules: [] as string[] };
  const versions = await db.moduleVersion.findMany({ where: { publishedIn: { isNot: null }, featureRefs: { has: featureId } }, select: { module: { select: { id: true, slug: true } } } });
  const retiringAt = new Date(`${date}T00:00:00Z`);
  for (const v of versions) await db.module.update({ where: { id: v.module.id }, data: { isStale: true, retiringAt } });
  const modules = versions.map((v) => v.module.slug);
  if (modules.length > 0) logger.error("content.feature_retired_modules_live", { featureId, date, modules });
  await logStep(db, run.id, { step: "retire", status: modules.length ? "failed" : "ok", detail: { featureId, date, modules } });
  await finishRun(db, run.id, "SUCCESS");
  return { runId: run.id, skipped: false, modules };
}

/** Features whose retire date is today or tomorrow (Copenhagen) — the daily fan-out schedules their event. */
export function upcomingRetirements(now: Date, registry: Feature[] = featureRegistry()): { featureId: string; date: string; ts: number }[] {
  const today = copenhagenDate(now);
  const tomorrow = copenhagenDate(new Date(now.getTime() + 86_400_000));
  return registry
    .filter((f) => f.retireDate && (f.retireDate === today || f.retireDate === tomorrow))
    .map((f) => ({ featureId: f.id, date: f.retireDate!, ts: Date.parse(`${f.retireDate}T06:00:00+01:00`) }));
}
