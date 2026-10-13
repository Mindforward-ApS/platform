// Placement test + plan rules (docs/01 § 4.1, content/curriculum.md "Niveautest → plan", docs/02 § 7).
// Numbers live here, not in components or content files; content:validate checks the tests against them.

export const placementConfig = {
  /** Curriculum: 12 questions. A test file may not exceed this. */
  maxQuestions: 12,
  /** Roadmap M5: the test can be finished in ≤ 5 minutes (sum of estimatedSeconds incl. profile questions). */
  timeBudgetSeconds: 300,
  /** Seconds per profile question (role, Copilot license) in the time budget. */
  profileQuestionSeconds: 10,
  /** Bot protection: a submit faster than this after the page was rendered is rejected. */
  minCompletionSeconds: 10,
  /** A rendered test form stays valid this long. */
  startTokenMaxAgeSeconds: 6 * 60 * 60,
  /** httpOnly cookie that carries the anonymous result until signup ("Gem resultat og fortsæt gratis"). */
  resultCookieMaxAgeSeconds: 30 * 24 * 60 * 60,
  /** Area outcome: all correct = SECURE ("kan springes over"); below this % = UNCERTAIN (prioritised); else PARTIAL. */
  uncertainBelowPct: 50,
  /** Overall level from the total score. */
  level2MinPct: 50,
  level3MinPct: 80,
  /** Never "kan springes over", even when the area is SECURE (curriculum). */
  alwaysRequired: ["core-data-01", "core-aiact-01"],
  /** B2C free modules: placed first unless the test marks them skippable (curriculum Niveau 1 note). */
  freeFirst: ["core-llm-01", "core-prompt-01", "core-data-01"],
  recommendationCount: 3,
  planPreviewCount: 8,
} as const;

/** docs/02 § 7: public test 10/hour per IP; consent signup 5/hour per IP and per email. */
export const placementRateLimits = {
  submitPerIp: { window: 60 * 60, max: 10 },
  consentPerIp: { window: 60 * 60, max: 5 },
  consentPerEmail: { window: 60 * 60, max: 5 },
  unsubscribePerIp: { window: 60 * 60, max: 30 },
} as const;

/** Double opt-in (docs/09 § 2). */
export const consentConfig = {
  confirmationValidDays: 7,
  /** Unconfirmed GRANTED rows are deleted after this (job consent.expire-unconfirmed). */
  unconfirmedRetentionDays: 30,
} as const;

export const PLACEMENT_TRACKS = ["chatgpt", "copilot", "claude"] as const;
export type PlacementTrackSlug = (typeof PLACEMENT_TRACKS)[number];
