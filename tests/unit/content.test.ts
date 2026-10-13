import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadWorld, validateModule } from "../../scripts/content-validate";

const WORLD = "content/sandbox-world";

function allFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) allFiles(full, out);
    else out.push(full);
  }
  return out;
}

// M2: the seed world must contain no real-looking personal data (regex check; the full PII filter arrives in M3).
const PII_PATTERNS: Record<string, RegExp> = {
  cpr: /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}[-\s]?\d{4}\b/,
  iban: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/,
  card: /\b(?:\d[ -]?){13,19}\b/,
  dkAccount: /\b(reg\.?\s?nr|kontonr|konto)\D{0,10}\d{4}[\s-]?\d{6,10}\b/i,
};

describe("Nordlys seed world", () => {
  it("validates (Zod) with all referenced files present", () => {
    const { world, errors } = loadWorld();
    expect(errors).toEqual([]);
    expect(world?.mail).toHaveLength(25);
    expect(world?.crm).toHaveLength(30);
  });

  const files = allFiles(WORLD);
  for (const file of files) {
    it(`${file}: no real personal data`, () => {
      const text = readFileSync(file, "utf8");
      for (const [kind, re] of Object.entries(PII_PATTERNS)) expect(text, `${kind} in ${file}`).not.toMatch(re);
      const emails = text.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? [];
      expect(emails.filter((e) => !e.replace(/\.$/, "").endsWith(".example"))).toEqual([]);
      const phones = text.match(/\+45[\s\d]{8,12}/g) ?? [];
      expect(phones.filter((p) => !/^\+45 0000 0\d{3}/.test(p.trim()))).toEqual([]);
    });
  }

  it("keeps the built-in learning points (overtime Q3 +38 %, fuel total formula bug)", () => {
    const budget = JSON.parse(readFileSync(join(WORLD, "budget.json"), "utf8")) as { rows: { post: string; q1: number; q2: number; q3: number; q4: number; total: number; totalFormula: string; budget: number }[] };
    const overtime = budget.rows.find((r) => r.post === "Overtid")!;
    expect(Math.round((overtime.q3 / (overtime.budget / 4) - 1) * 100)).toBe(38);
    const fuel = budget.rows.find((r) => r.post === "Brændstof")!;
    expect(fuel.total).toBe(fuel.q1 + fuel.q2 + fuel.q3);
    expect(fuel.totalFormula).toMatch(/SUM\(B\d+:D\d+\)/);
  });
});

describe("content:validate", () => {
  it("rejects an invalid module fixture", () => {
    const data = JSON.parse(readFileSync("tests/fixtures/modules/invalid-module.json", "utf8")) as unknown;
    const errors = validateModule(data, loadWorld().world, "invalid-module.json");
    expect(errors.some((e) => e.includes("[json-schema]"))).toBe(true);
    expect(errors.some((e) => e.includes("[zod]"))).toBe(true);
  });

  it("accepts core-prompt-01 against the world", () => {
    const data = JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")) as unknown;
    expect(validateModule(data, loadWorld().world, "core-prompt-01.json")).toEqual([]);
  });

  it("rejects an attachment that is not a Nordlys file", () => {
    const data = JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")) as { steps: { type: string; attachments?: string[] }[] };
    data.steps.find((s) => s.type === "PROMPT_TASK")!.attachments = ["f99"];
    expect(validateModule(data, loadWorld().world, "x").join("\n")).toMatch(/f99/);
  });
});

describe("prices", () => {
  it("never appear in components (they come from src/lib/config/plans.ts / DB)", () => {
    const hits = allFiles("src/components").filter((f) => /\b49\b|\b490\b|4900/.test(readFileSync(f, "utf8")));
    expect(hits).toEqual([]);
  });
});
