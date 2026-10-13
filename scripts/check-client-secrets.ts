import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Build check (M1): no secret env var names or values in the browser bundle (.next/static).
// Run after `pnpm build`.

export const SECRET_ENV_NAMES = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "BETTER_AUTH_SECRET",
  "MICROSOFT_CLIENT_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "OAUTH_PROXY_SECRET",
  "RESEND_API_KEY",
  "INNGEST_SIGNING_KEY",
  "INNGEST_EVENT_KEY",
  "SENTRY_AUTH_TOKEN",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TOKEN_HASH_SECRET",
  "UNSUBSCRIBE_TOKEN_SECRET",
  "EMAIL_HASH_PEPPER",
] as const;

export function findLeaks(bundle: string, env: Record<string, string | undefined>): string[] {
  const leaks: string[] = [];
  for (const name of SECRET_ENV_NAMES) {
    if (bundle.includes(name)) leaks.push(`name:${name}`);
    const value = env[name];
    if (value && value.length >= 12 && bundle.includes(value)) leaks.push(`value:${name}`);
  }
  return leaks;
}

function readAll(dir: string): string {
  let out = "";
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out += readAll(full);
    else if (/\.(js|mjs|css|html|json)$/.test(entry)) out += readFileSync(full, "utf8");
  }
  return out;
}

function main() {
  const leaks = findLeaks(readAll(".next/static"), process.env);
  if (leaks.length === 0) {
    console.log("check-client-secrets: OK");
    return;
  }
  console.error(`check-client-secrets: secrets in client bundle → ${leaks.join(", ")}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
