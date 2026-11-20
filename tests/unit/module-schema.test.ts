import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateWithJsonSchema } from "../../scripts/content-validate";
import { countWords, moduleSchema } from "@/lib/schemas/module";

// docs/05: Zod (runtime) and JSON Schema (content/schema/module.schema.json) must agree on every fixture.
// Zod is a strict superset: it also enforces rules JSON Schema cannot (READ ≤ 120 words).

const valid = JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")) as Record<string, unknown>;
type Json = Record<string, unknown>;
const clone = (): Json => structuredClone(valid);
const steps = (m: Json) => m.steps as Json[];
const stepOf = (m: Json, type: string) => steps(m).find((s) => s.type === type) as Json;

const mutants: Record<string, (m: Json) => void> = {
  "missing title": (m) => delete m.title,
  "unknown top-level field": (m) => (m.surprise = true),
  "bad module id": (m) => (m.id = "Prompt_01"),
  "READ with points": (m) => (stepOf(m, "READ").points = 5),
  "graded step without hints": (m) => delete stepOf(m, "QUIZ").hints,
  "only two hints": (m) => (stepOf(m, "QUIZ").hints = (stepOf(m, "QUIZ").hints as Json[]).slice(0, 2)),
  "single-select quiz with two correct": (m) => {
    const q = steps(m).find((s) => s.type === "QUIZ" && s.multiSelect === false) as Json;
    (q.options as Json[]).forEach((o) => (o.correct = true));
  },
  "DATA_SECURITY judgment without mustPass": (m) => delete stepOf(m, "JUDGMENT").mustPass,
  "judgment with two CORRECT": (m) => (stepOf(m, "JUDGMENT").options as Json[]).forEach((o) => (o.verdict = "CORRECT")),
  "COPILOT track without requiresTier": (m) => delete m.requiresTier,
  "requiresTier unknown outside NEWS": (m) => (m.requiresTier = "unknown"),
  "NEWS module with a CLICK_TASK": (m) => (m.type = "NEWS"),
  "ROLE module without roles": (m) => {
    m.type = "ROLE";
    m.roles = [];
  },
  "STANDARD module of 20 minutes": (m) => (m.minutes = 20),
  "camelCase target id": (m) => {
    const click = stepOf(m, "CLICK_TASK");
    ((click.assertion as Json).all as Json[])[0] = { sequence: [{ type: "UI_CLICKED", target: "nav.newChat" }, { type: "CHAT_FILE_ATTACHED" }] };
  },
  "prototype path in predicate": (m) => {
    stepOf(m, "CLICK_TASK").assertion = { state: { path: "__proto__.polluted", op: "exists" } };
  },
  "predicate with two operators": (m) => {
    stepOf(m, "CLICK_TASK").assertion = { all: [{ event: { type: "UI_CLICKED" } }], any: [{ event: { type: "UI_CLICKED" } }] };
  },
  "MIN_WORDS check without value": (m) => {
    (stepOf(m, "PROMPT_TASK").checks as Json[]).push({ kind: "MIN_WORDS", severity: "BLOCK", message: "for kort" });
  },
  "INCLUDES_ANY check with a value": (m) => {
    (stepOf(m, "PROMPT_TASK").checks as Json[]).push({ kind: "INCLUDES_ANY", severity: "WARN", message: "x", terms: ["a"], value: 3 });
  },
  "spot-error segment flagged as error without explanation": (m) => {
    const seg = (stepOf(m, "SPOT_ERROR").segments as Json[]).find((s) => s.isError) as Json;
    delete seg.explanation;
  },
  "rubric with one criterion": (m) => {
    const r = stepOf(m, "PROMPT_TASK").rubric as Json;
    r.criteria = (r.criteria as Json[]).slice(0, 1);
  },
  "16 steps": (m) => (m.steps = Array.from({ length: 16 }, () => structuredClone(stepOf(valid, "READ")))),
  "event type not UPPER_SNAKE": (m) => {
    stepOf(m, "CLICK_TASK").assertion = { event: { type: "uiClicked" } };
  },
};

describe("module schema parity (Zod ⇔ JSON Schema)", () => {
  it("both accept core-prompt-01", () => {
    expect(validateWithJsonSchema(valid).errors).toEqual([]);
    const z = moduleSchema.safeParse(valid);
    expect(z.success, JSON.stringify(z.error?.issues.slice(0, 3))).toBe(true);
  });

  for (const [name, mutate] of Object.entries(mutants)) {
    it(`both reject: ${name}`, () => {
      const m = clone();
      mutate(m);
      expect(validateWithJsonSchema(m).valid, "JSON Schema should reject").toBe(false);
      expect(moduleSchema.safeParse(m).success, "Zod should reject").toBe(false);
    });
  }
});

describe("schema regressions", () => {
  it("accepts a non-must-pass JUDGMENT (e.g. CONFIDENTIALITY) in both schemas", () => {
    const m = clone();
    const j = stepOf(m, "JUDGMENT");
    j.category = "CONFIDENTIALITY";
    delete j.mustPass;
    expect(validateWithJsonSchema(m).errors).toEqual([]);
    expect(moduleSchema.safeParse(m).success).toBe(true);
  });
});

describe("Zod-only rules", () => {
  it("rejects a READ step over 120 words", () => {
    const m = clone();
    stepOf(m, "READ").body = Array.from({ length: 121 }, (_, i) => `ord${i}`).join(" ");
    expect(moduleSchema.safeParse(m).success).toBe(false);
  });

  it("accepts exactly 120 words", () => {
    const m = clone();
    stepOf(m, "READ").body = Array.from({ length: 120 }, (_, i) => `ord${i}`).join(" ");
    expect(moduleSchema.safeParse(m).success).toBe(true);
  });

  it("counts words without markdown symbols", () => {
    expect(countWords("**Opgave** — hvad skal AI'en lave?\n\n1. Kontekst")).toBe(6);
  });

  it("rejects duplicate step ids", () => {
    const m = clone();
    steps(m)[1]!.id = steps(m)[0]!.id;
    expect(moduleSchema.safeParse(m).success).toBe(false);
  });
});
