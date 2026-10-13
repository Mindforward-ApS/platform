import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AiCallStatus, AiFeature, PrismaClient } from "@/generated/prisma/client";
import type { ServerEnv } from "@/lib/env.schema";
import type { PiiKind } from "@/lib/pii";
import { logger as defaultLogger, type Logger } from "@/server/observability/logger";
import { piiGate } from "@/server/sandbox/pii";
import { consumeRateLimit, type RateLimitRule } from "@/server/security/rate-limit";
import { checkUserDailyCap, recordUsage } from "./budget";
import { anthropicProvider, mockProvider, ProviderError, type ModelProvider, type ProviderBlock, type ProviderRequest, type ProviderResponse } from "./client";
import { historyTurns, modelConfig, type ModelConfig } from "./models";
import { costDkk, type TokenUsage } from "./pricing";
import { SKIN_ADDENDUM } from "./prompts/sandbox-chat.v1";
import { getPrompt } from "./registry";

// The single entry point for LLM calls (docs/02-arkitektur.md § 6). Pipeline, in order:
// 1 Zod input + prompt lookup · 2 AI_ENABLED kill switch + degraded mode · 3 rate limit · 4 PII gate ·
// 5 daily per-user cap · 6 prompt caching (system, world summary, tools) · 7 AbortController timeout + retries
// on 429/5xx/overloaded with backoff/retry-after · 8 fallback model once · 9 structured output via forced tool use ·
// 10 AiCall log WITHOUT prompt/answer text + AiUsageDaily/BudgetMonth increments.

/** Message shape for callers outside src/server/ai (they may not import the SDK). */
export type ChatMessage = Anthropic.MessageParam;

export type GatewayErrorCode =
  | "INVALID_INPUT"
  | "AI_DISABLED"
  | "RATE_LIMITED"
  | "PII_BLOCKED"
  | "PII_WARNING"
  | "USER_CAP"
  | "TIMEOUT"
  | "PROVIDER"
  | "INVALID_OUTPUT";

const STATUS: Record<GatewayErrorCode, number> = {
  INVALID_INPUT: 400,
  AI_DISABLED: 503,
  RATE_LIMITED: 429,
  PII_BLOCKED: 422,
  PII_WARNING: 422,
  USER_CAP: 429,
  TIMEOUT: 504,
  PROVIDER: 502,
  INVALID_OUTPUT: 502,
};

export class GatewayError extends Error {
  readonly status: number;
  constructor(
    public readonly code: GatewayErrorCode,
    public readonly details: { kinds?: PiiKind[]; retryAfterSec?: number } = {},
  ) {
    super(code);
    this.name = "GatewayError";
    this.status = STATUS[code];
  }
}

/** docs/02 § 7 / docs/04 § 11: 10 per minute and 200 per day per user for sandbox chat. */
export const AI_RATE_LIMITS: Record<string, RateLimitRule[]> = {
  SANDBOX_CHAT: [{ window: 60, max: 10 }, { window: 24 * 60 * 60, max: 200 }],
  SANDBOX_AGENT: [{ window: 60, max: 10 }, { window: 24 * 60 * 60, max: 200 }],
  GRADE_PROMPT_TASK: [{ window: 60, max: 20 }],
  SUPPORT_AGENT: [{ window: 60, max: 6 }, { window: 24 * 60 * 60, max: 60 }],
};
export const MAX_TOOL_ROUNDS = 6;
const RETRIES = 2;
const BACKOFF_MS = [500, 2000];
const MAX_RETRY_AFTER_MS = 10_000;
const PII_FEATURES: AiFeature[] = ["SANDBOX_CHAT", "SANDBOX_AGENT", "GRADE_PROMPT_TASK", "SUPPORT_AGENT"];

export type GatewayEnv = Pick<
  ServerEnv,
  | "AI_ENABLED"
  | "AI_MOCK"
  | "ANTHROPIC_API_KEY"
  | "AI_MODEL_DEFAULT"
  | "AI_MODEL_FALLBACK"
  | "AI_MODEL_GRADER"
  | "SUPPORT_MODEL"
  | "AI_TIMEOUT_MS"
  | "AI_USER_DAILY_TOKEN_CAP"
  | "AI_GLOBAL_MONTHLY_BUDGET_DKK"
  | "AI_USD_DKK_RATE"
>;

export interface GatewayDeps {
  db: PrismaClient;
  env: GatewayEnv;
  provider?: ModelProvider;
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  random?: () => number;
  logger?: Logger;
}

