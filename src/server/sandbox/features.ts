import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { CONCEPTS } from "./events";

// Feature guide per track (content/sandbox-features/<skinKey>.json): the sandbox menu lists these in order and each
// opens /sandkasse/<track>/funktion/<id> in a new tab — what it does, where it is in the real tool, and practice.

const feature = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40),
  label: z.string().min(1).max(40),
  icon: z.enum(["chats", "lock", "sparkle", "file", "grid", "link", "send", "book", "bulb", "clock", "lightning"]),
  what: z.string().min(1).max(400),
  inTool: z.array(z.string().min(1).max(400)).min(1).max(8),
  practice: z.enum(["ready", "soon"]),
  concept: z.enum(CONCEPTS),
  tryIt: z.string().min(1).max(400).optional(),
});
const file = z.strictObject({ track: z.string(), checked: z.string(), source: z.string(), features: z.array(feature).min(1).max(30) });
export type SandboxFeature = z.infer<typeof feature>;

const cache = new Map<string, SandboxFeature[] | null>();
export function loadFeatures(skinKey: string): SandboxFeature[] | null {
  if (!/^[a-z]+$/.test(skinKey)) return null;
  if (!cache.has(skinKey)) {
    const path = join(process.cwd(), "content/sandbox-features", `${skinKey}.json`);
    cache.set(skinKey, existsSync(path) ? file.parse(JSON.parse(readFileSync(path, "utf8"))).features : null);
  }
  return cache.get(skinKey) ?? null;
}

export function loadFeatureFile(skinKey: string) {
  const path = join(process.cwd(), "content/sandbox-features", `${skinKey}.json`);
  return existsSync(path) ? file.parse(JSON.parse(readFileSync(path, "utf8"))) : null;
}
