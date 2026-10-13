import { z } from "zod";
import { scoringConfig, type HintLevel } from "@/lib/config/scoring";
import type { ModuleContent, Step } from "@/lib/schemas/module";
import { evaluateStep, scoreModule, stepPoints, type CriterionScore, type ModuleScore, type ModuleStepScore, type ScoredAnswer } from "@/server/scoring/score";

// Pure attempt state machine (docs/05 § 6–7). The service in ./attempts.ts loads rows and calls these rules;
// nothing here touches the database, so every transition is unit-tested.

export type AttemptErrorCode =
  | "NOT_FOUND"
  | "ATTEMPT_CLOSED"
  | "STEP_NOT_FOUND"
  | "NOT_GRADED_STEP"
  | "WRONG_STEP_TYPE"
  | "OUT_OF_ORDER"
  | "ALREADY_ANSWERED"
  | "NO_SUBMISSIONS_LEFT"
  | "INVALID_ANSWER"
  | "INVALID_HINT_LEVEL"
  | "INCOMPLETE"
  | "RATE_LIMITED"
  | "MODULE_UNAVAILABLE";

export class AttemptError extends Error {
  constructor(public readonly code: AttemptErrorCode) {
    super(code);
    this.name = "AttemptError";
  }
}

export type GradedStep = Exclude<Step, { type: "READ" | "DEMO" }>;
export type GradingStatusValue = "PENDING" | "GRADED" | "ERROR";

/** The columns of StepResult the rules need (never free text). */
export interface StepResultRow {
  stepId: string;
  gradingStatus: GradingStatusValue;
  passed: boolean;
  hintLevelUsed: number;
  tryCount: number;
  answer: unknown;
  rubricScores: unknown;
}

export function isGraded(step: Step): step is GradedStep {
  return step.type !== "READ" && step.type !== "DEMO";
}

export function maxSubmissionsOf(step: Extract<Step, { type: "PROMPT_TASK" }>): number {
  return step.maxSubmissions ?? scoringConfig.promptTask.defaultMaxSubmissions;
}

export function asHintLevel(n: number): HintLevel {
  return (n <= 0 ? 0 : n >= 3 ? 3 : n) as HintLevel;
}

/**
 * open     — not answered yet (no row, hints only, or grading ERROR without a graded submission)
 * answered — graded, but a PROMPT_TASK may still be resubmitted (not passed, submissions left)
 * closed   — final for this attempt
 */
export type StepStatus = "open" | "answered" | "closed";

export function stepStatus(step: Step, row: StepResultRow | undefined): StepStatus {
  if (!isGraded(step)) return "closed";
  if (!row || row.gradingStatus !== "GRADED") return "open";
  if (step.type === "PROMPT_TASK" && !row.passed && row.tryCount < maxSubmissionsOf(step)) return "answered";
  return "closed";
}

export function findStep(content: ModuleContent, stepId: string): Step {
  const step = content.steps.find((s) => s.id === stepId);
  if (!step) throw new AttemptError("STEP_NOT_FOUND");
  return step;
}

/** Graded steps before `stepId` must all have a graded answer (READ/DEMO never block). */
export function assertInOrder(content: ModuleContent, rows: ReadonlyMap<string, StepResultRow>, stepId: string): void {
  for (const s of content.steps) {
    if (s.id === stepId) return;
    if (isGraded(s) && stepStatus(s, rows.get(s.id)) === "open") throw new AttemptError("OUT_OF_ORDER");
  }
}

/** Validates that `stepId` can receive an answer now and returns the step. */
export function assertCanAnswer(content: ModuleContent, rows: ReadonlyMap<string, StepResultRow>, stepId: string): GradedStep {
  const step = findStep(content, stepId);
  if (!isGraded(step)) throw new AttemptError("NOT_GRADED_STEP");
  assertInOrder(content, rows, stepId);
  const status = stepStatus(step, rows.get(stepId));
  if (status === "closed") throw new AttemptError(step.type === "PROMPT_TASK" ? "NO_SUBMISSIONS_LEFT" : "ALREADY_ANSWERED");
  return step;
}

/** Hints are taken one level at a time on a step that is not closed. Returns the new level (idempotent for already taken levels). */
export function nextHintLevel(content: ModuleContent, rows: ReadonlyMap<string, StepResultRow>, stepId: string, level: number): HintLevel {
  const step = findStep(content, stepId);
  if (!isGraded(step)) throw new AttemptError("NOT_GRADED_STEP");
  if (!Number.isInteger(level) || level < 1 || level > 3) throw new AttemptError("INVALID_HINT_LEVEL");
  const row = rows.get(stepId);
  const current = row?.hintLevelUsed ?? 0;
  if (level <= current) return asHintLevel(current);
  if (stepStatus(step, row) === "closed") throw new AttemptError("ALREADY_ANSWERED");
  assertInOrder(content, rows, stepId);
  if (level !== current + 1) throw new AttemptError("INVALID_HINT_LEVEL");
  return asHintLevel(level);
}

