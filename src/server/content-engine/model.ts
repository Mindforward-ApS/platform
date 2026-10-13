// The content engine never calls an LLM itself (CLAUDE.md: LLM calls only via src/server/ai/). The integrator
// injects `callContentModel`, wired to the AI gateway (feature → model from CONTENT_*_MODEL, prompt caching,
// forced tool use with `outputSchema`, AiCall logging). The engine Zod-validates `output` itself.

export type ContentFeature = "CONTENT_CLASSIFY" | "CONTENT_DRAFT" | "CONTENT_VERIFY";

export interface ContentModelRequest {
  promptKey: string; // "content-classify"
  promptVersion: string; // "v1"
  /** Static system prompt — cache it (prompt caching). */
  system: string;
  /** Variable user message. */
  user: string;
  /** Forced tool name + JSON Schema of its input (generated from the Zod output schema). */
  toolName: string;
  outputSchema: Record<string, unknown>;
  maxTokens: number;
  temperature: number;
}

export interface ContentModelUsage {
  tokensIn: number;
  tokensOut: number;
  costDkk: number;
}

export interface ContentModelResponse {
  modelId: string;
  output: unknown;
  /** Optional; when present it is added to PipelineRun and the CONTENT_ENGINE budget. */
  usage?: ContentModelUsage;
}

export type CallContentModel = (feature: ContentFeature, request: ContentModelRequest) => Promise<ContentModelResponse>;

export interface IssueInput {
  title: string;
  body: string;
  labels: string[];
  /** Idempotency marker contained in the body: "greb-change-event:{id}". */
  marker: string;
}

export type CreateIssue = (input: IssueInput) => Promise<{ url: string }>;
