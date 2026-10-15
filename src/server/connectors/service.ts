import "server-only";
import type { ConnectorPlatform, IndustryCodeSystem, PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { consumeRateLimit } from "@/server/security/rate-limit";
import { matchIndustryCode, type CodeSystem } from "./industry-match";
import { cachedLookup, CVR_PATTERN, erstProvider, fixtureProvider, type CompanyInfo, type CompanyLookupProvider } from "./lookup";
import { scoreConnectors, type Availability, type ConnectorPlatformKey, type ScoredConnector } from "./scoring";

// Work profile + connector recommendations: loads data for the pure functions and stores the learner's answers.
// Always scoped to (organizationId, userId) of the caller's active membership.

export const PLATFORM_BY_TRACK: Record<string, ConnectorPlatformKey> = { CLAUDE: "CLAUDE", CHATGPT: "CHATGPT", COPILOT: "COPILOT" };
export const CVR_LOOKUP_LIMIT = { window: 60 * 60, max: 20 } as const;

export function lookupProvider(): CompanyLookupProvider | null {
  const env = serverEnv();
  if (env.CVR_PROVIDER === "fixture") return fixtureProvider;
  if (env.CVR_PROVIDER === "erst" && env.CVR_ERST_USER && env.CVR_ERST_PASSWORD) return erstProvider({ user: env.CVR_ERST_USER, password: env.CVR_ERST_PASSWORD });
  return null;
}

type Scope = { userId: string; organizationId: string };

export function getWorkProfile(db: PrismaClient, s: Scope) {
  return db.workProfile.findUnique({ where: { organizationId_userId: { organizationId: s.organizationId, userId: s.userId } }, include: { industry: { select: { id: true, slug: true, name: true } } } });
}

/** The platform the learner trains on (active track), or null when they have none yet. */
export async function platformForUser(db: PrismaClient, s: Scope): Promise<ConnectorPlatformKey | null> {
  const e = await db.trackEnrollment.findFirst({ where: { ...s, active: true, track: { isActive: true } }, orderBy: { updatedAt: "desc" }, select: { track: { select: { key: true } } } });
  return e ? (PLATFORM_BY_TRACK[e.track.key] ?? null) : null;
}

export function listIndustries(db: PrismaClient) {
  return db.industry.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }], select: { id: true, slug: true, name: true } });
}

export type LookupResult =
  | { kind: "found"; company: CompanyInfo; industry: { id: string; name: string } | null }
  | { kind: "not-found" | "invalid" | "unavailable" | "rate-limited" };

/** CVR → company + matched industry (or null industry → the picker). Rate limited per user. */
export async function lookupCompany(db: PrismaClient, s: Scope, rawCvr: string, provider = lookupProvider()): Promise<LookupResult> {
  const cvr = rawCvr.replace(/\D/g, "");
  if (!CVR_PATTERN.test(cvr)) return { kind: "invalid" };
  if (!provider) return { kind: "unavailable" };
  const rl = await consumeRateLimit(db, `cvr:user:${s.userId}`, CVR_LOOKUP_LIMIT);
  if (!rl.allowed) return { kind: "rate-limited" };
  const company = await cachedLookup(db, provider, cvr);
  if (!company) return { kind: "not-found" };
  const rows = await db.industryCode.findMany({ where: { industry: { isActive: true } }, select: { system: true, prefix: true, industryId: true } });
  const match = matchIndustryCode(company.industryCode, company.codeSystem, rows as { system: CodeSystem; prefix: string; industryId: string }[]);
  const industry = match ? await db.industry.findUnique({ where: { id: match.industryId }, select: { id: true, name: true } }) : null;
  return { kind: "found", company, industry };
}

export async function saveIndustry(
  db: PrismaClient,
  s: Scope,
  input: { industryId: string; cvr?: string | null; companyName?: string | null; industryCode?: string | null; industryCodeSystem?: IndustryCodeSystem | null },
) {
  const industry = await db.industry.findFirst({ where: { id: input.industryId, isActive: true }, select: { id: true, systems: { where: { preselected: true }, select: { systemId: true } } } });
  if (!industry) throw new Error("UNKNOWN_INDUSTRY");
  const preselected = industry.systems.map((x) => x.systemId);
  const data = { industryId: industry.id, cvr: input.cvr ?? null, companyName: input.companyName ?? null, industryCode: input.industryCode ?? null, industryCodeSystem: input.industryCodeSystem ?? null };
  const existing = await getWorkProfile(db, s);
  // Changing industry resets the systems to that industry's suggestions; keeping it keeps the learner's choice.
  const selectedSystemIds = existing && existing.industryId === industry.id ? existing.selectedSystemIds : preselected;
  return db.workProfile.upsert({
    where: { organizationId_userId: { organizationId: s.organizationId, userId: s.userId } },
    create: { ...s, ...data, selectedSystemIds },
    update: { ...data, selectedSystemIds },
  });
}

