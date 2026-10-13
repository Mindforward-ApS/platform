import "server-only";
import { z } from "zod";
import { blockingKinds, detectPii } from "@/lib/pii";
import { serverEnv } from "@/lib/env";
import { gateway } from "@/server/ai/gateway";
import { db } from "@/server/db";
import { evaluatePredicate } from "@/server/sandbox/assertions";
import type { PiiDetector } from "@/server/scoring/deterministic-checks";
import { mockGradeWithModel, type GradeWithModel } from "@/server/scoring/prompt-task-grader";
import type { AttemptDeps, PlayableOptions } from "./attempts";
import { createSandboxClickTaskEvaluator, mockClickTaskEvaluator, type EvaluateClickTask, type EvaluatePredicate } from "./click-task";

// Composition root for the module player: real grader (AI gateway, GRADE_PROMPT_TASK, forced tool, temperature 0),
// the shared PII filter (src/lib/pii) and the sandbox predicate evaluator. GRADER_MOCK / CLICK_TASK_MOCK give
// deterministic results for dev/e2e only (forbidden in production by env validation).

/** PROMPT_TASK rejects BLOCK kinds (CPR, card, account, IBAN). WARN kinds (phone, external e-mail) do not reject. */
export const promptPiiDetector: PiiDetector = (text) => ({ found: blockingKinds(detectPii(text)).length > 0 });

function gatewayGrader(actor: { userId: string; organizationId: string }): GradeWithModel {
  return async (req) => {
    const g = await gateway();
    const result = await g.callStructured({
      feature: "GRADE_PROMPT_TASK",
      promptKey: "grade-prompt-task",
      userId: actor.userId,
      organizationId: actor.organizationId,
      userText: req.user,
      // The submission already passed the PII gate in the grader; the gateway re-checks BLOCK kinds itself.
      piiOverride: true,
      messages: [{ role: "user", content: req.user }],
      // The grader validates the exact rubric shape; here we only require an object.
      schema: z.record(z.string(), z.unknown()),
      toolName: req.tool.name,
      toolInputSchema: req.tool.inputSchema as unknown as Record<string, unknown>,
    });
    return { modelId: result.model, output: result.data };
  };
}

const sandboxEvaluator: EvaluateClickTask = (attemptId, step) =>
  createSandboxClickTaskEvaluator(db(), evaluatePredicate as unknown as EvaluatePredicate)(attemptId, step);

export function playerDeps(actor: { userId: string; organizationId: string }): AttemptDeps {
  const env = serverEnv();
  return {
    grader: {
      detectPii: promptPiiDetector,
      gradeWithModel: env.GRADER_MOCK ? mockGradeWithModel : gatewayGrader(actor),
    },
    evaluateClickTask: env.CLICK_TASK_MOCK ? mockClickTaskEvaluator : sandboxEvaluator,
  };
}

export function playableOptions(): PlayableOptions {
  return { allowUnpublished: serverEnv().ALLOW_UNPUBLISHED_MODULES };
}
