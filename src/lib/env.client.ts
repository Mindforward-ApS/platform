import { z } from "zod";
import { parseWith } from "./env.shared";

// Browser-safe env: only NEXT_PUBLIC_* and never imports the server schema (scripts/check-client-secrets.ts).
const optionalUrl = z.preprocess((v) => (v === "" ? undefined : v), z.url().optional());

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrl,
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them into the bundle.
export const clientEnv: ClientEnv = parseWith(clientEnvSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
