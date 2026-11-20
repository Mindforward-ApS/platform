import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { moduleSchema, type ModuleContent, type Step } from "@/lib/schemas/module";
import {
  displayPct,
  evaluateStep,
  hintMultiplier,
  pickBestAttempt,
  scoreJudgment,
  scoreModule,
  scorePromptTask,
  scoreQuiz,
  scoreSpotError,
  stepPoints,
  type ModuleStepScore,
} from "@/server/scoring/score";

const mod: ModuleContent = moduleSchema.parse(JSON.parse(readFileSync("content/modules/core-prompt-01.json", "utf8")));
function step<T extends Step["type"]>(id: string, type: T): Extract<Step, { type: T }> {
  const s = mod.steps.find((x) => x.id === id);
  if (!s || s.type !== type) throw new Error(`no ${type} step ${id}`);
  return s as Extract<Step, { type: T }>;
}

const clickTask = step("ny-samtale", "CLICK_TASK");
const quizSingle = step("bedste-prompt", "QUIZ");
const promptTask = step("prompt-svarmail", "PROMPT_TASK");
const spotError = step("find-fejlene", "SPOT_ERROR");
const judgment = step("maa-du", "JUDGMENT");
const quizMulti = step("hvad-hoerer-til", "QUIZ");

describe("hint multipliers (docs/05 § 5)", () => {
  it("none and level 1 = 1.0, level 2 = 0.75, level 3 = 0", () => {
    expect([0, 1, 2, 3].map((l) => hintMultiplier(l as 0 | 1 | 2 | 3))).toEqual([1, 1, 0.75, 0]);
  });

  it("hint level 3 gives 0 points even for a perfect answer", () => {
    expect(stepPoints(35, 1, 3)).toBe(0);
    const outcome = evaluateStep(quizSingle, { type: "QUIZ", optionIds: ["c"] });
    expect(outcome.passed).toBe(true);
    expect(stepPoints(quizSingle.points, outcome.fraction, 3)).toBe(0);
  });

  it("hint level 1 costs nothing, level 2 costs 25 %", () => {
    expect(stepPoints(10, 1, 1)).toBe(10);
    expect(stepPoints(20, 1, 2)).toBe(15);
  });
});

describe("QUIZ", () => {
  it("single-select: full points only for the one correct option", () => {
    expect(scoreQuiz(quizSingle, ["c"])).toEqual({ fraction: 1, passed: true });
    expect(scoreQuiz(quizSingle, ["a"])).toEqual({ fraction: 0, passed: false });
    expect(scoreQuiz(quizSingle, ["c", "a"])).toEqual({ fraction: 0, passed: false });
    expect(scoreQuiz(quizSingle, [])).toEqual({ fraction: 0, passed: false });
  });

  it("multi-select: max(0, (right − wrong) / number right); passed only at full score", () => {
    expect(scoreQuiz(quizMulti, ["a", "b", "c", "d"])).toEqual({ fraction: 1, passed: true });
    expect(scoreQuiz(quizMulti, ["a", "b", "c"])).toEqual({ fraction: 0.75, passed: false });
    expect(scoreQuiz(quizMulti, ["a", "b", "c", "d", "e"])).toEqual({ fraction: 0.75, passed: false });
    expect(scoreQuiz(quizMulti, ["a", "e", "f"])).toEqual({ fraction: 0, passed: false });
    expect(scoreQuiz(quizMulti, ["a", "b", "c", "d", "e", "f"]).fraction).toBe(0.5);
  });

  it("ignores duplicate and unknown option ids", () => {
    expect(scoreQuiz(quizMulti, ["a", "a", "a", "zz"]).fraction).toBe(0.25);
  });
});

describe("SPOT_ERROR", () => {
  it("(TP − 0.5·FP) / errors, floored at 0", () => {
    expect(scoreSpotError(spotError, ["s2", "s3", "s4"])).toEqual({ fraction: 1, passed: true });
    expect(scoreSpotError(spotError, ["s2", "s3", "s1"])).toEqual({ fraction: 0.5, passed: false });
    expect(scoreSpotError(spotError, ["s1", "s5"])).toEqual({ fraction: 0, passed: false });
  });

  it("passes when all errors are found with at most one false positive", () => {
    const r = scoreSpotError(spotError, ["s2", "s3", "s4", "s1"]);
    expect(r.passed).toBe(true);
    expect(r.fraction).toBeCloseTo(2.5 / 3, 10);
    expect(scoreSpotError(spotError, ["s2", "s3", "s4", "s1", "s5"]).passed).toBe(false);
  });
});

describe("JUDGMENT", () => {
  it("CORRECT = full, PARTIAL = half, WRONG = 0; passed only on CORRECT", () => {
    expect(scoreJudgment(judgment, "c")).toEqual({ fraction: 1, passed: true });
    expect(scoreJudgment(judgment, "d")).toEqual({ fraction: 0.5, passed: false });
    expect(scoreJudgment(judgment, "a")).toEqual({ fraction: 0, passed: false });
    expect(scoreJudgment(judgment, "nope")).toEqual({ fraction: 0, passed: false });
  });
});

describe("CLICK_TASK", () => {
  it("full or 0", () => {
    expect(evaluateStep(clickTask, { type: "CLICK_TASK", passed: true })).toEqual({ fraction: 1, passed: true });
    expect(evaluateStep(clickTask, { type: "CLICK_TASK", passed: false })).toEqual({ fraction: 0, passed: false });
  });
});