const baseInput = z.object({
  feature: z.enum(["SANDBOX_CHAT", "SANDBOX_AGENT", "GRADE_PROMPT_TASK", "SUPPORT_AGENT", "CONTENT_CLASSIFY", "CONTENT_DRAFT", "CONTENT_VERIFY"]),
  promptKey: z.string().regex(/^[a-z0-9-]+$/),
  userId: z.string().min(1).nullable(),
  organizationId: z.string().min(1).nullable(),
  /** The user's own free text — PII-gated (never logged). */
  userText: z.string().max(20_000),
  piiOverride: z.boolean().default(false),
  skinKey: z.string().regex(/^[a-z0-9-]+$/).optional(),
  /** Static context blocks placed in the cached prefix (e.g. the Nordlys world summary). */
  cachedContext: z.array(z.string().max(40_000)).max(3).default([]),
  /** Variable system context after the cache breakpoint (module step context, assistant instructions). */
  dynamicContext: z.string().max(8_000).optional(),
  messages: z.array(z.custom<Anthropic.MessageParam>((m) => typeof m === "object" && m !== null && "role" in m)).min(1).max(60),
});

export type StreamInput = z.input<typeof baseInput> & {
  tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
  runTool?: (name: string, input: unknown) => Promise<{ content: string; isError?: boolean }>;
};

export interface StreamResult {
  text: string;
  stopReason: string;
  toolCallCount: number;
  model: string;
  promptVersion: string;
  fallbackUsed: boolean;
}

