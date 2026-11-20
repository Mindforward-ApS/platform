import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Colors for raster output (certificate PDF, badge PNG, link-preview image). Those cannot use CSS variables,
// so they read the light palette straight from src/styles/tokens.css — still the only place colors are defined.

const KEYS = ["bg", "surface", "surface-sunken", "line", "ink", "ink-muted", "ink-subtle", "accent", "accent-soft", "rav", "night", "night-raised", "night-line", "night-accent"] as const;
export type RasterColor = (typeof KEYS)[number];

/** Parses `--mf-<name>: #hex;` from the first (light) block of tokens.css. Later (dark) blocks are ignored. */
export function parseRasterTokens(css: string): Record<RasterColor, string> {
  const out: Partial<Record<RasterColor, string>> = {};
  for (const m of css.matchAll(/--mf-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    const key = m[1] as RasterColor;
    if ((KEYS as readonly string[]).includes(key) && !out[key]) out[key] = m[2]!.toLowerCase();
  }
  const missing = KEYS.filter((k) => !out[k]);
  if (missing.length) throw new Error(`tokens.css is missing raster colors: ${missing.join(", ")}`);
  return out as Record<RasterColor, string>;
}

let cached: Record<RasterColor, string> | undefined;

export function rasterTokens(): Record<RasterColor, string> {
  cached ??= parseRasterTokens(readFileSync(join(process.cwd(), "src/styles/tokens.css"), "utf8"));
  return cached;
}