describe("PROMPT_TASK rubric norm (docs/05 § 4)", () => {
  const worked = { opgave: 2, kontekst: 2, "maalgruppe-tone": 1, format: 0, faktadisciplin: 2 } as const;

  it("norm = Σ(weight·score/2) / Σ weight — worked example 0.786 passes", () => {
    const r = scorePromptTask(promptTask.rubric, worked);
    expect(r.norm).toBeCloseTo(5.5 / 7, 10);
    expect(r.passed).toBe(true);
  });

  it("fails below passScore", () => {
    const r = scorePromptTask(promptTask.rubric, { opgave: 2, kontekst: 1, "maalgruppe-tone": 1, format: 0, faktadisciplin: 0 });
    expect(r.norm).toBeCloseTo(3.5 / 7, 10);
    expect(r.passed).toBe(false);
  });

  it("fails when a required criterion scores 0 even with norm ≥ passScore", () => {
    const r = scorePromptTask({ ...promptTask.rubric, passScore: 0.5 }, { opgave: 2, kontekst: 0, "maalgruppe-tone": 2, format: 2, faktadisciplin: 2 });
    expect(r.norm).toBeCloseTo(5 / 7, 10);
    expect(r.passed).toBe(false);
  });

  it("missing criteria count as 0", () => {
    expect(scorePromptTask(promptTask.rubric, {}).norm).toBe(0);
  });
});

function workedExample(promptHint: 0 | 1 | 2 | 3): ModuleStepScore[] {
  const s = (st: Step, fraction: number, passed: boolean, hint: 0 | 1 | 2 | 3 = 0): ModuleStepScore => ({
    stepId: st.id,
    maxPoints: st.points,
    earned: stepPoints(st.points, fraction, hint),
    passed,
    mustPass: st.mustPass === true,
  });
  const prompt = scorePromptTask(promptTask.rubric, { opgave: 2, kontekst: 2, "maalgruppe-tone": 1, format: 0, faktadisciplin: 2 });
  const spot = scoreSpotError(spotError, ["s2", "s3", "s1"]);
  const multi = scoreQuiz(quizMulti, ["a", "b", "c"]);
  return [
    s(clickTask, 1, true, 1),
    s(quizSingle, 1, true),
    s(promptTask, prompt.norm, prompt.passed, promptHint),
    s(spotError, spot.fraction, spot.passed),
    s(judgment, 1, true),
    s(quizMulti, multi.fraction, multi.passed),
  ];
}

describe("module score — worked example docs/05 § 5", () => {
  it("73.1 % with hint 2 on the PROMPT_TASK → not passed", () => {
    const r = scoreModule(workedExample(2), mod.passThreshold);
    expect(r.max).toBe(100);
    expect(r.earned).toBeCloseTo(73.125, 3);
    expect(r.scorePct).toBeCloseTo(73.125, 3);
    expect(displayPct(r.scorePct)).toBe(73);
    expect(r.passed).toBe(false);
    expect(r.mustPassFailed).toEqual([]);
  });

  it("80.0 % without hint 2 → passed", () => {
    const r = scoreModule(workedExample(0), mod.passThreshold);
    expect(r.scorePct).toBeCloseTo(80, 6);
    expect(r.passed).toBe(true);
  });

  it("79.9 % fails", () => {
    const r = scoreModule(
      [
        { stepId: "a", maxPoints: 100, earned: 79.9, passed: true, mustPass: false },
        { stepId: "r", maxPoints: 0, earned: 0, passed: true, mustPass: false },
      ],
      0.8,
    );
    expect(r.scorePct).toBeCloseTo(79.9, 6);
    expect(r.passed).toBe(false);
  });

  it("a failed must-pass JUDGMENT fails the module despite ≥ 80 %", () => {
    const steps = workedExample(0).map((s) => (s.stepId === "maa-du" ? { ...s, earned: 7.5, passed: false } : s));
    // Raise the rest so the total is clearly above 80 %.
    const boosted = steps.map((s) => (s.stepId === "prompt-svarmail" ? { ...s, earned: 35 } : s.stepId === "find-fejlene" ? { ...s, earned: 20 } : s));
    const r = scoreModule(boosted, 0.8);
    expect(r.scorePct).toBeGreaterThanOrEqual(80);
    expect(r.passed).toBe(false);
    expect(r.mustPassFailed).toEqual(["maa-du"]);
  });

  it("a module with no graded steps scores 0 and does not pass", () => {
    expect(scoreModule([], 0.8)).toMatchObject({ scorePct: 0, passed: false });
  });
});

describe("best attempt (docs/05 § 6)", () => {
  it("highest score among passed attempts, otherwise highest score", () => {
    expect(
      pickBestAttempt([
        { id: "a", scorePct: 95, passed: false },
        { id: "b", scorePct: 82, passed: true },
        { id: "c", scorePct: 88, passed: true },
      ])?.id,
    ).toBe("c");
    expect(
      pickBestAttempt([
        { id: "a", scorePct: 60, passed: false },
        { id: "b", scorePct: 75, passed: false },
      ])?.id,
    ).toBe("b");
    expect(pickBestAttempt([])).toBeNull();
  });

  it("a later lower attempt never replaces an earlier better one", () => {
    expect(
      pickBestAttempt([
        { id: "first", scorePct: 90, passed: true },
        { id: "later", scorePct: 81, passed: true },
      ])?.id,
    ).toBe("first");
  });
});
