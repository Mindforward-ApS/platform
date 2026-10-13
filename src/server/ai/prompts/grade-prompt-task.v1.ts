import { GRADE_PROMPT_TASK_SYSTEM, GRADE_PROMPT_TASK_VERSION } from "@/server/scoring/grade-prompt-task.v1";
import type { PromptDefinition } from "./types";

// PROMPT_TASK grader (docs/05 § 4.1). The text lives with the scoring code; this registers it with the gateway.
export const gradePromptTaskV1: PromptDefinition = {
  key: "grade-prompt-task",
  version: GRADE_PROMPT_TASK_VERSION,
  system: GRADE_PROMPT_TASK_SYSTEM,
  cache: true,
};
