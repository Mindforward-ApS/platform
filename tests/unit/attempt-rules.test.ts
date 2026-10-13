import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moduleSchema } from "@/lib/schemas/module";
import {
  assertCanAnswer,
  computeAttemptScore,
  missingSteps,
  nextHintLevel,
  parseDeterministicAnswer,
  stepStatus,
  type GradedStep,
  type StepResultRow,
} from "@/server/modules/attempt-rules";

const mod = moduleSchema.parse(JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")));
const graded = (id: string) => mod.steps.find((s) => s.id === id) as GradedStep;

const row = (stepId: string, extra: Partial<StepResultRow> = {}): StepResultRow => ({
  stepId,
  gradingStatus: "GRADED",
  passed: true,
  hintLevelUsed: 0,
  tryCount: 1,
  answer: null,
  rubricScores: null,
  ...extra,
});

const rows = (...r: StepResultRow[]) => new Map(r.map((x) => [x.stepId, x]));

const ALL_CORRECT = rows(
  row("ny-samtale", { answer: { passed: true } }),
  row("bedste-prompt", { answer: { optionIds: ["c"] } }),
  row("prompt-svarmail", { rubricScores: ["opgave", "kontekst", "maalgruppe-tone", "format", "faktadisciplin"].map((criterionId) => ({ criterionId, score: 2 })) }),
  row("find-fejlene", { answer: { segmentIds: ["s2", "s3", "s4"] } }),
  row("maa-du", { answer: { optionId: "c" } }),
  row("hvad-hoerer-til", { answer: { optionIds: ["a", "b", "c", "d"] } }),
);

describe("attempt state machine", () => {
  it("the first graded step can be answered; READ steps never block", () => {
    expect(assertCanAnswer(mod, rows(), "ny-samtale").id).toBe("ny-samtale");
  });

  it("rejects out-of-order answers", () => {
    expect(() => assertCanAnswer(mod, rows(), "bedste-prompt")).toThrow("OUT_OF_ORDER");
    expect(() => assertCanAnswer(mod, rows(row("ny-samtale", { gradingStatus: "PENDING" })), "bedste-prompt")).toThrow("OUT_OF_ORDER");
  });

  it("rejects a second answer to QUIZ/JUDGMENT/SPOT_ERROR/CLICK_TASK", () => {
    expect(() => assertCanAnswer(mod, ALL_CORRECT, "bedste-prompt")).toThrow("ALREADY_ANSWERED");
    expect(() => assertCanAnswer(mod, ALL_CORRECT, "maa-du")).toThrow("ALREADY_ANSWERED");
    expect(() => assertCanAnswer(mod, ALL_CORRECT, "ny-samtale")).toThrow("ALREADY_ANSWERED");
  });

  it("PROMPT_TASK accepts resubmissions until passed or maxSubmissions is reached", () => {
    const base = [row("ny-samtale"), row("bedste-prompt")];
    const failed = (tryCount: number) => rows(...base, row("prompt-svarmail", { passed: false, tryCount }));
    expect(stepStatus(graded("prompt-svarmail"), failed(1).get("prompt-svarmail"))).toBe("answered");
    expect(assertCanAnswer(mod, failed(2), "prompt-svarmail").id).toBe("prompt-svarmail");
    expect(() => assertCanAnswer(mod, failed(3), "prompt-svarmail")).toThrow("NO_SUBMISSIONS_LEFT");
    expect(() => assertCanAnswer(mod, rows(...base, row("prompt-svarmail", { passed: true })), "prompt-svarmail")).toThrow("NO_SUBMISSIONS_LEFT");
    // A graded (even failed) PROMPT_TASK lets the learner move on.
    expect(assertCanAnswer(mod, failed(1), "find-fejlene").id).toBe("find-fejlene");
  });

  it("a grading ERROR keeps the step open (the submission does not count)", () => {
    const r = rows(row("ny-samtale"), row("bedste-prompt"), row("prompt-svarmail", { gradingStatus: "ERROR", passed: false, tryCount: 0 }));
    expect(stepStatus(graded("prompt-svarmail"), r.get("prompt-svarmail"))).toBe("open");
    expect(() => assertCanAnswer(mod, r, "find-fejlene")).toThrow("OUT_OF_ORDER");
  });

  it("READ/DEMO cannot be answered", () => {
    expect(() => assertCanAnswer(mod, rows(), "intro")).toThrow("NOT_GRADED_STEP");
    expect(() => assertCanAnswer(mod, rows(), "nope")).toThrow("STEP_NOT_FOUND");
  });
});

describe("hints", () => {
  it("are taken one level at a time", () => {
    expect(nextHintLevel(mod, rows(), "ny-samtale", 1)).toBe(1);
    expect(() => nextHintLevel(mod, rows(), "ny-samtale", 2)).toThrow("INVALID_HINT_LEVEL");
    expect(nextHintLevel(mod, rows(row("ny-samtale", { gradingStatus: "PENDING", hintLevelUsed: 1 })), "ny-samtale", 2)).toBe(2);
    expect(() => nextHintLevel(mod, rows(), "ny-samtale", 4)).toThrow("INVALID_HINT_LEVEL");
  });

  it("re-requesting a taken level is idempotent; a closed step takes no new hints", () => {
    expect(nextHintLevel(mod, rows(row("ny-samtale", { gradingStatus: "PENDING", hintLevelUsed: 2 })), "ny-samtale", 1)).toBe(2);
    expect(() => nextHintLevel(mod, ALL_CORRECT, "bedste-prompt", 1)).toThrow("ALREADY_ANSWERED");
  });
});

describe("answer parsing", () => {
  it("rejects unknown ids, multiple options for single-select and wrong shapes", () => {
    expect(() => parseDeterministicAnswer(graded("bedste-prompt"), { optionIds: ["zz"] })).toThrow("INVALID_ANSWER");
    expect(() => parseDeterministicAnswer(graded("bedste-prompt"), { optionIds: ["a", "c"] })).toThrow("INVALID_ANSWER");
    expect(() => parseDeterministicAnswer(graded("maa-du"), { optionId: 1 })).toThrow("INVALID_ANSWER");
    expect(() => parseDeterministicAnswer(graded("find-fejlene"), { segmentIds: ["s1"], extra: true })).toThrow("INVALID_ANSWER");
    expect(parseDeterministicAnswer(graded("hvad-hoerer-til"), { optionIds: ["a", "a", "b"] })).toEqual({ type: "QUIZ", optionIds: ["a", "b"] });
  });
});

describe("finishing", () => {
  it("lists unanswered graded steps", () => {
    expect(missingSteps(mod, rows())).toEqual(["ny-samtale", "bedste-prompt", "prompt-svarmail", "find-fejlene", "maa-du", "hvad-hoerer-til"]);
    expect(missingSteps(mod, ALL_CORRECT)).toEqual([]);
  });

  it("all correct → 100 % passed; hint 3 on the PROMPT_TASK → 65 % not passed", () => {
    expect(computeAttemptScore(mod, ALL_CORRECT)).toMatchObject({ scorePct: 100, passed: true, mustPassFailed: [] });
    const withHint3 = new Map(ALL_CORRECT);
    withHint3.set("prompt-svarmail", { ...row("prompt-svarmail"), hintLevelUsed: 3, rubricScores: ALL_CORRECT.get("prompt-svarmail")?.rubricScores });
    const r = computeAttemptScore(mod, withHint3);
    expect(r.scorePct).toBeCloseTo(65, 6);
    expect(r.passed).toBe(false);
  });

  it("a wrong must-pass JUDGMENT fails the module", () => {
    const r = new Map(ALL_CORRECT);
    r.set("maa-du", row("maa-du", { passed: false, answer: { optionId: "d" } }));
    const s = computeAttemptScore(mod, r);
    expect(s.scorePct).toBeCloseTo(92.5, 6);
    expect(s.passed).toBe(false);
    expect(s.mustPassFailed).toEqual(["maa-du"]);
  });

  it("a skipped CLICK_TASK scores 0", () => {
    const r = new Map(ALL_CORRECT);
    r.set("ny-samtale", row("ny-samtale", { passed: false, answer: { passed: false, skipped: true } }));
    expect(computeAttemptScore(mod, r).scorePct).toBeCloseTo(90, 6);
  });
});
