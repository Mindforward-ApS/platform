// Scoring rules (docs/05-moduler-og-scoring.md § 5–7). The ONLY place these numbers live in code.

export type HintLevel = 0 | 1 | 2 | 3;

export const scoringConfig = {
  /** Multiplier for the highest hint level used on a step: none/1 = 1.0, 2 = 0.75, 3 (solution shown) = 0 (docs/00 § 2). */
  hintMultipliers: { 0: 1, 1: 1, 2: 0.75, 3: 0 } as const satisfies Record<HintLevel, number>,
  /** Module default when the JSON omits it. */
  defaultPassThreshold: 0.8,
  promptTask: {
    defaultMaxChars: 2000,
    defaultMaxSubmissions: 3,
    /** Character counter is announced to screen readers at this share of maxChars (docs/05 § 9). */
    announceAtShare: 0.9,
  },
  spotError: {
    /** Each correct segment wrongly marked costs this share of one found error. */
    falsePositivePenalty: 0.5,
    /** Step passes when all errors are found and FP ≤ this. */
    maxFalsePositivesToPass: 1,
  },
  judgment: { CORRECT: 1, PARTIAL: 0.5, WRONG: 0 } as const,
  /** QUIZ/JUDGMENT answers faster than this are flagged for statistics only (docs/05 § 7). */
  fastAnswerMs: 1500,
  /** Grader call: 1 retry on invalid output / timeout, then GradingStatus.ERROR (docs/05 § 4). */
  graderRetries: 1,
} as const;

/** docs/02 § 7: grading rate limit per user. */
export const gradingRateLimit = { window: 60, max: 20 } as const;
