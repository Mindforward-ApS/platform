import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { skinConfigSchema, type SkinConfig } from "./skin-schema";

export { skinConfigSchema, type SkinConfig } from "./skin-schema";

// Skins are data: content/sandbox-skins/<skinKey>.json, chosen via Track.skinKey (no code change to switch).
const SKIN_DIR = join(process.cwd(), "content", "sandbox-skins");
const cache = new Map<string, SkinConfig>();

export class UnknownSkinError extends Error {
  constructor(public readonly skinKey: string) {
    super(`unknown sandbox skin ${skinKey}`);
    this.name = "UnknownSkinError";
  }
}

export function loadSkin(skinKey: string): SkinConfig {
  const hit = cache.get(skinKey);
  if (hit) return hit;
  if (!/^[a-z0-9-]{1,32}$/.test(skinKey)) throw new UnknownSkinError(skinKey);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(SKIN_DIR, `${skinKey}.json`), "utf8"));
  } catch {
    throw new UnknownSkinError(skinKey);
  }
  const skin = skinConfigSchema.parse(raw);
  if (skin.key !== skinKey) throw new Error(`skin file ${skinKey}.json declares key ${skin.key}`);
  cache.set(skinKey, skin);
  return skin;
}
