import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { subprocessorsFileSchema } from "@/lib/schemas/legal";

const file = subprocessorsFileSchema.parse(JSON.parse(readFileSync("content/legal/subprocessors.json", "utf8")));

describe("content/legal/subprocessors.json", () => {
  it("lists each vendor once", () => {
    const names = file.subprocessors.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
  it("covers the vendors in the launch gate list", () => {
    for (const v of ["Vercel", "Neon", "Anthropic", "Stripe", "Resend", "Sentry"]) expect(file.subprocessors.map((s) => s.name)).toContain(v);
  });
});
