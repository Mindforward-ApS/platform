import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { TokenUsage } from "./pricing";

// The ONLY module that talks to the Anthropic SDK (ESLint no-restricted-imports allows src/server/ai/** only).
// A small provider interface keeps the gateway testable: AI_MOCK=1 swaps in a deterministic offline provider.

export type ProviderRequest = Omit<Anthropic.MessageCreateParamsNonStreaming, "stream">;

export type ProviderBlock = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown };

export interface ProviderResponse {
  content: ProviderBlock[];
  stopReason: string;
  usage: TokenUsage;
  requestId?: string;
}

export interface SendOptions {
  signal: AbortSignal;
  /** Streams text deltas as they arrive. */
  onText?: (delta: string) => void;
}

export interface ModelProvider {
  readonly name: "anthropic" | "mock" | "test";
  send(req: ProviderRequest, opts: SendOptions): Promise<ProviderResponse>;
}

/** Normalised provider failure. `retryable` = 429 / 5xx / overloaded / network. */
export class ProviderError extends Error {
  constructor(
    public readonly code: "RATE_LIMITED" | "OVERLOADED" | "SERVER" | "NETWORK" | "TIMEOUT" | "BAD_REQUEST" | "AUTH" | "UNKNOWN",
    public readonly retryable: boolean,
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(code);
    this.name = "ProviderError";
  }
}

function retryAfterMs(headers: Headers | undefined): number | undefined {
  const v = headers?.get("retry-after");
  if (!v) return undefined;
  if (/^\d+(\.\d+)?$/.test(v.trim())) return Math.round(Number(v) * 1000);
  const date = Date.parse(v);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

export function toProviderError(err: unknown, signal?: AbortSignal): ProviderError {
  if (err instanceof ProviderError) return err;
  if (signal?.aborted || err instanceof Anthropic.APIUserAbortError) return new ProviderError("TIMEOUT", false);
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new ProviderError("TIMEOUT", true);
  if (err instanceof Anthropic.APIConnectionError) return new ProviderError("NETWORK", true);
  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    const after = retryAfterMs(err.headers as Headers | undefined);
    if (status === 429) return new ProviderError("RATE_LIMITED", true, status, after);
    if (status === 529) return new ProviderError("OVERLOADED", true, status, after);
    if (status !== undefined && status >= 500) return new ProviderError("SERVER", true, status, after);
    if (status === 401 || status === 403) return new ProviderError("AUTH", false, status);
    return new ProviderError("BAD_REQUEST", false, status);
  }
  return new ProviderError("UNKNOWN", false);
}

let sdk: Anthropic | undefined;

export function anthropicProvider(apiKey: string | undefined, timeoutMs: number): ModelProvider {
  // The gateway owns retries/backoff/fallback (docs/02 § 6), so the SDK's own retries are off.
  sdk ??= new Anthropic({ apiKey, maxRetries: 0, timeout: timeoutMs });
  const client = sdk;
  return {
    name: "anthropic",
    async send(req, opts) {
      try {
        const stream = client.messages.stream(req, { signal: opts.signal });
        if (opts.onText) stream.on("text", (delta) => opts.onText?.(delta));
        const msg = await stream.finalMessage();
        const content: ProviderBlock[] = msg.content.flatMap((b): ProviderBlock[] =>
          b.type === "text" ? [{ type: "text", text: b.text }] : b.type === "tool_use" ? [{ type: "tool_use", id: b.id, name: b.name, input: b.input }] : [],
        );
        return {
          content,
          stopReason: msg.stop_reason ?? "end_turn",
          usage: {
            inputTokens: msg.usage.input_tokens,
            outputTokens: msg.usage.output_tokens,
            cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
            cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
          },
          requestId: msg.id,
        };
      } catch (err) {
        throw toProviderError(err, opts.signal);
      }
    },
  };
}

// ── deterministic offline provider (AI_MOCK=1: tests, e2e, offline dev) ──

const MOCK_TOOL_TRIGGERS: { word: RegExp; tool: string; input: unknown }[] = [
  { word: /\bmail/i, tool: "mail_search", input: { query: "" } },
  { word: /kalender|møde/i, tool: "calendar_list", input: { dayFrom: 0, dayTo: 7 } },
  { word: /kunde|crm/i, tool: "crm_query", input: { limit: 5 } },
  { word: /budget|regneark/i, tool: "sheet_read", input: { range: "A1:H13" } },
  { word: /\bfil/i, tool: "files_search", input: { query: "Nordlys" } },
];

export const MOCK_REPLY_PREFIX = "Dette er et testsvar fra øvemodellen.";

function lastUserText(req: ProviderRequest): { text: string; hasToolResult: boolean } {
  const last = req.messages[req.messages.length - 1];
  if (!last || last.role !== "user") return { text: "", hasToolResult: false };
  if (typeof last.content === "string") return { text: last.content, hasToolResult: false };
  const text = last.content.map((b) => (b.type === "text" ? b.text : "")).join(" ");
  return { text, hasToolResult: last.content.some((b) => b.type === "tool_result") };
}

function approxTokens(req: ProviderRequest): number {
  return Math.ceil(JSON.stringify([req.system, req.tools, req.messages]).length / 4);
}

export function mockProvider(opts: { structured?: unknown } = {}): ModelProvider {
  return {
    name: "mock",
    async send(req, { onText, signal }) {
      if (signal.aborted) throw new ProviderError("TIMEOUT", false);
      const usage = (out: string): TokenUsage => ({ inputTokens: approxTokens(req), outputTokens: Math.ceil(out.length / 4), cacheReadTokens: 0, cacheWriteTokens: 0 });
      const forced = req.tool_choice && req.tool_choice.type === "tool" ? req.tool_choice.name : undefined;
      if (forced) {
        return { content: [{ type: "tool_use", id: "toolu_mock_structured", name: forced, input: opts.structured ?? {} }], stopReason: "tool_use", usage: usage("{}") };
      }
      const { text, hasToolResult } = lastUserText(req);
      const toolNames = new Set((req.tools ?? []).map((t) => ("name" in t ? t.name : "")));
      const trigger = !hasToolResult ? MOCK_TOOL_TRIGGERS.find((t) => t.word.test(text) && toolNames.has(t.tool)) : undefined;
      if (trigger) {
        return { content: [{ type: "tool_use", id: `toolu_mock_${trigger.tool}`, name: trigger.tool, input: trigger.input }], stopReason: "tool_use", usage: usage(trigger.tool) };
      }
      const reply = hasToolResult
        ? `${MOCK_REPLY_PREFIX} Jeg har slået op i de forbundne Nordlys-data og fundet det, du bad om.`
        : `${MOCK_REPLY_PREFIX} Din besked havde ${text.length} tegn.`;
      for (const chunk of reply.match(/[^]{1,16}/g) ?? []) onText?.(chunk);
      return { content: [{ type: "text", text: reply }], stopReason: "end_turn", usage: usage(reply), requestId: "msg_mock" };
    },
  };
}
