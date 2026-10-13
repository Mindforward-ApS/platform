import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { placementConfig } from "../src/lib/config/placement";
import { MARKETING_CONSENT } from "../src/lib/legal/marketing-consent";
import { catalogSchema, placementTestSchema, type Catalog } from "../src/lib/schemas/placement";

// M5 part of `pnpm content:validate`: placement tests (content/placement/<track>.v1.json), the module catalog,
// and the canonical consent text (content/legal/). Returns error strings; content-validate.ts prints them.

const PLACEMENT_DIR = join("content", "placement");
const TEST_FILE = /^(chatgpt|copilot|claude)\.v(\d+)\.json$/;

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function validateCatalog(errors: string[]): Catalog | undefined {
  const path = join(PLACEMENT_DIR, "catalog.v1.json");
  const parsed = catalogSchema.safeParse(readJson(path));
  if (!parsed.success) {
    errors.push(...parsed.error.issues.map((i) => `${path} [zod] ${i.path.join(".")}: ${i.message}`));
    return undefined;
  }
  // Modules that exist as content must agree with the catalog (the catalog only fills the gaps).
  const moduleDir = join("content", "modules");
  for (const f of existsSync(moduleDir) ? readdirSync(moduleDir).filter((x) => x.endsWith(".json")) : []) {
    const m = readJson(join(moduleDir, f)) as { id?: string; level?: number; type?: string; tracks?: string[]; requiresTier?: string | null; roles?: string[] };
    const c = parsed.data.modules.find((x) => x.id === m.id);
    if (!c) {
      if (m.type !== "NEWS") errors.push(`${path}: module ${m.id} (content/modules/${f}) is missing in the catalog`);
      continue;
    }
    if (c.level !== m.level) errors.push(`${path}: ${c.id} level ${c.level} ≠ module level ${m.level}`);
    if (c.type !== m.type) errors.push(`${path}: ${c.id} type ${c.type} ≠ module type ${m.type}`);
    if ((c.requiresTier ?? null) !== (m.requiresTier ?? null)) errors.push(`${path}: ${c.id} requiresTier differs from the module`);
    if ([...c.tracks].sort().join() !== [...(m.tracks ?? [])].sort().join()) errors.push(`${path}: ${c.id} tracks differ from the module`);
    if ([...c.roles].sort().join() !== [...(m.roles ?? [])].sort().join()) errors.push(`${path}: ${c.id} roles differ from the module`);
  }
  return parsed.data;
}

export function validatePlacementContent(): { errors: string[]; tests: number } {
  const errors: string[] = [];
  const catalog = validateCatalog(errors);
  const catalogIds = new Set(catalog?.modules.map((m) => m.id) ?? []);
  const files = readdirSync(PLACEMENT_DIR).filter((f) => TEST_FILE.test(f));

  for (const track of ["chatgpt", "copilot", "claude"]) {
    if (!files.some((f) => f.startsWith(`${track}.`))) errors.push(`${PLACEMENT_DIR}: missing placement test for ${track}`);
  }

  for (const f of files) {
    const label = join(PLACEMENT_DIR, f);
    const [, slug, version] = TEST_FILE.exec(f) ?? [];
    const parsed = placementTestSchema.safeParse(readJson(join(PLACEMENT_DIR, f)));
    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((i) => `${label} [zod] ${i.path.join(".")}: ${i.message}`));
      continue;
    }
    const t = parsed.data;
    if (t.track.toLowerCase() !== slug) errors.push(`${label}: track ${t.track} does not match the file name`);
    if (String(t.version) !== version) errors.push(`${label}: version ${t.version} does not match the file name`);
    if (t.questions.length > placementConfig.maxQuestions) errors.push(`${label}: ${t.questions.length} questions > maxQuestions ${placementConfig.maxQuestions}`);
    const seconds = t.questions.reduce((n, q) => n + q.estimatedSeconds, 0) + t.profileQuestions.length * placementConfig.profileQuestionSeconds;
    if (seconds > placementConfig.timeBudgetSeconds) errors.push(`${label}: estimated ${seconds} s > time budget ${placementConfig.timeBudgetSeconds} s`);
    for (const a of t.areas) for (const id of a.moduleIds) if (catalog && !catalogIds.has(id)) errors.push(`${label}: area ${a.id} references unknown module ${id}`);
  }

  const consentFile = MARKETING_CONSENT.file;
  if (!existsSync(consentFile)) errors.push(`${consentFile}: missing`);
  else if (readFileSync(consentFile, "utf8").trim() !== MARKETING_CONSENT.text) {
    errors.push(`${consentFile}: differs from src/lib/legal/marketing-consent.ts — a new wording needs a new version`);
  }

  return { errors, tests: files.length };
}
