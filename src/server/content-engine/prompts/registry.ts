import type { PromptDefinition } from "@/server/ai/prompts/types";
import { contentClassifyV1 } from "./content-classify.v1";
import { contentDraftV1 } from "./content-draft.v1";
import { contentVerifyV1 } from "./content-verify.v1";

// Gateway registrations (src/server/ai/registry.ts) of the content-engine prompts. The text lives with the engine.
const def = (p: { key: string; version: string; system: string; outputSchema: PromptDefinition["outputSchema"] }): PromptDefinition => ({
  key: p.key,
  version: p.version,
  system: p.system,
  outputSchema: p.outputSchema,
  cache: true,
});

export const contentClassifyPromptV1 = def(contentClassifyV1);
export const contentDraftPromptV1 = def(contentDraftV1);
export const contentVerifyPromptV1 = def(contentVerifyV1);