// ── Answer payloads from the client (Zod at the boundary) ─────────────────
const ids = z.array(z.string().min(1).max(48)).max(20);
export const answerSchemas = {
  QUIZ: z.strictObject({ optionIds: ids.min(1) }),
  JUDGMENT: z.strictObject({ optionId: z.string().min(1).max(48) }),
  SPOT_ERROR: z.strictObject({ segmentIds: ids }),
  PROMPT_TASK: z.strictObject({ text: z.string().max(4000) }),
} as const;

/** Parses a client answer for a deterministic step and checks that every id exists in the step. */
export function parseDeterministicAnswer(step: GradedStep, raw: unknown): ScoredAnswer {
  switch (step.type) {
    case "QUIZ": {
      const r = answerSchemas.QUIZ.safeParse(raw);
      const known = new Set(step.options.map((o) => o.id));
      if (!r.success || !r.data.optionIds.every((id) => known.has(id))) throw new AttemptError("INVALID_ANSWER");
      const optionIds = [...new Set(r.data.optionIds)];
      if (!step.multiSelect && optionIds.length !== 1) throw new AttemptError("INVALID_ANSWER");
      return { type: "QUIZ", optionIds };
    }
    case "JUDGMENT": {
      const r = answerSchemas.JUDGMENT.safeParse(raw);
      if (!r.success || !step.options.some((o) => o.id === r.data.optionId)) throw new AttemptError("INVALID_ANSWER");
      return { type: "JUDGMENT", optionId: r.data.optionId };
    }
    case "SPOT_ERROR": {
      const r = answerSchemas.SPOT_ERROR.safeParse(raw);
      const known = new Set(step.segments.map((s) => s.id));
      if (!r.success || !r.data.segmentIds.every((id) => known.has(id))) throw new AttemptError("INVALID_ANSWER");
      return { type: "SPOT_ERROR", segmentIds: [...new Set(r.data.segmentIds)] };
    }
    default:
      throw new AttemptError("WRONG_STEP_TYPE");
  }
}

// ── Stored answers → score (recomputed with full precision at finish) ──────
const storedRubricScores = z.array(z.object({ criterionId: z.string(), score: z.union([z.literal(0), z.literal(1), z.literal(2)]) }));

export function storedAnswerToScored(step: GradedStep, row: StepResultRow): ScoredAnswer | null {
  if (row.gradingStatus !== "GRADED") return null;
  switch (step.type) {
    case "QUIZ": {
      const r = z.object({ optionIds: z.array(z.string()) }).safeParse(row.answer);
      return r.success ? { type: "QUIZ", optionIds: r.data.optionIds } : null;
    }
    case "JUDGMENT": {
      const r = z.object({ optionId: z.string() }).safeParse(row.answer);
      return r.success ? { type: "JUDGMENT", optionId: r.data.optionId } : null;
    }
    case "SPOT_ERROR": {
      const r = z.object({ segmentIds: z.array(z.string()) }).safeParse(row.answer);
      return r.success ? { type: "SPOT_ERROR", segmentIds: r.data.segmentIds } : null;
    }
    case "CLICK_TASK":
      return { type: "CLICK_TASK", passed: row.passed };
    case "PROMPT_TASK": {
      const r = storedRubricScores.safeParse(row.rubricScores ?? []);
      const criteria: Record<string, CriterionScore> = {};
      if (r.success) for (const c of r.data) criteria[c.criterionId] = c.score;
      return { type: "PROMPT_TASK", criteria };
    }
  }
}

export function scoreStepRow(step: GradedStep, row: StepResultRow | undefined): ModuleStepScore {
  const base = { stepId: step.id, maxPoints: step.points, mustPass: step.mustPass === true };
  const answer = row ? storedAnswerToScored(step, row) : null;
  if (!row || !answer) return { ...base, earned: 0, passed: false };
  const outcome = evaluateStep(step, answer);
  return { ...base, earned: stepPoints(step.points, outcome.fraction, asHintLevel(row.hintLevelUsed)), passed: outcome.passed };
}

/** Every graded step needs a graded answer before the attempt can be finished. */
export function missingSteps(content: ModuleContent, rows: ReadonlyMap<string, StepResultRow>): string[] {
  return content.steps.filter((s) => isGraded(s) && stepStatus(s, rows.get(s.id)) === "open").map((s) => s.id);
}

export function computeAttemptScore(content: ModuleContent, rows: ReadonlyMap<string, StepResultRow>): ModuleScore & { steps: ModuleStepScore[] } {
  const steps = content.steps.filter(isGraded).map((s) => scoreStepRow(s, rows.get(s.id)));
  return { ...scoreModule(steps, content.passThreshold ?? scoringConfig.defaultPassThreshold), steps };
}
