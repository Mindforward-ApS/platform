import type { PrismaClient } from "@/generated/prisma/client";
import type { Classification } from "./prompts/content-classify.v1";
import { featureRegistry, type Feature } from "./sources";

// Impact analysis (docs/06 § 12): map tool feature names to registry ids via aliases; find PUBLISHED modules that
// reference them (featureRefs) or mention an alias (searchText ILIKE) as a safety net.

const norm = (s: string) => s.trim().toLowerCase();

export function mapFeatureNames(names: string[], track: string, registry: Feature[] = featureRegistry()): { ids: string[]; unknown: string[] } {
  const ids = new Set<string>();
  const unknown: string[] = [];
  for (const name of names) {
    const hit = registry.find((f) => f.track === track && (f.id === name || f.aliases.some((a) => norm(a) === norm(name))));
    if (hit) ids.add(hit.id);
    else unknown.push(name);
  }
  return { ids: [...ids], unknown };
}

export function deprecatedFeatureIds(c: Classification, track: string, registry: Feature[] = featureRegistry()) {
  return mapFeatureNames(
    c.deprecations.map((d) => d.feature),
    track,
    registry,
  );
}

export interface AffectedModule {
  moduleId: string;
  slug: string;
  title: string;
  type: string;
  versionId: string;
  version: number;
  featureRefs: string[];
}

export async function findAffectedModules(db: PrismaClient, featureIds: string[], registry: Feature[] = featureRegistry()): Promise<AffectedModule[]> {
  if (featureIds.length === 0) return [];
  const aliases = registry.filter((f) => featureIds.includes(f.id)).flatMap((f) => f.aliases);
  const versions = await db.moduleVersion.findMany({
    where: {
      publishedIn: { isNot: null },
      OR: [{ featureRefs: { hasSome: featureIds } }, ...aliases.map((a) => ({ searchText: { contains: a, mode: "insensitive" as const } }))],
    },
    select: { id: true, version: true, title: true, featureRefs: true, module: { select: { id: true, slug: true, type: true } } },
  });
  return versions.map((v) => ({ moduleId: v.module.id, slug: v.module.slug, title: v.title, type: v.module.type, versionId: v.id, version: v.version, featureRefs: v.featureRefs }));
}

/** Retire date of the first deprecated feature that has one (drives Module.retiringAt banner). */
export function retireDateFor(featureIds: string[], registry: Feature[] = featureRegistry()): Date | null {
  const d = registry.find((f) => featureIds.includes(f.id) && f.retireDate)?.retireDate;
  return d ? new Date(`${d}T00:00:00Z`) : null;
}
