import type { AiFeature } from "@/generated/prisma/client";
import type { ServerEnv } from "@/lib/env.schema";

// feature → model config (docs/02-arkitektur.md § 6). Model ids come ONLY from env (AI_MODEL_DEFAULT etc.);
// call sites name a feature, never a model.

export interface ModelConfig {
  model: string;
  /** Used once after retries fail; undefined = no fallback. Never for grading (consistency). */
  fallbackModel?: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

export type ModelEnv = Pick<ServerEnv, "AI_MODEL_DEFAULT" | "AI_MODEL_FALLBACK" | "AI_MODEL_GRADER" | "SUPPORT_MODEL" | "AI_TIMEOUT_MS"> &
  Partial<Pick<ServerEnv, "CONTENT_CLASSIFY_MODEL" | "CONTENT_DRAFT_MODEL" | "CONTENT_VERIFY_MODEL">>;

/** Degraded mode (≥ 95 % of the global budget): shorter answers, shorter history (docs/02 § 6). */
export const DEGRADED_MAX_TOKENS = 400;

/** Hard output ceiling for one connector demo run. */
export const CONNECTOR_DEMO_MAX_TOKENS = 700;

export function modelConfig(feature: AiFeature, env: ModelEnv, opts: { degraded?: boolean } = {}): ModelConfig {
  const small = env.AI_MODEL_DEFAULT;
  const fallback = env.AI_MODEL_FALLBACK && env.AI_MODEL_FALLBACK !== small ? env.AI_MODEL_FALLBACK : undefined;
  const chat = (maxTokens: number): ModelConfig => ({
    model: small,
    fallbackModel: fallback,
    maxTokens: opts.degraded ? Math.min(maxTokens, DEGRADED_MAX_TOKENS) : maxTokens,
    temperature: 0.7,
    timeoutMs: env.AI_TIMEOUT_MS,
  });
  switch (feature) {
    case "SANDBOX_CHAT":
    case "SANDBOX_AGENT":
      return chat(800);
    case "GRADE_PROMPT_TASK":
      return { model: env.AI_MODEL_GRADER ?? small, maxTokens: 600, temperature: 0, timeoutMs: 20_000 };
    case "SUPPORT_AGENT":
      return { model: env.SUPPORT_MODEL ?? small, fallbackModel: fallback, maxTokens: 800, temperature: 0.2, timeoutMs: env.AI_TIMEOUT_MS };
    // Content engine (docs/06): small models for classify/draft; the verifier must be a DIFFERENT model (env schema
    // enforces it). Unset → defaults to the small model, and the engine then refuses to publish (fails safe).
    case "CONTENT_CLASSIFY":
      return { model: env.CONTENT_CLASSIFY_MODEL ?? small, maxTokens: 1500, temperature: 0, timeoutMs: 90_000 };
    case "CONTENT_DRAFT":
      return { model: env.CONTENT_DRAFT_MODEL ?? small, maxTokens: 3000, temperature: 0, timeoutMs: 90_000 };
    case "CONTENT_VERIFY":
      return { model: env.CONTENT_VERIFY_MODEL ?? small, maxTokens: 3000, temperature: 0, timeoutMs: 120_000 };
    // "Prøv den" connector demo: short answers on fictional data — the hard token ceiling per run.
    case "CONNECTOR_DEMO":
      return chat(CONNECTOR_DEMO_MAX_TOKENS);
  }
}

/** History window in turns for chat features (docs/04 § 11). */
export function historyTurns(degraded: boolean): number {
  return degraded ? 6 : 12;
}
