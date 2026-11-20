import { z } from "zod";

// Content-engine limits and switches (docs/06 §§ 5, 8, 11, 13). Defaults here; env overrides; FeatureFlag rows
// override the two kill switches at runtime (flags.ts).

const num = (def: number) => z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.coerce.number().min(0).default(def));
const bool = (def: boolean) =>
  z.preprocess((v) => (v === "" || v === undefined ? undefined : v), z.enum(["0", "1", "true", "false"]).optional()).transform((v) => (v === undefined ? def : v === "1" || v === "true"));
const str = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const schema = z.object({
  CONTENT_PIPELINE_ENABLED: bool(false),
  CONTENT_AUTOPUBLISH_ENABLED: bool(false),
  CONTENT_MONTHLY_BUDGET_DKK: num(300),
  CONTENT_RELEVANCE_THRESHOLD: num(0.6),
  CONTENT_USER_AGENT: str,
  CONTENT_CLASSIFY_MODEL: str,
  CONTENT_DRAFT_MODEL: str,
  CONTENT_VERIFY_MODEL: str,
  GITHUB_REPO: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[\w.-]+\/[\w.-]+$/).optional()),
  GITHUB_TOKEN: str,
  APP_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().default("https://mindforward.dk")),
});

export interface ContentConfig {
  pipelineEnabledDefault: boolean;
  autopublishEnabledDefault: boolean;
  monthlyBudgetDkk: number;
  budgetAlertPct: number;
  relevanceThreshold: number;
  /** verify FAIL after re-draft: IN_REVIEW at or above this relevance, otherwise ARCHIVED. */
  reviewRelevance: number;
  dailyCaps: { classify: number; draft: number; verify: number };
  autopublishPerTrackPerDay: number;
  anomalyNewEntries: number;
  maxEntryAgeDays: number;
  maxRedrafts: number;
  newsMaxAgeDays: number;
  userAgent: string;
  models: { classify?: string; draft?: string; verify?: string };
  github: { repo?: string; token?: string };
  appUrl: string;
}

export function loadContentConfig(env: Record<string, string | undefined> = process.env): ContentConfig {
  const e = schema.parse(env);
  return {
    pipelineEnabledDefault: e.CONTENT_PIPELINE_ENABLED,
    autopublishEnabledDefault: e.CONTENT_AUTOPUBLISH_ENABLED,
    monthlyBudgetDkk: e.CONTENT_MONTHLY_BUDGET_DKK,
    budgetAlertPct: 0.8,
    relevanceThreshold: e.CONTENT_RELEVANCE_THRESHOLD,
    reviewRelevance: 0.8,
    dailyCaps: { classify: 60, draft: 10, verify: 20 },
    autopublishPerTrackPerDay: 3,
    anomalyNewEntries: 20,
    maxEntryAgeDays: 60,
    maxRedrafts: 1,
    newsMaxAgeDays: 120,
    userAgent: e.CONTENT_USER_AGENT ?? `GrebContentBot/1.0 (+${e.APP_URL}/bot)`,
    models: { classify: e.CONTENT_CLASSIFY_MODEL, draft: e.CONTENT_DRAFT_MODEL, verify: e.CONTENT_VERIFY_MODEL },
    github: { repo: e.GITHUB_REPO, token: e.GITHUB_TOKEN },
    appUrl: e.APP_URL,
  };
}

export class ContentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentConfigError";
  }
}

/** docs/06 § 7.3: the verifier must be an independent model. Checked before any draft/verify. */
export function assertIndependentVerifier(cfg: Pick<ContentConfig, "models">): void {
  const { draft, verify } = cfg.models;
  if (!draft || !verify) throw new ContentConfigError("CONTENT_DRAFT_MODEL and CONTENT_VERIFY_MODEL must be set");
  if (draft === verify) throw new ContentConfigError("CONTENT_VERIFY_MODEL must differ from CONTENT_DRAFT_MODEL");
}