export interface PreparedStream {
  run(handlers: { onText?: (delta: string) => void }): Promise<StreamResult>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createGateway(deps: GatewayDeps) {
  const { db, env } = deps;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? defaultSleep;
  const random = deps.random ?? Math.random;
  const log = deps.logger ?? defaultLogger;
  const provider = deps.provider ?? (env.AI_MOCK ? mockProvider() : anthropicProvider(env.ANTHROPIC_API_KEY, env.AI_TIMEOUT_MS));

  async function flag(key: string): Promise<boolean | undefined> {
    const row = await db.featureFlag.findUnique({ where: { key }, select: { enabled: true } });
    return row?.enabled;
  }

  async function logCall(c: { userId: string | null; organizationId: string | null; feature: AiFeature; model: string; promptKey: string; promptVersion: string; status: AiCallStatus; usage?: TokenUsage; latencyMs?: number; errorCode?: string; requestId?: string }) {
    const usage = c.usage ?? { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
    const cost = c.usage ? costDkk(c.model, usage, env.AI_USD_DKK_RATE) : 0;
    const at = now();
    await db.$transaction(async (tx) => {
      await tx.aiCall.create({
        data: {
          userId: c.userId,
          organizationId: c.organizationId,
          feature: c.feature,
          model: c.model,
          promptKey: c.promptKey,
          promptVersion: c.promptVersion,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          costDkk: cost,
          latencyMs: c.latencyMs,
          status: c.status,
          errorCode: c.errorCode,
          providerRequestId: c.requestId,
          createdAt: at,
        },
      });
      if (c.usage) await recordUsage(tx, { userId: c.userId, usage, costDkk: cost, monthlyLimitDkk: env.AI_GLOBAL_MONTHLY_BUDGET_DKK, now: at });
    });
  }

  /** Steps 1–5. Throws GatewayError before any model call (blocked input never reaches the LLM). */
  async function preflight(raw: StreamInput) {
    const parsed = baseInput.safeParse(raw);
    if (!parsed.success) throw new GatewayError("INVALID_INPUT");
    const input = parsed.data;
    const prompt = getPrompt(input.promptKey);
    const meta = { userId: input.userId, organizationId: input.organizationId, feature: input.feature, promptKey: prompt.key, promptVersion: prompt.version };

    if (!env.AI_ENABLED || (await flag("AI_ENABLED")) === false) throw new GatewayError("AI_DISABLED");
    const degraded = (await flag("AI_DEGRADED_MODE")) === true;
    const config = modelConfig(input.feature, env, { degraded });

    if (input.userId) {
      for (const [i, rule] of (AI_RATE_LIMITS[input.feature] ?? []).entries()) {
        const r = await consumeRateLimit(db, `ai:${input.feature}:${i}:${input.userId}`, rule, now().getTime());
        if (!r.allowed) {
          await logCall({ ...meta, model: config.model, status: "BLOCKED_RATE_LIMIT" });
          throw new GatewayError("RATE_LIMITED", { retryAfterSec: r.retryAfter ?? 60 });
        }
      }
    }

    if (PII_FEATURES.includes(input.feature)) {
      const gate = piiGate(input.userText, input.piiOverride);
      if (gate.outcome === "BLOCK") {
        await logCall({ ...meta, model: config.model, status: "BLOCKED_PII", errorCode: gate.kinds.join(",") });
        throw new GatewayError("PII_BLOCKED", { kinds: gate.kinds });
      }
      if (gate.outcome === "WARN") throw new GatewayError("PII_WARNING", { kinds: gate.kinds });
    }

    if (input.userId && input.feature !== "GRADE_PROMPT_TASK") {
      const cap = await checkUserDailyCap(db, input.userId, env.AI_USER_DAILY_TOKEN_CAP, now());
      if (!cap.allowed) {
        await logCall({ ...meta, model: config.model, status: "BLOCKED_USER_CAP" });
        throw new GatewayError("USER_CAP");
      }
    }
    return { input, prompt, config, degraded, meta };
  }

  function buildSystem(promptSystem: string, skinKey: string | undefined, cachedContext: string[], dynamicContext?: string): Anthropic.TextBlockParam[] {
    const head = skinKey && SKIN_ADDENDUM[skinKey] ? `${promptSystem}\n\nARBEJDSGANG\n- ${SKIN_ADDENDUM[skinKey]}` : promptSystem;
    const blocks: Anthropic.TextBlockParam[] = [{ type: "text", text: head }, ...cachedContext.map((text) => ({ type: "text" as const, text }))];
    // One breakpoint at the end of the static prefix caches tools + system prompt + skin addendum + world summary.
    const last = blocks[blocks.length - 1];
    if (last) last.cache_control = { type: "ephemeral" };
    if (dynamicContext) blocks.push({ type: "text", text: `MODULKONTEKST\n${dynamicContext}` });
    return blocks;
  }

  function backoff(attempt: number): number {
    const base = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] ?? 2000;
    return Math.round(base / 2 + random() * (base / 2));
  }

  /** Steps 7–8: one logical model call with timeout, retries and a single fallback. Logs every attempt's outcome once. */
  async function send(meta: { userId: string | null; organizationId: string | null; feature: AiFeature; promptKey: string; promptVersion: string }, config: ModelConfig, req: Omit<ProviderRequest, "model">, onText?: (d: string) => void): Promise<{ resp: ProviderResponse; model: string; fallback: boolean }> {
    const attemptOnce = async (model: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.timeoutMs);
      const started = Date.now();
      let emitted = false;
      try {
        const resp = await provider.send({ ...req, model }, { signal: controller.signal, onText: onText && ((d) => ((emitted = true), onText(d))) });
        return { resp, latencyMs: Date.now() - started };
      } catch (err) {
        const e = err instanceof ProviderError ? err : new ProviderError(controller.signal.aborted ? "TIMEOUT" : "UNKNOWN", false);
        // Never retry once text reached the user (it would be duplicated).
        throw Object.assign(e, { emitted, latencyMs: Date.now() - started, timedOut: controller.signal.aborted || e.code === "TIMEOUT" });
      } finally {
        clearTimeout(timer);
      }
    };

    let lastErr: (ProviderError & { emitted?: boolean; latencyMs?: number; timedOut?: boolean }) | undefined;
    const models: { model: string; tries: number; fallback: boolean }[] = [{ model: config.model, tries: RETRIES + 1, fallback: false }];
    if (config.fallbackModel) models.push({ model: config.fallbackModel, tries: 1, fallback: true });

    for (const m of models) {
      for (let attempt = 0; attempt < m.tries; attempt++) {
        try {
          const { resp, latencyMs } = await attemptOnce(m.model);
          await logCall({ ...meta, model: m.model, status: m.fallback ? "FALLBACK" : "OK", usage: resp.usage, latencyMs, requestId: resp.requestId });
          return { resp, model: m.model, fallback: m.fallback };
        } catch (err) {
          lastErr = err as typeof lastErr;
          if (!lastErr?.retryable || lastErr.emitted) break;
          if (attempt < m.tries - 1) {
            const delay = Math.min(lastErr.retryAfterMs ?? backoff(attempt), MAX_RETRY_AFTER_MS);
            log.warn("ai.retry", { feature: meta.feature, model: m.model, attempt, code: lastErr.code, delayMs: delay });
            await sleep(delay);
          }
        }
      }
      if (!lastErr?.retryable || lastErr.emitted) break;
    }
    const timedOut = Boolean(lastErr?.timedOut);
    await logCall({ ...meta, model: config.model, status: timedOut ? "TIMEOUT" : "ERROR", latencyMs: lastErr?.latencyMs, errorCode: lastErr?.code ?? "UNKNOWN" });
    log.error("ai.failed", { feature: meta.feature, code: lastErr?.code, status: lastErr?.status });
    throw new GatewayError(timedOut ? "TIMEOUT" : "PROVIDER");
  }

