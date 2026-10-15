import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseRasterTokens } from "@/server/brand/raster-tokens";

describe("raster colors come from tokens.css", () => {
  it("reads the light palette (first definition wins) and fails loudly when a color is missing", () => {
    const t = parseRasterTokens(readFileSync("src/styles/tokens.css", "utf8"));
    expect(t.accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(t.ink).not.toBe(t.surface);
    expect(() => parseRasterTokens("--mf-ink: #000000;")).toThrow(/missing/);
  });
});