/** Systems grouped by category, industry suggestions first, with the learner's current selection. */
export async function systemsForProfile(db: PrismaClient, s: Scope) {
  const profile = await getWorkProfile(db, s);
  if (!profile?.industryId) return null;
  const [categories, suggested] = await Promise.all([
    db.systemCategory.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, systems: { orderBy: { name: "asc" }, select: { id: true, name: true } } } }),
    db.industrySystem.findMany({ where: { industryId: profile.industryId }, select: { systemId: true } }),
  ]);
  const suggestedIds = new Set(suggested.map((x) => x.systemId));
  return { profile, categories, suggestedIds, selected: new Set(profile.selectedSystemIds) };
}

export async function saveSystems(db: PrismaClient, s: Scope, systemIds: string[]) {
  const valid = await db.system.findMany({ where: { id: { in: systemIds } }, select: { id: true } });
  return db.workProfile.update({
    where: { organizationId_userId: { organizationId: s.organizationId, userId: s.userId } },
    data: { selectedSystemIds: valid.map((v) => v.id), completedAt: new Date() },
  });
}

export async function skipProfile(db: PrismaClient, s: Scope) {
  await db.workProfile.upsert({
    where: { organizationId_userId: { organizationId: s.organizationId, userId: s.userId } },
    create: { ...s, skippedAt: new Date() },
    update: { skippedAt: new Date() },
  });
}

export interface Recommendation extends ScoredConnector {
  useCase: string | null;
  coveredTasks: string[];
  demoId: string | null;
}

/** Ranked connectors for the learner's industry, systems and platform. */
export async function recommendationsFor(db: PrismaClient, s: Scope, platform: ConnectorPlatformKey) {
  const profile = await getWorkProfile(db, s);
  if (!profile?.industryId) return null;
  const industryId = profile.industryId;
  const [tasks, connectors, useCases, demos] = await Promise.all([
    db.industryTask.findMany({ where: { industryId }, select: { taskId: true, weight: true, task: { select: { name: true } } } }),
    db.connector.findMany({
      select: {
        id: true,
        name: true,
        tasks: { select: { taskId: true } },
        systems: { select: { systemId: true } },
        availability: { select: { platform: true, status: true, sourceUrl: true, lastVerifiedAt: true } },
      },
    }),
    db.industryConnectorUseCase.findMany({ where: { industryId }, select: { connectorId: true, text: true } }),
    db.connectorDemo.findMany({ where: { OR: [{ industryId }, { industryId: null }] }, select: { id: true, connectorId: true, industryId: true } }),
  ]);
  const scored = scoreConnectors({
    tasks: tasks.map((t) => ({ taskId: t.taskId, weight: t.weight })),
    selectedSystemIds: profile.selectedSystemIds,
    platform,
    connectors: connectors.map((c) => ({
      id: c.id,
      name: c.name,
      taskIds: c.tasks.map((t) => t.taskId),
      systemIds: c.systems.map((x) => x.systemId),
      availability: Object.fromEntries(c.availability.map((a) => [a.platform, { status: a.status, sourceUrl: a.sourceUrl, lastVerifiedAt: a.lastVerifiedAt } satisfies Availability])),
    })),
  });
  const taskName = new Map(tasks.map((t) => [t.taskId, t.task.name]));
  const useCase = new Map(useCases.map((u) => [u.connectorId, u.text]));
  // Industry demo first, generic demo as fallback.
  const demoFor = (connectorId: string) => demos.find((d) => d.connectorId === connectorId && d.industryId === industryId)?.id ?? demos.find((d) => d.connectorId === connectorId && !d.industryId)?.id ?? null;
  const enrich = (c: ScoredConnector): Recommendation => ({ ...c, useCase: useCase.get(c.id) ?? null, coveredTasks: c.coveredTaskIds.map((t) => taskName.get(t) ?? t), demoId: demoFor(c.id) });
  return { profile, recommended: scored.recommended.map(enrich), unavailable: scored.unavailable.map(enrich) };
}

export function toPlatformEnum(p: ConnectorPlatformKey): ConnectorPlatform {
  return p;
}
