import type { CertificateLevelConfig } from "@/lib/config/certificates";

// Pure certificate eligibility (docs/05 § 8). The service loads the facts; this decides.

export type Tier = "COPILOT_CHAT" | "COPILOT_M365" | "UNKNOWN";

export interface TrackModule {
  slug: string;
  requiredLicense: Tier | null;
}

export interface PassedModule {
  slug: string;
  passedAt: Date;
}

export interface EligibilityInput {
  level: CertificateLevelConfig;
  /** Modules that exist on the learner's track (ModuleTrack). */
  trackModules: readonly TrackModule[];
  /** The learner's license tier on this track (Copilot only); null = not relevant. */
  learnerTier: Tier | null;
  passed: readonly PassedModule[];
  /** Placement test "kan springes over" (M5). alwaysRequired modules stay required. */
  skippable?: ReadonlySet<string>;
}

export interface EligibilityResult {
  eligible: boolean;
  required: string[];
  missing: string[];
}

/** A module needing the paid Copilot license is only required (and only counts) for learners who have it. */
export function tierAllows(moduleTier: Tier | null, learnerTier: Tier | null): boolean {
  if (moduleTier !== "COPILOT_M365") return true;
  return learnerTier === "COPILOT_M365";
}

export function requiredModulesFor(input: Omit<EligibilityInput, "passed">): string[] {
  const onTrack = new Map(input.trackModules.map((m) => [m.slug, m]));
  const skippable = input.skippable ?? new Set<string>();
  return input.level.requiredModules.filter((slug) => {
    const mod = onTrack.get(slug);
    if (!mod || !tierAllows(mod.requiredLicense, input.learnerTier)) return false;
    return !skippable.has(slug) || input.level.alwaysRequired.includes(slug);
  });
}

export function checkEligibility(input: EligibilityInput): EligibilityResult {
  const required = requiredModulesFor(input);
  const passed = new Set(input.passed.map((p) => p.slug));
  const missing = required.filter((slug) => !passed.has(slug));
  return { eligible: required.length > 0 && missing.length === 0, required, missing };
}
