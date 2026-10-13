// Token prices per model in USD per million tokens (Anthropic first-party list prices, checked 2026-10-13 against the
// Claude API model table; re-verify at launch). Cache writes cost 1.25× input (5-min TTL), cache reads 0.1× input.

export interface ModelPrice {
  inputUsdPerMTok: number;
  outputUsdPerMTok: number;
}

const PRICES: Record<string, ModelPrice> = {
  "claude-haiku-4-5": { inputUsdPerMTok: 1, outputUsdPerMTok: 5 },
  "claude-sonnet-4-6": { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
  "claude-sonnet-5": { inputUsdPerMTok: 2, outputUsdPerMTok: 10 },
  "claude-opus-4-8": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
  "claude-opus-5": { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
};

/** Unknown models are priced conservatively (the most expensive listed tier) so budgets never under-count. */
const UNKNOWN: ModelPrice = { inputUsdPerMTok: 5, outputUsdPerMTok: 25 };

export function priceFor(model: string): ModelPrice {
  return PRICES[model] ?? UNKNOWN;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

export function costUsd(model: string, u: TokenUsage): number {
  const p = priceFor(model);
  const input = u.inputTokens * p.inputUsdPerMTok + u.cacheWriteTokens * p.inputUsdPerMTok * 1.25 + u.cacheReadTokens * p.inputUsdPerMTok * 0.1;
  return (input + u.outputTokens * p.outputUsdPerMTok) / 1_000_000;
}

export function costDkk(model: string, u: TokenUsage, usdDkkRate: number): number {
  return Math.round(costUsd(model, u) * usdDkkRate * 10_000) / 10_000;
}
