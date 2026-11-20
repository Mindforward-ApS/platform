import { z } from "zod";
import { scoringConfig } from "@/lib/config/scoring";
import type { Step } from "@/lib/schemas/module";
import { runChecks, type ChecksResult, type PiiDetector } from "./deterministic-checks";
import {
  GRADE_CALL_SETTINGS,
  GRADE_PROMPT_TASK_SYSTEM,
  GRADE_PROMPT_TASK_VERSION,
  GRADE_TOOL_INPUT_SCHEMA,
  GRADE_TOOL_NAME,
  renderGradeUserMessage,
} from "./grade-prompt-task.v1";
import { scorePromptTask, type CriterionScore } from "./score";

// PROMPT_TASK grading pipeline (docs/05 § 4, docs/02 § 4.2): PII gate → deterministic checks → LLM rubric.
// The LLM call is an INJECTED dependency; in the app it is wired to src/server/ai/gateway.ts (feature
// GRADE_PROMPT_TASK, forced tool, temperature 0). The model only returns criterion scores — the server
// validates them with Zod and computes norm/pass itself.

export type PromptTaskStep = Extract<Step, { type: "PROMPT_TASK" }>;

/** Everything the AI gateway needs for one grading call. */
export interface GraderRequest {
  promptVersion: typeof GRADE_PROMPT_TASK_VERSION;
  system: string;
  user: string;
  tool: { name: typeof GRADE_TOOL_NAME; inputSchema: typeof GRADE_TOOL_INPUT_SCHEMA };
  temperature: 0;
  maxTokens: number;
  timeoutMs: number;
  rubric: { version: string; criterionIds: string[] };
}

/** Injected model call. Returns the forced tool's raw input (`output`, unvalidated) and the model id used. May throw (timeout). */
export type GradeWithModel = (request: GraderRequest) => Promise<{ modelId: string; output: unknown }>;

export interface GraderDeps {
  detectPii: PiiDetector;
  gradeWithModel: GradeWithModel;
}

export interface GradedCriterion {
  id: string;
  score: CriterionScore;
  evidence: string;
  feedback: string;
}

export type GradeOutcome =
  | { status: "PII_REJECTED" }
  | { status: "BLOCKED"; checks: ChecksResult; norm: 0; passed: false }
  | {
      status: "GRADED";
      checks: ChecksResult;
      criteria: GradedCriterion[];
      scores: Record<string, CriterionScore>;
      norm: number;
      passed: boolean;
      overallFeedback: string;
      injectionAttempt: boolean;
      confidence: "HIGH" | "LOW";
      modelId: string;
      promptVersion: string;
      rubricVersion: string;
    }
  | { status: "ERROR"; checks: ChecksResult; reason: "INVALID_OUTPUT" | "MODEL_ERROR" }
  /** M10: AI paused (global monthly budget used up or kill switch) — deterministic checks ran, rubric waits. */
  | { status: "PENDING"; checks: ChecksResult; reason: "AI_PAUSED" };

/** The gateway signals "AI paused" with code AI_DISABLED (src/server/ai/gateway.ts); duck-typed to stay pure. */
export function isAiPaused(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "AI_DISABLED";
}

/** docs/05 § 4.2 + "criterion ids = the rubric's ids (no missing/extra/duplicates)". */
export function rubricResponseSchema(criterionIds: readonly string[]) {
  return z
    .strictObject({
      criteria: z.array(
        z.strictObject({
          id: z.string(),
          score: z.union([z.literal(0), z.literal(1), z.literal(2)]),
          evidence: z.string().max(200),
          feedback: z.string().max(300),
        }),
      ),
      overallFeedback: z.string().max(400),
      injectionAttempt: z.boolean(),
      confidence: z.enum(["HIGH", "LOW"]),
    })
    .superRefine((v, ctx) => {
      const got = v.criteria.map((c) => c.id);
      const same = got.length === criterionIds.length && new Set(got).size === got.length && got.every((id) => criterionIds.includes(id));
      if (!same) ctx.addIssue({ code: "custom", path: ["criteria"], message: "criterion ids must equal the rubric's" });
    });
}

