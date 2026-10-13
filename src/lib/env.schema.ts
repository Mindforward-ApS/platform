import { z } from "zod";

// Variables become required in the milestone that first uses them (docs/00-beslutninger.md § 10a).
// Empty strings from .env files are treated as "not set".

const optionalString = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());
const requiredString = z.preprocess((v) => (v === "" ? undefined : v), z.string({ error: "mangler" }).min(1));
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.url().optional());
const optionalEmail = z.preprocess((v) => (v === "" ? undefined : v), z.email().optional());
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
    OAUTH_PROXY_SECRET: optionalString,
    VERCEL_URL: optionalString,
    VERCEL_BRANCH_URL: optionalString,

    // M1 — email (Resend)
    RESEND_API_KEY: optionalString,
    EMAIL_TRANSPORT: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["resend", "log", "file"]).optional()),
    EMAIL_OUTBOX_DIR: optionalString,
    EMAIL_FROM_SERVICE: z.preprocess((v) => (v === "" ? undefined : v), z.string().default("Greb <hej@mail.example.com>")),
    EMAIL_REPLY_TO: optionalEmail,
    EMAIL_ALLOWLIST: optionalString,
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
    if (env.VERCEL_ENV !== "production") return;
    if (!env.RESEND_API_KEY) ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "påkrævet i produktion" });
    if (env.EMAIL_TRANSPORT && env.EMAIL_TRANSPORT !== "resend") {
      ctx.addIssue({ code: "custom", path: ["EMAIL_TRANSPORT"], message: "skal være resend i produktion" });
    }
    for (const key of ["SENTRY_DSN", "INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "påkrævet i produktion" });
    }
    if (env.ENABLE_DEBUG_ROUTES) {
      ctx.addIssue({ code: "custom", path: ["ENABLE_DEBUG_ROUTES"], message: "må ikke være slået til i produktion" });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess((v) => (v === "" ? undefined : v), z.url().optional()),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

export class EnvValidationError extends Error {
  constructor(
    public readonly variables: string[],
    details: string,
  ) {
    super(`Ugyldige eller manglende miljøvariabler: ${variables.join(", ")}\n${details}`);
    this.name = "EnvValidationError";
  }
}

function parseWith<T extends z.ZodType>(schema: T, source: Record<string, string | undefined>): z.infer<T> {
  const result = schema.safeParse(source);
  if (result.success) return result.data;
  const variables = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? "?")))];
  const details = result.error.issues.map((i) => `  - ${String(i.path[0] ?? "?")}: ${i.message}`).join("\n");
  throw new EnvValidationError(variables, details);
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  return parseWith(serverEnvSchema, source);
}

export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  return parseWith(clientEnvSchema, source);
}
