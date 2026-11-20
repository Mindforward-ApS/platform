import { z } from "zod";

// The content engine never calls an LLM directly (CLAUDE.md: LLM calls only via src/server/ai/). Pipeline code
// receives `callContentModel` as a dependency; `gatewayContentModel()` below is the default wiring to the AI gateway
// (feature → model, prompt caching, forced tool use, AiCall logging). The engine Zod-validates `output` itself.

export type ContentFeature = "CONTENT_CLASSIFY" | "CONTENT_DRAFT" | "CONTENT_VERIFY";

export interface ContentModelRequest {
  promptKey: string; // "content-classify" (registered in src/server/ai/registry.ts)
  promptVersion: string; // "v1"
  /** Static system prompt (cached). The gateway reads it from the registry by promptKey. */
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
  /** Optional; when present it is added to PipelineRun tokens/cost. */
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

// ── Default wiring: the AI gateway ────────────────────────────────────────
// Usage is read back from the AiCall row the gateway wrote for this call (callStructured does not return it).
// Cost is already on AiCall/BudgetMonth(GLOBAL_AI); the CONTENT_ENGINE budget is computed from AiCall rows (budget.ts).

const anyObject = z.record(z.string(), z.unknown());

export function gatewayContentModel(): CallContentModel {
  return async (feature, request) => {
    const [{ gateway }, { db }] = await Promise.all([import("@/server/ai/gateway"), import("@/server/db")]);
    const started = new Date();
    const result = await (await gateway()).callStructured({
      feature,
      promptKey: request.promptKey,
      userId: null,
      organizationId: null,
      userText: "",
      messages: [{ role: "user", content: request.user }],
      schema: anyObject,
      toolName: request.toolName,
      toolInputSchema: request.outputSchema,
    });
    const call = await db().aiCall.findFirst({
      where: { feature, promptKey: request.promptKey, model: result.model, createdAt: { gte: started } },
      orderBy: { createdAt: "desc" },
      select: { inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheWriteTokens: true, costDkk: true },
    });
    const usage = call ? { tokensIn: call.inputTokens + call.cacheReadTokens + call.cacheWriteTokens, tokensOut: call.outputTokens, costDkk: Number(call.costDkk) } : undefined;
    return { modelId: result.model, output: result.data, usage };
  };
}
