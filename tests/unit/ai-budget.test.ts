import { describe, expect, it } from "vitest";
import { budgetMonth, CAP_MESSAGE, evaluateCap, usageDay, weightedTokens } from "@/server/ai/budget";
import { modelConfig } from "@/server/ai/models";
import { costDkk } from "@/server/ai/pricing";
import { getPrompt } from "@/server/ai/registry";
import { getMessages } from "@/lib/i18n";

const env = { AI_MODEL_DEFAULT: "claude-haiku-4-5", AI_MODEL_FALLBACK: undefined, AI_MODEL_GRADER: undefined, SUPPORT_MODEL: undefined, AI_TIMEOUT_MS: 30000 };

describe("daily per-user token cap (docs/04 § 11)", () => {
  it("weights cache reads at 0.1 and counts input, output and cache writes fully", () => {
    expect(weightedTokens({ inputTokens: 1000, outputTokens: 300, cacheWriteTokens: 200, cacheReadTokens: 3000 })).toBe(1800);
  });
  it("blocks at the cap, not before", () => {
    expect(evaluateCap(59_999, 60_000).allowed).toBe(true);
    expect(evaluateCap(60_000, 60_000).allowed).toBe(false);
    expect(evaluateCap(0, 0).allowed).toBe(false);
  });
  it("has a friendly Danish message", () => {
    expect(CAP_MESSAGE).toBe("Du har brugt dagens øvekvote. Den nulstilles kl. 00.");
    expect(getMessages().sandbox.errors.USER_CAP).toBe(CAP_MESSAGE);
  });
  it("uses the Europe/Copenhagen day and month", () => {
    expect(usageDay(new Date("2026-10-13T22:30:00Z")).toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(budgetMonth(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11");
  });
});

describe("model config and pricing (docs/02 § 6)", () => {
  it("chat uses the small default model with temp 0.7 and 800 tokens (400 degraded)", () => {
    expect(modelConfig("SANDBOX_CHAT", env)).toEqual({ model: "claude-haiku-4-5", fallbackModel: undefined, maxTokens: 800, temperature: 0.7, timeoutMs: 30000 });
    expect(modelConfig("SANDBOX_CHAT", env, { degraded: true }).maxTokens).toBe(400);
    expect(modelConfig("GRADE_PROMPT_TASK", { ...env, AI_MODEL_FALLBACK: "claude-sonnet-4-6" })).not.toHaveProperty("fallbackModel"); // grader never falls back
  });
  it("prices tokens incl. cache multipliers in DKK", () => {
    // Haiku 4.5: $1 in / $5 out per MTok → 1M in + 0.2M out = $2 → 13.8 kr at 6.9
    expect(costDkk("claude-haiku-4-5", { inputTokens: 1_000_000, outputTokens: 200_000, cacheReadTokens: 0, cacheWriteTokens: 0 }, 6.9)).toBe(13.8);
    expect(costDkk("claude-haiku-4-5", { inputTokens: 0, outputTokens: 0, cacheReadTokens: 1_000_000, cacheWriteTokens: 0 }, 10)).toBe(1);
  });
  it("prompts are versioned in the registry", () => {
    expect(getPrompt("sandbox-chat")).toMatchObject({ key: "sandbox-chat", version: "v1", cache: true });
    expect(() => getPrompt("sandbox-chat", "v9")).toThrow();
  });
});
