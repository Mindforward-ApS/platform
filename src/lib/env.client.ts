import { z } from "zod";
import { parseWith } from "./env.shared";

// Browser-safe env: only NEXT_PUBLIC_* and never imports the server schema (scripts/check-client-secrets.ts).
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.url().optional());

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
  // M10 — PostHog EU. The ".env.example" placeholder "phc_" counts as unset (PostHog is then never loaded).
  NEXT_PUBLIC_POSTHOG_KEY: z.preprocess((v) => (v === "" || v === "phc_" ? undefined : v), z.string().optional()),
  NEXT_PUBLIC_POSTHOG_HOST: z.preprocess((v) => (v === "" ? undefined : v), z.url().default("https://eu.i.posthog.com")),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them into the bundle.
export const clientEnv: ClientEnv = parseWith(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});
