import type { z } from "zod";

/** A versioned prompt (docs/02 § 6): change = new file with a new version; old versions stay for rollback. */
export interface PromptDefinition {
  key: string;
  version: string;
  system: string;
  /** For structured output: forced tool use with this schema (Zod → JSON Schema), result safeParse'd. */
  outputSchema?: z.ZodType;
  cache: true;
}
