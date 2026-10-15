import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moduleSchema, type Step } from "@/lib/schemas/module";
import { sanitizeAttempt, sanitizeStep, type SanitizeRow } from "@/server/modules/sanitize";

const mod = moduleSchema.parse(JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")));
const FORBIDDEN_KEYS = ["correct", "verdict", "isError", "errorType", "explanation", "assertion", "description", "exampleSolution", "successMessage", "checks", "rubric", "goldenSet"];

function keysDeep(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysDeep(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysDeep(v, out);
    }
  }
  return out;
}

/** Secret strings from the module JSON that must not appear in unanswered output. */
function secretsOf(step: Step): string[] {
  switch (step.type) {
    case "PROMPT_TASK":
      // Check terms (e.g. "fredag") also occur in the scenario, so only the `checks` key is asserted absent.
      return [step.exampleSolution, ...step.rubric.criteria.map((c) => c.description), ...step.checks.map((c) => c.message)];
    case "QUIZ":
      return [step.explanation, ...step.options.map((o) => o.feedback)];
    case "JUDGMENT":
      return [step.explanation, ...step.options.map((o) => o.feedback)];
    case "SPOT_ERROR":
      return step.segments.flatMap((s) => (s.explanation ? [s.explanation] : []));
    case "CLICK_TASK":
      return [step.successMessage, JSON.stringify(step.assertion)];
    default:
      return [];
  }
}

const row = (stepId: string, extra: Partial<SanitizeRow> = {}): SanitizeRow => ({
  stepId,
  gradingStatus: "GRADED",
  passed: true,
  hintLevelUsed: 0,
  tryCount: 1,
  answer: null,
  rubricScores: null,
  checksReport: null,
  ...extra,
});

describe("sanitizer never leaks answers", () => {
  for (const step of mod.steps) {
    it(`${step.id} (${step.type}) unanswered: no answer keys or secret texts`, () => {
      const out = sanitizeStep(step, undefined, { attemptId: "a1" });
      const json = JSON.stringify(out);
      const keys = keysDeep(out);
      for (const k of FORBIDDEN_KEYS) expect(keys.has(k), `${step.id} leaks key ${k}`).toBe(false);
      for (const s of secretsOf(step)) expect(json.includes(s), `${step.id} leaks "${s.slice(0, 40)}"`).toBe(false);
      expect(out.hints).toEqual([]);
    });
  }

  it("hints 1–2 reveal only the taken hint texts, not the answers", () => {
    const step = mod.steps.find((s) => s.id === "maa-du")!;
    const out = sanitizeStep(step, row("maa-du", { gradingStatus: "PENDING", hintLevelUsed: 2, tryCount: 0, passed: false }), { attemptId: "a1" });
    expect(out.hints.map((h) => h.level)).toEqual([1, 2]);
    expect(keysDeep(out).has("verdict")).toBe(false);
    expect(out.result).toBeUndefined();
  });

  it("PROMPT_TASK: hint 3 reveals the example solution but never rubric descriptions", () => {
    const step = mod.steps.find((s) => s.id === "prompt-svarmail")!;
    const out = sanitizeStep(step, row(step.id, { gradingStatus: "PENDING", hintLevelUsed: 3, tryCount: 0, passed: false }), { attemptId: "a1" });
    expect(out.type === "PROMPT_TASK" && out.exampleSolution).toBeTruthy();
    expect(keysDeep(out).has("description")).toBe(false);
    expect(out.type === "PROMPT_TASK" && out.criteria).toBeFalsy();
  });

  it("PROMPT_TASK: after the first submission shows criterion labels + scores, never descriptions", () => {
    const step = mod.steps.find((s) => s.id === "prompt-svarmail")!;
    if (step.type !== "PROMPT_TASK") throw new Error();
    const out = sanitizeStep(step, row(step.id, { passed: false, rubricScores: [{ criterionId: "opgave", score: 2 }] }), { attemptId: "a1", feedback: { criteria: { opgave: "Klar opgave." } } });
    if (out.type !== "PROMPT_TASK") throw new Error();
    expect(out.criteria?.map((c) => c.label)).toEqual(step.rubric.criteria.map((c) => c.label));
    expect(out.criteria?.[0]).toMatchObject({ id: "opgave", score: 2, feedback: "Klar opgave." });
    expect(JSON.stringify(out)).not.toContain(step.rubric.criteria[0]!.description);
    expect(out.exampleSolution).toBeUndefined();
  });

  it("answered QUIZ/JUDGMENT/SPOT_ERROR reveal the solution and the learner's own answer", () => {
    const quiz = sanitizeStep(mod.steps.find((s) => s.id === "bedste-prompt")!, row("bedste-prompt", { answer: { optionIds: ["c"] } }), { attemptId: "a1" });
    expect(quiz.type === "QUIZ" && quiz.options.find((o) => o.id === "c")?.correct).toBe(true);
    expect(quiz.result).toMatchObject({ points: 10, passed: true, answer: { optionIds: ["c"] } });
    const spot = sanitizeStep(mod.steps.find((s) => s.id === "find-fejlene")!, row("find-fejlene", { answer: { segmentIds: ["s2"] }, passed: false }), { attemptId: "a1" });
    expect(spot.type === "SPOT_ERROR" && spot.segments.filter((s) => s.isError).length).toBe(3);
  });

  it("CLICK_TASK never sends its assertion, even after passing", () => {
    const step = mod.steps.find((s) => s.id === "ny-samtale")!;
    const out = sanitizeStep(step, row(step.id, { answer: { passed: true } }), { attemptId: "a1" });
    expect(keysDeep(out).has("assertion")).toBe(false);
    expect(out.type === "CLICK_TASK" && out.successMessage).toBeTruthy();
  });

  it("quiz order is shuffled deterministically per attempt", () => {
    const step = mod.steps.find((s) => s.id === "hvad-hoerer-til")!;
    const a = sanitizeStep(step, undefined, { attemptId: "x" });
    const b = sanitizeStep(step, undefined, { attemptId: "x" });
    expect(a).toEqual(b);
  });

  it("a full unanswered attempt state contains no secrets", () => {
    const state = sanitizeAttempt({ attempt: { id: "a1", status: "IN_PROGRESS", scorePct: null, passed: false }, slug: mod.id, content: mod, maxPoints: 100, rows: new Map(), ownerTexts: new Map() });
    const json = JSON.stringify(state);
    for (const s of mod.steps.flatMap(secretsOf)) expect(json.includes(s)).toBe(false);
    expect(state.canFinish).toBe(false);
  });
});

describe("prompt task attachments", () => {
  it("shows sandbox file names, never raw file ids", () => {
    const step = mod.steps.find((s) => s.type === "PROMPT_TASK" && (s.attachments?.length ?? 0) > 0);
    expect(step).toBeDefined();
    const out = sanitizeStep(step!, undefined, { attemptId: "a1" }) as { attachments: string[] };
    expect(out.attachments).toContain("Tone of voice Nordlys.md");
    expect(out.attachments.some((a) => /^f\d+$/.test(a))).toBe(false);
  });
});