export function buildGraderRequest(step: PromptTaskStep, submission: string): GraderRequest {
  return {
    promptVersion: GRADE_PROMPT_TASK_VERSION,
    system: GRADE_PROMPT_TASK_SYSTEM,
    user: renderGradeUserMessage({ instruction: step.instruction, scenario: step.scenario, criteria: step.rubric.criteria, submission }),
    tool: { name: GRADE_TOOL_NAME, inputSchema: GRADE_TOOL_INPUT_SCHEMA },
    temperature: GRADE_CALL_SETTINGS.temperature,
    maxTokens: GRADE_CALL_SETTINGS.maxTokens,
    timeoutMs: GRADE_CALL_SETTINGS.timeoutMs,
    rubric: { version: step.rubric.version, criterionIds: step.rubric.criteria.map((c) => c.id) },
  };
}

export async function gradePromptTask(input: { step: PromptTaskStep; submission: string }, deps: GraderDeps): Promise<GradeOutcome> {
  const { step, submission } = input;

  // 1. PII gate: rejected before storage and before the model; does not count as a submission.
  if (deps.detectPii(submission).found) return { status: "PII_REJECTED" };

  // 2. Deterministic checks — first BLOCK ⇒ 0 points, no LLM call.
  const checks = runChecks(submission, step.checks, deps.detectPii);
  if (checks.blocked) return { status: "BLOCKED", checks, norm: 0, passed: false };

  // 3. LLM rubric with 1 retry on invalid output / thrown error.
  const request = buildGraderRequest(step, submission);
  const schema = rubricResponseSchema(request.rubric.criterionIds);
  let reason: "INVALID_OUTPUT" | "MODEL_ERROR" = "INVALID_OUTPUT";
  for (let attempt = 0; attempt <= scoringConfig.graderRetries; attempt++) {
    let response: { modelId: string; output: unknown };
    try {
      response = await deps.gradeWithModel(request);
    } catch (err) {
      // Budget/kill switch: no retry, the rubric part is graded later (docs/02 § 6, 100 % level).
      if (isAiPaused(err)) return { status: "PENDING", checks, reason: "AI_PAUSED" };
      reason = "MODEL_ERROR";
      continue;
    }
    const parsed = schema.safeParse(response.output);
    if (!parsed.success) {
      reason = "INVALID_OUTPUT";
      continue;
    }
    const v = parsed.data;
    // 4. Server computes the score. Injection attempt ⇒ all criteria 0.
    const scores: Record<string, CriterionScore> = {};
    for (const c of v.criteria) scores[c.id] = v.injectionAttempt ? 0 : c.score;
    const { norm, passed } = scorePromptTask(step.rubric, scores);
    return {
      status: "GRADED",
      checks,
      criteria: v.criteria.map((c) => ({ ...c, score: scores[c.id] ?? 0 })),
      scores,
      norm,
      passed,
      overallFeedback: v.overallFeedback,
      injectionAttempt: v.injectionAttempt,
      confidence: v.confidence,
      modelId: response.modelId,
      promptVersion: request.promptVersion,
      rubricVersion: step.rubric.version,
    };
  }
  return { status: "ERROR", checks, reason };
}

/** GRADER_MOCK=1 (tests, e2e, offline dev): a fixed, valid, passing result for any rubric. Never in production. */
export const mockGradeWithModel: GradeWithModel = async (request) => ({
  modelId: "mock-grader",
  output: {
    criteria: request.rubric.criterionIds.map((id) => ({ id, score: 2, evidence: "ingen", feedback: "Testbedømmelse: kriteriet er opfyldt." })),
    overallFeedback: "Testbedømmelse: prompten opfylder kriterierne.",
    injectionAttempt: false,
    confidence: "HIGH",
  },
});
