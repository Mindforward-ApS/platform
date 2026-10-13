import { createHash } from "node:crypto";
import { z } from "zod";
import { scoringConfig } from "@/lib/config/scoring";
import type { ModuleContent, Step } from "@/lib/schemas/module";
import { displayPct } from "@/server/scoring/score";
import { computeAttemptScore, isGraded, maxSubmissionsOf, missingSteps, scoreStepRow, stepStatus, type StepResultRow } from "./attempt-rules";
import type { PlayerCriterion, PlayerHint, PlayerResult, PlayerState, PlayerStep, PlayerStepResult } from "./player-types";

// The ONLY builder of client-facing player data (docs/05 § 7): the client never receives `correct`, `verdict`,
// `isError`, `assertion`, rubric `description` or `exampleSolution` before the step is answered (exampleSolution:
// also after hint 3). The learner's own prompt text is only added for the owner (ownerTexts from owner-feedback.ts).

/** Owner-only feedback decoded from StepResult.aiFeedback (see src/server/scoring/owner-feedback.ts). */
export interface OwnerFeedback {
  overallFeedback?: string;
  criteria?: Record<string, string>;
}

export interface SanitizeRow extends StepResultRow {
  checksReport: unknown;
}

const checksReportSchema = z.array(z.object({ index: z.number().int(), severity: z.enum(["BLOCK", "WARN"]), passed: z.boolean() }));
const rubricScoresSchema = z.array(z.object({ criterionId: z.string(), score: z.union([z.literal(0), z.literal(1), z.literal(2)]) }));

/** Deterministic per-attempt shuffle so a reload shows the same order. */
function shuffled<T extends { id: string }>(items: readonly T[], seed: string): T[] {
  const key = (id: string) => createHash("sha256").update(`${seed}:${id}`).digest("hex");
  return [...items].sort((a, b) => (key(a.id) < key(b.id) ? -1 : 1));
}

function hintsTaken(step: Step, level: number): PlayerHint[] {
  return (step.hints ?? []).filter((h) => h.level <= level).map((h) => ({ level: h.level, text: h.text }));
}

function resultOf(step: Step, row: SanitizeRow | undefined, feedback: OwnerFeedback | undefined): PlayerStepResult | undefined {
  if (!row || !isGraded(step) || row.gradingStatus === "PENDING") return undefined;
  const scored = scoreStepRow(step, row);
  const result: PlayerStepResult = {
    gradingStatus: row.gradingStatus,
    points: Math.round(scored.earned * 10) / 10,
    maxPoints: step.points,
    passed: row.gradingStatus === "GRADED" && scored.passed,
    tryCount: row.tryCount,
    answer: row.answer,
  };
  if (step.type === "PROMPT_TASK") {
    result.submissionsLeft = Math.max(0, maxSubmissionsOf(step) - row.tryCount);
    const report = checksReportSchema.safeParse(row.checksReport ?? []);
    if (report.success) {
      const message = (i: number) => step.checks[i]?.message ?? "";
      result.blockedMessage = report.data.filter((c) => c.severity === "BLOCK" && !c.passed).map((c) => message(c.index))[0];
      result.warnings = report.data.filter((c) => c.severity === "WARN" && !c.passed).map((c) => message(c.index));
    }
    if (feedback?.overallFeedback) result.overallFeedback = feedback.overallFeedback;
  }
  return result;
}

