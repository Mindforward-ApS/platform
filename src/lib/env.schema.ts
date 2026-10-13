import { z } from "zod";
import { parseWith } from "./env.shared";

export { EnvValidationError } from "./env.shared";

// Variables become required in the milestone that first uses them (docs/00-beslutninger.md § 10a).
// Empty strings from .env files are treated as "not set".

const optionalString = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());
const requiredString = z.preprocess((v) => (v === "" ? undefined : v), z.string({ error: "mangler" }).min(1));
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.url().optional());
const optionalEmail = z.preprocess((v) => (v === "" ? undefined : v), z.email().optional());
// Accepts 0/1 and true/false (.env.example uses true/false for kill switches).
const boolFlag = z.preprocess((v) => (v === "" || v === undefined ? "false" : v), z.enum(["0", "1", "true", "false"])).transform((v) => v === "1" || v === "true");
const flag = z.preprocess((v) => (v === "" || v === undefined ? "0" : v), z.enum(["0", "1"])).transform((v) => v === "1");

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    VERCEL_ENV: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["development", "preview", "production"]).optional()),
    APP_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url({ error: "skal være en gyldig URL" })),
    DATABASE_URL: requiredString.pipe(z.string().regex(/^postgres(ql)?:\/\//, "skal være en postgresql://-URL")),
    DATABASE_URL_UNPOOLED: optionalString,
    SENTRY_DSN: optionalUrl,
    SENTRY_ENVIRONMENT: optionalString,
    INNGEST_EVENT_KEY: optionalString,
    INNGEST_SIGNING_KEY: optionalString,
    INNGEST_DEV: flag,
    ENABLE_DEBUG_ROUTES: flag,
    LOG_LEVEL: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["debug", "info", "warn", "error"]).default("info")),

    // M1 — auth (Better Auth)
    BETTER_AUTH_SECRET: requiredString.pipe(z.string().min(32, "skal være mindst 32 tegn (openssl rand -base64 32)")),
    MICROSOFT_CLIENT_ID: optionalString,
    MICROSOFT_CLIENT_SECRET: optionalString,
    MICROSOFT_TENANT_ID: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("common")),
    GOOGLE_CLIENT_ID: optionalString,
    GOOGLE_CLIENT_SECRET: optionalString,
    MAGIC_LINK_EXPIRES_MIN: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(5).max(60).default(15)),
    // Stable production URL: OAuth redirect URIs point here; previews are proxied through it (oauth-proxy).
    AUTH_PRODUCTION_URL: optionalUrl,
    OAUTH_PROXY_SECRET: optionalString,
    VERCEL_URL: optionalString,
    VERCEL_BRANCH_URL: optionalString,

    // M1 — email (Resend)
    RESEND_API_KEY: optionalString,
    EMAIL_TRANSPORT: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["resend", "log", "file"]).optional()),
    EMAIL_OUTBOX_DIR: optionalString,
    EMAIL_FROM_SERVICE: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("Mindforward <hej@mail.mindforward.dk>")),
    EMAIL_REPLY_TO: optionalEmail,
    EMAIL_ALLOWLIST: optionalString,

    // M4 — module player (dev/e2e switches; all forbidden in production)
    ALLOW_UNPUBLISHED_MODULES: flag,
    GRADER_MOCK: flag,
    CLICK_TASK_MOCK: flag,
    // M6 — billing (Stripe). Keys are checked when billing is first used (src/server/billing/stripe.ts),
    // so previews of other milestones start without them. STRIPE_MOCK=1 = in-process fake Stripe (tests/e2e).
    STRIPE_SECRET_KEY: optionalString,
    STRIPE_WEBHOOK_SECRET: optionalString,
    STRIPE_PRICE_B2C_MONTHLY: optionalString,
    STRIPE_PRICE_B2B_MONTHLY: optionalString,
    STRIPE_PRICE_B2B_ANNUAL: optionalString,
    TAX_RATE_DK_25_INCLUSIVE: optionalString,
    TAX_RATE_DK_25_EXCLUSIVE: optionalString,
    STRIPE_PORTAL_CONFIGURATION_ID: optionalString,
    STRIPE_MOCK: flag,
    // 1 = run Inngest-triggered billing jobs inline in the request (tests/e2e without the Inngest Dev Server).
    JOBS_INLINE: flag,
    SUPPORT_INBOX: optionalEmail,
    COMPANY_LEGAL_NAME: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("Mindforward (Esther Gruppen ApS)")),
    COMPANY_CVR: optionalString,
    COMPANY_ADDRESS: optionalString,
    // M3 — AI gateway (src/server/ai/). Model ids live ONLY here/in models.ts, never at call sites.
    ANTHROPIC_API_KEY: optionalString,
    AI_ENABLED: z.preprocess((v) => (v === "" || v === undefined ? "1" : v), z.enum(["0", "1"])).transform((v) => v === "1"),
    AI_MOCK: flag,
    AI_MODEL_DEFAULT: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[a-z0-9.-]+$/).default("claude-haiku-4-5")),
    AI_MODEL_FALLBACK: optionalString,
    AI_MODEL_GRADER: optionalString,
    SUPPORT_MODEL: optionalString,
    AI_TIMEOUT_MS: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(1000).max(300_000).default(30_000)),
    AI_USER_DAILY_TOKEN_CAP: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).default(60_000)),
    AI_USER_DAILY_GRADING_CAP: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().int().min(0).default(60)),
    AI_GLOBAL_MONTHLY_BUDGET_DKK: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).default(5000)),
    AI_USD_DKK_RATE: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().positive().default(6.9)),
    // M5 — consent + unsubscribe. Optional at boot; code that needs them throws a clear EnvValidationError.
    EMAIL_FROM_MARKETING: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("Mindforward <nyt@news.mindforward.dk>")),
    UNSUBSCRIBE_TOKEN_SECRET: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(32, "skal være mindst 32 tegn (openssl rand -base64 32)").optional()),
    EMAIL_HASH_PEPPER: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(16, "skal være mindst 16 tegn").optional()),
    // Marketing kill switch fallback (FeatureFlag wins once it exists). M5 sends no marketing mail.
    MARKETING_EMAIL_ENABLED: boolFlag,
    // M9 — content engine (read by src/server/content-engine/config.ts; FeatureFlag rows win for the kill switches).
    CONTENT_PIPELINE_ENABLED: boolFlag,
    CONTENT_AUTOPUBLISH_ENABLED: boolFlag,
    CONTENT_MONTHLY_BUDGET_DKK: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).default(300)),
    CONTENT_RELEVANCE_THRESHOLD: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().min(0).max(1).default(0.6)),
    CONTENT_USER_AGENT: optionalString,
    CONTENT_CLASSIFY_MODEL: optionalString,
    CONTENT_DRAFT_MODEL: optionalString,
    CONTENT_VERIFY_MODEL: optionalString,
    GITHUB_REPO: z.preprocess((v) => (v === "" ? undefined : v), z.string().regex(/^[\w.-]+\/[\w.-]+$/, "skal være owner/repo").optional()),
    GITHUB_TOKEN: optionalString,
    // M8 — Resend webhooks (Svix signature). Optional at boot; the webhook route answers 503 without it.
    RESEND_WEBHOOK_SECRET: z.preprocess((v) => (v === "" || v === "whsec_" ? undefined : v), z.string().startsWith("whsec_", "skal starte med whsec_").optional()),
  })
  .superRefine((env, ctx) => {
    const pairs = [
      ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
      ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ] as const;
    for (const [id, secret] of pairs) {
      if (Boolean(env[id]) !== Boolean(env[secret])) {
        ctx.addIssue({ code: "custom", path: [env[id] ? secret : id], message: `skal sættes sammen med ${env[id] ? id : secret}` });
      }
    }
    if (env.EMAIL_TRANSPORT === "resend" && !env.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "påkrævet når EMAIL_TRANSPORT=resend" });
    }
    if (env.CONTENT_DRAFT_MODEL && env.CONTENT_VERIFY_MODEL && env.CONTENT_DRAFT_MODEL === env.CONTENT_VERIFY_MODEL) {
      ctx.addIssue({ code: "custom", path: ["CONTENT_VERIFY_MODEL"], message: "skal være en anden model end CONTENT_DRAFT_MODEL (uafhængig verifikator)" });
    }
    if (env.VERCEL_ENV !== "production") return;
    if (!env.RESEND_API_KEY) ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "påkrævet i produktion" });
    if (env.EMAIL_TRANSPORT && env.EMAIL_TRANSPORT !== "resend") {
      ctx.addIssue({ code: "custom", path: ["EMAIL_TRANSPORT"], message: "skal være resend i produktion" });
    }
    for (const key of ["SENTRY_DSN", "INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "påkrævet i produktion" });
    }
    if (env.AI_MOCK) ctx.addIssue({ code: "custom", path: ["AI_MOCK"], message: "må ikke være slået til i produktion" });
    if (env.AI_ENABLED && !env.ANTHROPIC_API_KEY) ctx.addIssue({ code: "custom", path: ["ANTHROPIC_API_KEY"], message: "påkrævet i produktion (eller sæt AI_ENABLED=0)" });
    if (env.ENABLE_DEBUG_ROUTES) {
      ctx.addIssue({ code: "custom", path: ["ENABLE_DEBUG_ROUTES"], message: "må ikke være slået til i produktion" });
    }
    for (const key of ["ALLOW_UNPUBLISHED_MODULES", "GRADER_MOCK", "CLICK_TASK_MOCK", "STRIPE_MOCK", "JOBS_INLINE"] as const) {
      if (env[key]) ctx.addIssue({ code: "custom", path: [key], message: "må ikke være slået til i produktion" });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return parseWith(serverEnvSchema, source);
}

