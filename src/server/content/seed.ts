import { readFileSync } from "node:fs";
import { z } from "zod";
import type { LicenseTier, Prisma, PrismaClient, TrackKey } from "@/generated/prisma/client";
import { paidPlans } from "@/lib/config/plans";
import { sourceConfigs, type SourceConfig } from "@/server/content-engine/sources";
import { seedConnectors } from "@/server/connectors/seed";
import { loadModules } from "./load-modules";

export const TRACKS: { key: TrackKey; displayName: string; vendorName: string; skinKey: string; isActive: boolean; sortOrder: number; licenseTiers: LicenseTier[] }[] = [
  { key: "CHATGPT", displayName: "ChatGPT", vendorName: "OpenAI", skinKey: "chatgpt", isActive: true, sortOrder: 1, licenseTiers: [] },
  { key: "COPILOT", displayName: "Microsoft 365 Copilot", vendorName: "Microsoft", skinKey: "copilot", isActive: true, sortOrder: 2, licenseTiers: ["COPILOT_CHAT", "COPILOT_M365"] },
  { key: "CLAUDE", displayName: "Claude", vendorName: "Anthropic", skinKey: "claude", isActive: true, sortOrder: 3, licenseTiers: [] },
  { key: "GEMINI", displayName: "Gemini", vendorName: "Google", skinKey: "gemini", isActive: false, sortOrder: 4, licenseTiers: [] },
];

/** Marco's publication approvals (content/approved-modules.json). Never auto-publish CORE modules. */
export function approvedModuleSlugs(path = "content/approved-modules.json"): Set<string> {
  const file = z.object({ approved: z.array(z.string()) }).parse(JSON.parse(readFileSync(path, "utf8")));
  return new Set(file.approved);
}

const TIER: Record<string, LicenseTier> = { COPILOT_CHAT: "COPILOT_CHAT", COPILOT_M365: "COPILOT_M365", unknown: "UNKNOWN" };

export async function seedTracks(db: PrismaClient) {
  for (const t of TRACKS) {
    await db.track.upsert({ where: { key: t.key }, create: t, update: t });
  }
}

export async function seedPlans(db: PrismaClient) {
  for (const p of paidPlans) {
    if (!p.interval || !p.taxMode) continue;
    const data = {
      audience: p.audience,
      interval: p.interval,
      unitAmountOre: p.unitAmountOre,
      taxBehavior: p.taxMode,
      minSeats: p.minSeats,
      trialDays: p.trialDays,
      trialMaxSeats: p.trialMaxSeats,
      active: true,
    } satisfies Omit<Prisma.PlanCreateInput, "code">;
    await db.plan.upsert({ where: { code: p.key }, create: { code: p.key, ...data }, update: data });
  }
  // Plans removed from config are deactivated, never deleted (docs/03 § 7).
  await db.plan.updateMany({ where: { code: { notIn: paidPlans.map((p) => p.key) } }, data: { active: false } });
}

export async function seedModules(db: PrismaClient, approved: Set<string> = approvedModuleSlugs()) {
  const tracks = new Map((await db.track.findMany()).map((t) => [t.key, t.id]));
  const results: { slug: string; version: number; status: string }[] = [];

  for (const [index, m] of loadModules().entries()) {
    const c = m.content;
    const requiredLicense = c.requiresTier ? (TIER[c.requiresTier] ?? null) : null;
    const status = approved.has(c.id) && m.goldenSetsComplete ? ("PUBLISHED" as const) : ("IN_REVIEW" as const);
    const jobRole = c.type === "ROLE" ? (c.roles?.[0] ?? null) : null;

    await db.$transaction(async (tx) => {
      const mod = await tx.module.upsert({
        where: { slug: c.id },
        create: { slug: c.id, type: c.type, jobRole, requiredLicense, sortOrder: index },
        update: { type: c.type, jobRole, requiredLicense, sortOrder: index },
      });
      await tx.moduleTrack.deleteMany({ where: { moduleId: mod.id } });
      await tx.moduleTrack.createMany({
        data: c.tracks.flatMap((k) => {
          const trackId = tracks.get(k);
          return trackId ? [{ moduleId: mod.id, trackId }] : [];
        }),
      });

      const existing = await tx.moduleVersion.findUnique({ where: { moduleId_version: { moduleId: mod.id, version: c.version } } });
      if (existing && existing.contentHash !== m.contentHash && existing.status === "PUBLISHED") {
        throw new Error(`${c.id} v${c.version} is published and immutable — bump "version" to change it`);
      }
      const data = {
        status,
        schemaVersion: String(c.schemaVersion),
        title: c.title,
        content: c as unknown as Prisma.InputJsonValue,
        maxPoints: m.maxPoints,
        estimatedMinutes: c.minutes,
        requiredLicense,
        featureRefs: c.featureRefs ?? [],
        searchText: m.searchText,
        contentHash: m.contentHash,
        publishedAt: status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : null,
      };
      const version = existing
        ? await tx.moduleVersion.update({ where: { id: existing.id }, data })
        : await tx.moduleVersion.create({ data: { ...data, moduleId: mod.id, version: c.version } });
      await tx.module.update({ where: { id: mod.id }, data: { publishedVersionId: status === "PUBLISHED" ? version.id : null } });
      results.push({ slug: c.id, version: c.version, status });
    });
  }
  return results;
}

/** ContentSource rows from content/sources.json (M9). `enabled` is set on create only — the admin kill switch owns it. */
export async function seedContentSources(db: PrismaClient, sources: SourceConfig[] = sourceConfigs()) {
  const tracks = new Map((await db.track.findMany()).map((t) => [t.key, t.id]));
  for (const s of sources) {
    const trackId = tracks.get(s.track);
    if (!trackId) throw new Error(`content source ${s.key}: track ${s.track} not seeded`);
    const data = {
      trackId,
      url: s.url,
      parserType: s.parserType,
      parserVersion: String(s.parser.version),
      fetchMode: s.fetchMode,
      autoPublishAllowed: s.autoPublishAllowed,
      attribution: s.attribution,
    };
    await db.contentSource.upsert({ where: { key: s.key }, create: { key: s.key, enabled: s.enabled, ...data }, update: data });
  }
  return sources.length;
}

export async function seedAll(db: PrismaClient, approved?: Set<string>) {
  await seedTracks(db);
  await seedPlans(db);
  const modules = await seedModules(db, approved);
  const contentSources = await seedContentSources(db);
  await seedConnectors(db);
  return { tracks: TRACKS.length, plans: await db.plan.count({ where: { active: true } }), modules, contentSources, industries: await db.industry.count({ where: { isActive: true } }) };
}
