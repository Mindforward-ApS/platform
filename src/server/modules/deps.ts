import "server-only";
import { serverEnv } from "@/lib/env";
import type { PiiDetector } from "@/server/scoring/deterministic-checks";
import { mockGradeWithModel, type GradeWithModel } from "@/server/scoring/prompt-task-grader";
import type { AttemptDeps, PlayableOptions } from "./attempts";
import { mockClickTaskEvaluator, unavailableClickTaskEvaluator, type EvaluateClickTask } from "./click-task";

// Composition root for the module player. INTEGRATION POINTS (wired when M3 lands):
//   gradeWithModel     → src/server/ai/gateway.ts (feature GRADE_PROMPT_TASK, forced tool, temperature 0)
//   detectPii          → src/lib/pii (the sandbox's PII filter, docs/04)
//   evaluateClickTask  → createSandboxClickTaskEvaluator(db(), evaluatePredicate) from ./click-task with
//                        M3's src/server/modules/predicate.ts
// Until then: GRADER_MOCK=1 / CLICK_TASK_MOCK=1 give deterministic passing results (dev/e2e only), otherwise the
// grader reports a controlled ERROR (never 0 points) and CLICK_TASK shows "sandbox not available yet".

/** Placeholder until the AI gateway exists: throws, so grading ends as GradingStatus ERROR — never 0 points. */
const notWiredGradeWithModel: GradeWithModel = async () => {
  throw new Error("AI gateway not wired (src/server/ai/gateway.ts, M3)");
};

/**
 * Minimal fallback until src/lib/pii exists: Danish CPR (ddmmyy-xxxx), 13–19 digit card numbers and
 * Danish account numbers (4-digit reg. + 6–10 digit account). Deliberately conservative.
 */
export const fallbackPiiDetector: PiiDetector = (text) => {
  const compact = text.replace(/[  ]/g, " ");
  const cpr = /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])\d{2}[- ]?\d{4}\b/.test(compact);
  const card = /\b(?:\d[ -]?){13,19}\b/.test(compact);
  const account = /\b\d{4}[ -]\d{6,10}\b/.test(compact);
  return { found: cpr || card || account };
};

export interface PlayerDepsOverrides {
  gradeWithModel?: GradeWithModel;
  detectPii?: PiiDetector;
  evaluateClickTask?: EvaluateClickTask;
}

let overrides: PlayerDepsOverrides = {};

/** The integrator calls this once at boot (e.g. from src/server/boot.ts) to inject the real implementations. */
export function configurePlayerDeps(next: PlayerDepsOverrides): void {
  overrides = { ...overrides, ...next };
}

export function playerDeps(): AttemptDeps {
  const env = serverEnv();
  return {
    grader: {
      detectPii: overrides.detectPii ?? fallbackPiiDetector,
      gradeWithModel: env.GRADER_MOCK ? mockGradeWithModel : (overrides.gradeWithModel ?? notWiredGradeWithModel),
    },
    evaluateClickTask: env.CLICK_TASK_MOCK ? mockClickTaskEvaluator : (overrides.evaluateClickTask ?? unavailableClickTaskEvaluator),
  };
}

export function playableOptions(): PlayableOptions {
  return { allowUnpublished: serverEnv().ALLOW_UNPUBLISHED_MODULES };
}
