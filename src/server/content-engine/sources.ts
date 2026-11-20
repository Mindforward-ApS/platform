import { z } from "zod";
import registryJson from "../../../content/features/registry.json";
import sourcesJson from "../../../content/sources.json";

// Typed access to content/sources.json and content/features/registry.json (docs/06 § 1, § 12).
// Both are bundled via JSON imports so serverless functions never read the repo at runtime.

const TRACK = z.enum(["CHATGPT", "COPILOT", "CLAUDE", "GEMINI"]);
export const CONCEPTS = ["ASSISTANTS", "CONNECTORS", "SCHEDULED_TASKS", "AGENTS", "PROMPTING", "FILES_AND_DATA", "SECURITY_PRIVACY", "OTHER"] as const;

export const parserConfigSchema = z.strictObject({
  version: z.number().int().min(1),
  /** HTML: CSS selector of the article body (falls back to main, then body). */
  contentSelector: z.string().optional(),
  /** HTML: heading tags that start an entry (["h2","h3"]); MARKDOWN: heading levels ([2,3]). */
  entryHeadings: z.array(z.union([z.string().regex(/^h[1-6]$/), z.number().int().min(1).max(6)])).optional(),
  /** JSON: keep items whose `field` (dot path, `[]` = any array element) contains one of `includes`. */
  jsonFilter: z.strictObject({ field: z.string(), includes: z.array(z.string()).min(1) }).optional(),
});
export type ParserConfig = z.infer<typeof parserConfigSchema>;

export const sourceConfigSchema = z.strictObject({
  key: z.string().regex(/^[a-z0-9-]+$/),
  track: TRACK,
  url: z.url().regex(/^https:\/\//),
  parserType: z.enum(["HTML", "MARKDOWN", "JSON", "ATOM"]),
  parser: parserConfigSchema,
  fetchMode: z.enum(["DIRECT", "BROWSER_FALLBACK"]),
  enabled: z.boolean(),
  autoPublishAllowed: z.boolean(),
  attribution: z.string().max(300).nullable(),
  title: z.string().max(200),
  note: z.string().optional(),
});
export type SourceConfig = z.infer<typeof sourceConfigSchema>;

const sourcesFileSchema = z.object({ version: z.literal(1), sources: z.array(sourceConfigSchema).min(1) });

export const featureSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+\.[a-z0-9-]+$/),
  track: TRACK,
  concept: z.enum(CONCEPTS),
  aliases: z.array(z.string().min(2)).min(1),
  status: z.enum(["ACTIVE", "DEPRECATED", "RETIRED"]),
  retireDate: z.iso.date().optional(),
  replacementIds: z.array(z.string()).optional(),
});
export type Feature = z.infer<typeof featureSchema>;

const registryFileSchema = z.object({ version: z.literal(1), features: z.array(featureSchema) });

export function parseSourcesFile(data: unknown): SourceConfig[] {
  const sources = sourcesFileSchema.parse(data).sources;
  if (new Set(sources.map((s) => s.key)).size !== sources.length) throw new Error("content/sources.json: duplicate key");
  return sources;
}

export function parseRegistryFile(data: unknown): Feature[] {
  const features = registryFileSchema.parse(data).features;
  const ids = new Set(features.map((f) => f.id));
  if (ids.size !== features.length) throw new Error("content/features/registry.json: duplicate id");
  for (const f of features) for (const r of f.replacementIds ?? []) if (!ids.has(r)) throw new Error(`registry: ${f.id} replacement ${r} unknown`);
  return features;
}

let sourcesCache: SourceConfig[] | undefined;
let registryCache: Feature[] | undefined;

export function sourceConfigs(): SourceConfig[] {
  sourcesCache ??= parseSourcesFile(sourcesJson);
  return sourcesCache;
}

export function sourceConfig(key: string): SourceConfig | undefined {
  return sourceConfigs().find((s) => s.key === key);
}

export function featureRegistry(): Feature[] {
  registryCache ??= parseRegistryFile(registryJson);
  return registryCache;
}