  return {
    provider,

    /** Streaming chat with tool rounds (≤ 6). Preflight runs before any byte is streamed. */
    async prepareStream(raw: StreamInput): Promise<PreparedStream> {
      const { input, prompt, config, degraded, meta } = await preflight(raw);
      const tools: Anthropic.Tool[] = (raw.tools ?? []).map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Tool.InputSchema }));
      const lastTool = tools[tools.length - 1];
      if (lastTool) lastTool.cache_control = { type: "ephemeral" };
      const system = buildSystem(prompt.system, input.skinKey, input.cachedContext, input.dynamicContext);
      const maxMessages = historyTurns(degraded) * 2 + 1;
      const messages: Anthropic.MessageParam[] = input.messages.slice(-maxMessages);

      return {
        async run({ onText }) {
          let text = "";
          let toolCallCount = 0;
          let stopReason = "end_turn";
          let model = config.model;
          let fallbackUsed = false;
          for (let round = 0; ; round++) {
            const toolsAllowed = tools.length > 0 && round < MAX_TOOL_ROUNDS;
            const req: Omit<ProviderRequest, "model"> = {
              max_tokens: config.maxTokens,
              temperature: config.temperature,
              system,
              messages,
              ...(tools.length > 0 ? { tools, ...(toolsAllowed ? {} : { tool_choice: { type: "none" as const } }) } : {}),
            };
            const { resp, model: used, fallback } = await send(meta, config, req, (d) => {
              text += d;
              onText?.(d);
            });
            model = used;
            fallbackUsed ||= fallback;
            stopReason = resp.stopReason;
            const calls = resp.content.filter((b): b is Extract<ProviderBlock, { type: "tool_use" }> => b.type === "tool_use");
            if (resp.stopReason !== "tool_use" || calls.length === 0 || !raw.runTool) {
              const finalText = resp.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("");
              if (!text && finalText) {
                text = finalText;
                onText?.(finalText);
              }
              break;
            }
            if (round >= MAX_TOOL_ROUNDS) {
              stopReason = "tool_rounds_exceeded";
              break;
            }
            messages.push({ role: "assistant", content: resp.content.map((b) => (b.type === "text" ? { type: "text", text: b.text } : { type: "tool_use", id: b.id, name: b.name, input: b.input })) });
            const results: Anthropic.ToolResultBlockParam[] = [];
            for (const call of calls) {
              toolCallCount++;
              const r = await raw.runTool(call.name, call.input).catch(() => ({ content: "Værktøjet kunne ikke køres.", isError: true }));
              results.push({ type: "tool_result", tool_use_id: call.id, content: r.content, ...(r.isError ? { is_error: true } : {}) });
            }
            messages.push({ role: "user", content: results });
          }
          return { text, stopReason, toolCallCount, model, promptVersion: prompt.version, fallbackUsed };
        },
      };
    },

    /** Step 9: structured output via forced tool use, Zod safeParse, one retry with the error, then a controlled error. */
    async callStructured<T>(raw: StreamInput & { schema: z.ZodType<T>; toolName?: string }): Promise<{ data: T; model: string; promptVersion: string }> {
      const { input, prompt, config, meta } = await preflight(raw);
      const name = raw.toolName ?? "structured_output";
      const { $schema: _s, ...schema } = z.toJSONSchema(raw.schema) as Record<string, unknown>;
      const tool: Anthropic.Tool = { name, description: "Returnér svaret i det krævede format.", input_schema: schema as Anthropic.Tool.InputSchema, cache_control: { type: "ephemeral" } };
      const messages: Anthropic.MessageParam[] = [...input.messages];
      for (let attempt = 0; attempt < 2; attempt++) {
        const { resp, model } = await send(meta, config, {
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: buildSystem(prompt.system, input.skinKey, input.cachedContext, input.dynamicContext),
          messages,
          tools: [tool],
          tool_choice: { type: "tool", name },
        });
        const use = resp.content.find((b): b is Extract<ProviderBlock, { type: "tool_use" }> => b.type === "tool_use" && b.name === name);
        const result = raw.schema.safeParse(use?.input);
        if (result.success) return { data: result.data, model, promptVersion: prompt.version };
        if (use) {
          messages.push({ role: "assistant", content: [{ type: "tool_use", id: use.id, name: use.name, input: use.input }] });
          messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: use.id, is_error: true, content: `Ugyldigt format: ${result.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` }] });
        }
      }
      throw new GatewayError("INVALID_OUTPUT");
    },
  };
}

export type Gateway = ReturnType<typeof createGateway>;

let singleton: Gateway | undefined;

/** Process-wide gateway on the validated env and the app database. */
export async function gateway(): Promise<Gateway> {
  if (!singleton) {
    const [{ serverEnv }, { db }] = await Promise.all([import("@/lib/env"), import("@/server/db")]);
    singleton = createGateway({ db: db(), env: serverEnv() });
  }
  return singleton;
}
