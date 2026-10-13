import type { PromptDefinition } from "./prompts/types";
import { gradePromptTaskV1 } from "./prompts/grade-prompt-task.v1";
import { sandboxChatV1 } from "./prompts/sandbox-chat.v1";

// Prompt registry (docs/02 § 6): all versions per key + the active one. ACTIVE is config, so a prompt can be rolled
// back by changing one line (later: a FeatureFlag value) without touching call sites.

const PROMPTS: Record<string, Record<string, PromptDefinition>> = {
  "sandbox-chat": { v1: sandboxChatV1 },
  "grade-prompt-task": { v1: gradePromptTaskV1 },
};

const ACTIVE: Record<string, string> = {
  "sandbox-chat": "v1",
  "grade-prompt-task": "v1",
};

export class UnknownPromptError extends Error {}

export function getPrompt(key: string, version?: string): PromptDefinition {
  const v = version ?? ACTIVE[key];
  const prompt = v ? PROMPTS[key]?.[v] : undefined;
  if (!prompt) throw new UnknownPromptError(`unknown prompt ${key}@${v ?? "?"}`);
  return prompt;
}

export function promptKeys(): string[] {
  return Object.keys(PROMPTS);
}
