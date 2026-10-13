import { parseClientEnv } from "./env.schema";

// NEXT_PUBLIC_* must be referenced literally so Next.js can inline them into the bundle.
export const clientEnv = parseClientEnv({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});
