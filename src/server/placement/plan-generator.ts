import { placementConfig } from "@/lib/config/placement";
import type { Catalog, PlacementAnswers, PlacementTest } from "@/lib/schemas/placement";
import { scorePlacement, type AreaState, type PlacementScore } from "./scoring";

// Pure plan generator (docs/11 M5; content/curriculum.md "Niveautest → plan"). No I/O: the caller passes the
// modules that exist (catalog and/or published DB modules) and gets an ordered plan back.
//
// Order: Level 1 → ROLE module for the job role → Level 2 → Level 3. Inside each group:
//   1. (Level 1 only) the B2C free modules in config order, unless skippable,
//   2. modules from an UNCERTAIN area ("prioriteres øverst"),
//   3. the rest in curriculum order,
//   4. skippable modules (their area was SECURE) last — still shown, marked "kan springes over".
// Copilot: modules that need COPILOT_M365 are filtered out for COPILOT_CHAT (and "Ved ikke" = COPILOT_CHAT).

type TrackKey = "CHATGPT" | "COPILOT" | "CLAUDE" | "GEMINI";
type LicenseTier = "COPILOT_CHAT" | "COPILOT_M365" | "UNKNOWN";
type JobRole = "SALES" | "HR" | "FINANCE" | "CUSTOMER_SERVICE" | "LEADERSHIP" | "OPERATIONS" | "OTHER";

export interface PlanModule {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  type: "CORE" | "FEATURE" | "ROLE" | "NEWS";
  tracks: TrackKey[];
  /** Copilot tier the module needs (module JSON requiresTier); only applied on the COPILOT track. */
  requiredLicense: LicenseTier | null;
  roles: JobRole[];
  minutes: number;
  sortOrder: number;
}

export type PlanGroup = "LEVEL_1" | "ROLE" | "LEVEL_2" | "LEVEL_3";

export interface PlanItem {
  moduleId: string;
  title: string;
  level: 1 | 2 | 3;
  type: PlanModule["type"];
  minutes: number;
  group: PlanGroup;
  /** Area was SECURE: shown but not required (never for config.alwaysRequired). */
  skippable: boolean;
  /** Area was UNCERTAIN: moved to the top of its group. */
  prioritized: boolean;
}

export interface Plan {
  track: TrackKey;
  /** COPILOT only; UNKNOWN/missing is treated as COPILOT_CHAT. null for other tracks. */
  effectiveTier: "COPILOT_CHAT" | "COPILOT_M365" | null;
  items: PlanItem[];
  /** Copilot modules left out because they need a paid license ("Til jer med licens"). */
  excludedForTier: string[];
  score: PlacementScore;
}

export interface PlanInput {
  test: PlacementTest;
  answers: PlacementAnswers;
  licenseTier: LicenseTier | null;
  jobRole: JobRole | null;
  modules: PlanModule[];
  rules?: Pick<typeof placementConfig, "alwaysRequired" | "freeFirst">;
}

const GROUP_ORDER: PlanGroup[] = ["LEVEL_1", "ROLE", "LEVEL_2", "LEVEL_3"];

function groupOf(m: PlanModule): PlanGroup {
  if (m.type === "ROLE") return "ROLE";
  return m.level === 1 ? "LEVEL_1" : m.level === 2 ? "LEVEL_2" : "LEVEL_3";
}

export function effectiveTierFor(track: TrackKey, tier: LicenseTier | null): Plan["effectiveTier"] {
  if (track !== "COPILOT") return null;
  return tier === "COPILOT_M365" ? "COPILOT_M365" : "COPILOT_CHAT";
}

export function generatePlan(input: PlanInput): Plan {
  const { test } = input;
  const rules = input.rules ?? placementConfig;
  const track = test.track;
  const score = scorePlacement(test, input.answers);
  const effectiveTier = effectiveTierFor(track, input.licenseTier);

  const areaStateOf = new Map<string, AreaState>();
  for (const area of test.areas) {
    const state = score.areas.find((a) => a.id === area.id)?.state;
    if (state) for (const id of area.moduleIds) areaStateOf.set(id, state);
  }

  const excludedForTier: string[] = [];
  const candidates = input.modules
    .filter((m) => m.type !== "NEWS" && m.tracks.includes(track))
    .filter((m) => {
      const needsPaid = m.requiredLicense === "COPILOT_M365" || m.requiredLicense === "UNKNOWN";
      if (effectiveTier === "COPILOT_CHAT" && needsPaid) {
        excludedForTier.push(m.id);
        return false;
      }
      return true;
    })
    .filter((m) => m.type !== "ROLE" || (input.jobRole !== null && input.jobRole !== "OTHER" && m.roles.includes(input.jobRole)));

  const items = candidates.map((m) => {
    const state = areaStateOf.get(m.id);
    return {
      module: m,
      item: {
        moduleId: m.id,
        title: m.title,
        level: m.level,
        type: m.type,
        minutes: m.minutes,
        group: groupOf(m),
        skippable: state === "SECURE" && !(rules.alwaysRequired as readonly string[]).includes(m.id),
        prioritized: state === "UNCERTAIN",
      } satisfies PlanItem,
    };
  });

  const freeIndex = (id: string) => {
    const i = (rules.freeFirst as readonly string[]).indexOf(id);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  const bucket = ({ item }: (typeof items)[number]) => {
    if (item.skippable) return 3;
    if (item.group === "LEVEL_1" && Number.isFinite(freeIndex(item.moduleId))) return 0;
    return item.prioritized ? 1 : 2;
  };

  const sorted = [...items].sort((a, b) => {
    const g = GROUP_ORDER.indexOf(a.item.group) - GROUP_ORDER.indexOf(b.item.group);
    if (g !== 0) return g;
    const k = bucket(a) - bucket(b);
    if (k !== 0) return k;
    if (bucket(a) === 0) return freeIndex(a.item.moduleId) - freeIndex(b.item.moduleId);
    return a.module.sortOrder - b.module.sortOrder || a.module.id.localeCompare(b.module.id);
  });

  return { track, effectiveTier, items: sorted.map((s) => s.item), excludedForTier, score };
}

/** Catalog (content/placement/catalog.v1.json) → generator input; catalog order is the curriculum order. */
export function catalogToPlanModules(catalog: Catalog): PlanModule[] {
  return catalog.modules.map((m, index) => ({
    id: m.id,
    title: m.title,
    level: m.level,
    type: m.type,
    tracks: m.tracks,
    requiredLicense: m.requiresTier,
    roles: m.roles,
    minutes: m.minutes,
    sortOrder: index,
  }));
}