export function sanitizeStep(
  step: Step,
  row: SanitizeRow | undefined,
  opts: { attemptId: string; feedback?: OwnerFeedback; ownPromptText?: string | null },
): PlayerStep {
  const status = stepStatus(step, row);
  const revealed = isGraded(step) && status !== "open" && row?.gradingStatus === "GRADED";
  const hintLevelUsed = row?.hintLevelUsed ?? 0;
  const base = {
    id: step.id,
    title: step.title,
    points: step.points,
    mustPass: step.mustPass === true,
    status,
    hintLevelUsed,
    hints: hintsTaken(step, hintLevelUsed),
    hintCount: step.hints?.length ?? 0,
    result: resultOf(step, row, opts.feedback),
  };

  switch (step.type) {
    case "READ":
      return { ...base, type: "READ", body: step.body, ...(step.image ? { image: { src: step.image.src, alt: step.image.alt } } : {}) };
    case "DEMO":
      return { ...base, type: "DEMO", scene: step.scene, frames: step.frames.map((f) => ({ target: f.target, action: f.action, caption: f.caption, ...(f.text ? { text: f.text } : {}) })) };
    case "CLICK_TASK":
      return {
        ...base,
        type: "CLICK_TASK",
        instruction: step.instruction,
        scene: step.scene,
        ...(step.timeoutHintSec ? { timeoutHintSec: step.timeoutHintSec } : {}),
        ...(revealed && row?.passed ? { successMessage: step.successMessage } : {}),
      };
    case "PROMPT_TASK": {
      const submitted = row?.gradingStatus === "GRADED";
      const scores = rubricScoresSchema.safeParse(row?.rubricScores ?? []);
      const scoreOf = new Map(scores.success ? scores.data.map((s) => [s.criterionId, s.score]) : []);
      const criteria: PlayerCriterion[] | undefined = submitted
        ? step.rubric.criteria.map((c) => {
            const score = scoreOf.get(c.id);
            const fb = opts.feedback?.criteria?.[c.id];
            return { id: c.id, label: c.label, ...(score !== undefined ? { score } : {}), ...(fb ? { feedback: fb } : {}) };
          })
        : undefined;
      const showSolution = hintLevelUsed >= 3 || (submitted && row?.passed === true);
      return {
        ...base,
        type: "PROMPT_TASK",
        instruction: step.instruction,
        scenario: step.scenario,
        attachments: step.attachments ?? [],
        maxChars: step.maxChars ?? scoringConfig.promptTask.defaultMaxChars,
        maxSubmissions: maxSubmissionsOf(step),
        ...(criteria ? { criteria } : {}),
        ...(showSolution ? { exampleSolution: step.exampleSolution } : {}),
        ...(opts.ownPromptText ? { lastSubmission: opts.ownPromptText } : {}),
      };
    }
    case "QUIZ": {
      const options = step.shuffle ? shuffled(step.options, `${opts.attemptId}:${step.id}`) : step.options;
      return {
        ...base,
        type: "QUIZ",
        question: step.question,
        multiSelect: step.multiSelect,
        options: options.map((o) => (revealed ? { id: o.id, text: o.text, correct: o.correct, feedback: o.feedback } : { id: o.id, text: o.text })),
        ...(revealed ? { explanation: step.explanation } : {}),
      };
    }
    case "SPOT_ERROR":
      return {
        ...base,
        type: "SPOT_ERROR",
        instruction: step.instruction,
        userPrompt: step.userPrompt,
        referenceFacts: step.referenceFacts,
        segments: step.segments.map((s) =>
          revealed
            ? { id: s.id, text: s.text, isError: s.isError, ...(s.errorType ? { errorType: s.errorType } : {}), ...(s.explanation ? { explanation: s.explanation } : {}) }
            : { id: s.id, text: s.text },
        ),
      };
    case "JUDGMENT":
      return {
        ...base,
        type: "JUDGMENT",
        category: step.category,
        scenario: step.scenario,
        question: step.question,
        options: step.options.map((o) => (revealed ? { id: o.id, text: o.text, verdict: o.verdict, feedback: o.feedback } : { id: o.id, text: o.text })),
        ...(revealed ? { explanation: step.explanation } : {}),
      };
  }
}

export interface SanitizeAttemptInput {
  attempt: { id: string; status: PlayerState["status"]; scorePct: number | null; passed: boolean };
  slug: string;
  content: ModuleContent;
  maxPoints: number;
  rows: ReadonlyMap<string, SanitizeRow>;
  /** Owner-only texts from src/server/scoring/owner-feedback.ts — pass an empty map for anyone else. */
  ownerTexts: ReadonlyMap<string, { promptText: string | null; feedback: OwnerFeedback | undefined }>;
}

export function sanitizeAttempt(input: SanitizeAttemptInput): PlayerState {
  const { content, rows } = input;
  const threshold = content.passThreshold ?? scoringConfig.defaultPassThreshold;
  const steps = content.steps.map((s) => sanitizeStep(s, rows.get(s.id), { attemptId: input.attempt.id, feedback: input.ownerTexts.get(s.id)?.feedback, ownPromptText: input.ownerTexts.get(s.id)?.promptText }));
  const state: PlayerState = {
    attemptId: input.attempt.id,
    status: input.attempt.status,
    module: { slug: input.slug, title: content.title, summary: content.summary, minutes: content.minutes, maxPoints: input.maxPoints, passThresholdPct: Math.round(threshold * 100) },
    steps,
    canFinish: input.attempt.status === "IN_PROGRESS" && missingSteps(content, rows).length === 0,
  };
  if (input.attempt.status === "COMPLETED") {
    const score = computeAttemptScore(content, rows);
    const title = (id: string) => content.steps.find((s) => s.id === id)?.title ?? id;
    const result: PlayerResult = {
      scorePct: displayPct(input.attempt.scorePct ?? score.scorePct),
      passed: input.attempt.passed,
      passThresholdPct: Math.round(threshold * 100),
      mustPassFailed: score.mustPassFailed.map((stepId) => ({ stepId, title: title(stepId) })),
      steps: score.steps.map((s) => ({
        stepId: s.stepId,
        title: title(s.stepId),
        type: content.steps.find((x) => x.id === s.stepId)?.type ?? "",
        points: Math.round(s.earned * 10) / 10,
        maxPoints: s.maxPoints,
        passed: s.passed,
      })),
    };
    state.result = result;
  }
  return state;
}
