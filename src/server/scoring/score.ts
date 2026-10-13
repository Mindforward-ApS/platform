import { scoringConfig, type HintLevel } from "@/lib/config/scoring";
import type { Step } from "@/lib/schemas/module";

// Pure scoring (docs/05-moduler-og-scoring.md § 4–6). The server computes every score; a model never does.
// Calculations keep full precision; only display rounds to whole percent.

type QuizStep = Extract<Step, { type: "QUIZ" }>;
type SpotErrorStep = Extract<Step, { type: "SPOT_ERROR" }>;
type JudgmentStep = Extract<Step, { type: "JUDGMENT" }>;
type PromptTaskStep = Extract<Step, { type: "PROMPT_TASK" }>;
export type Rubric = PromptTaskStep["rubric"];
export type CriterionScore = 0 | 1 | 2;

/** Share of a step's points earned (0–1) before the hint multiplier, and whether the step counts as passed. */
export interface StepOutcome {
  fraction: number;
  passed: boolean;
}

/** Structured answers the server scores. PROMPT_TASK carries rubric scores already validated against the rubric. */
export type ScoredAnswer =
  | { type: "QUIZ"; optionIds: string[] }
  | { type: "JUDGMENT"; optionId: string }
  | { type: "SPOT_ERROR"; segmentIds: string[] }
  | { type: "CLICK_TASK"; passed: boolean }
  | { type: "PROMPT_TASK"; criteria: Record<string, CriterionScore> };

export function hintMultiplier(level: HintLevel): number {
  return scoringConfig.hintMultipliers[level];
}

export function stepPoints(maxPoints: number, fraction: number, hintLevel: HintLevel): number {
  return maxPoints * Math.min(1, Math.max(0, fraction)) * hintMultiplier(hintLevel);
}

export function scoreQuiz(step: QuizStep, optionIds: readonly string[]): StepOutcome {
  const selected = new Set(optionIds.filter((id) => step.options.some((o) => o.id === id)));
  if (!step.multiSelect) {
    const only = [...selected][0];
    const correct = selected.size === 1 && step.options.some((o) => o.id === only && o.correct);
    return { fraction: correct ? 1 : 0, passed: correct };
  }
  const totalRight = step.options.filter((o) => o.correct).length;
  let right = 0;
  let wrong = 0;
  for (const o of step.options) {
    if (!selected.has(o.id)) continue;
    if (o.correct) right++;
    else wrong++;
  }
  const fraction = totalRight === 0 ? 0 : Math.max(0, (right - wrong) / totalRight);
  return { fraction, passed: fraction === 1 };
}

export function scoreSpotError(step: SpotErrorStep, segmentIds: readonly string[]): StepOutcome {
  const selected = new Set(segmentIds);
  const errors = step.segments.filter((s) => s.isError).length;
  let tp = 0;
  let fp = 0;
  for (const s of step.segments) {
    if (!selected.has(s.id)) continue;
    if (s.isError) tp++;
    else fp++;
  }
  const { falsePositivePenalty, maxFalsePositivesToPass } = scoringConfig.spotError;
  const fraction = errors === 0 ? 0 : Math.min(1, Math.max(0, (tp - falsePositivePenalty * fp) / errors));
  return { fraction, passed: tp === errors && fp <= maxFalsePositivesToPass };
}

export function scoreJudgment(step: JudgmentStep, optionId: string): StepOutcome {
  const option = step.options.find((o) => o.id === optionId);
  if (!option) return { fraction: 0, passed: false };
  return { fraction: scoringConfig.judgment[option.verdict], passed: option.verdict === "CORRECT" };
}

/** norm = Σ(weight·score/2) / Σ weight; passed ⇔ norm ≥ passScore and every required criterion ≥ 1. */
export function scorePromptTask(rubric: Rubric, scores: Readonly<Record<string, CriterionScore>>): StepOutcome & { norm: number } {
  let weighted = 0;
  let weights = 0;
  let requiredOk = true;
  for (const c of rubric.criteria) {
    const score = scores[c.id] ?? 0;
    weighted += (c.weight * score) / 2;
    weights += c.weight;
    if (c.required && score < 1) requiredOk = false;
  }
  const norm = weights === 0 ? 0 : weighted / weights;
  return { norm, fraction: norm, passed: requiredOk && norm >= rubric.passScore - 1e-9 };
}

/** Dispatch by step type. READ/DEMO are not graded. */
export function evaluateStep(step: Step, answer: ScoredAnswer): StepOutcome {
  if (step.type !== answer.type) throw new Error(`answer type ${answer.type} does not match step ${step.id} (${step.type})`);
  switch (answer.type) {
    case "QUIZ":
      return scoreQuiz(step as QuizStep, answer.optionIds);
    case "JUDGMENT":
      return scoreJudgment(step as JudgmentStep, answer.optionId);
    case "SPOT_ERROR":
      return scoreSpotError(step as SpotErrorStep, answer.segmentIds);
    case "CLICK_TASK":
      return { fraction: answer.passed ? 1 : 0, passed: answer.passed };
    case "PROMPT_TASK": {
      const r = scorePromptTask((step as PromptTaskStep).rubric, answer.criteria);
      return { fraction: r.norm, passed: r.passed };
    }
  }
}

export interface ModuleStepScore {
  stepId: string;
  maxPoints: number;
  /** Points after the hint multiplier, full precision. */
  earned: number;
  passed: boolean;
  mustPass: boolean;
}

export interface ModuleScore {
  earned: number;
  max: number;
  /** 0–100, full precision. */
  scorePct: number;
  passed: boolean;
  /** Step ids of failed must-pass steps. */
  mustPassFailed: string[];
}

/** moduleScore = Σ earned / Σ max (graded steps only). Passed ⇔ score ≥ passThreshold AND every mustPass step passed. */
export function scoreModule(steps: readonly ModuleStepScore[], passThreshold: number): ModuleScore {
  const graded = steps.filter((s) => s.maxPoints > 0);
  const earned = graded.reduce((sum, s) => sum + s.earned, 0);
  const max = graded.reduce((sum, s) => sum + s.maxPoints, 0);
  const ratio = max === 0 ? 0 : earned / max;
  const mustPassFailed = graded.filter((s) => s.mustPass && !s.passed).map((s) => s.stepId);
  // Epsilon only absorbs floating-point noise (e.g. 27.4999999 + … = 79.99999); 79.9 % still fails.
  const passed = max > 0 && ratio >= passThreshold - 1e-9 && mustPassFailed.length === 0;
  return { earned, max, scorePct: ratio * 100, passed, mustPassFailed };
}

export function displayPct(scorePct: number): number {
  return Math.round(scorePct);
}

/** docs/05 § 6: highest score among passed attempts, otherwise highest score. Ties keep the earlier attempt. */
export function pickBestAttempt<T extends { scorePct: number; passed: boolean }>(attempts: readonly T[]): T | null {
  let best: T | null = null;
  for (const a of attempts) {
    if (!best) best = a;
    else if (a.passed && !best.passed) best = a;
    else if (a.passed === best.passed && a.scorePct > best.scorePct) best = a;
  }
  return best;
}
