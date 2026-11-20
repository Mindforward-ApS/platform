import { execSync } from "node:child_process";

// Apply migrations to the e2e database (local Postgres or the CI service container; never Neon).
export default function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must point at the e2e database");
  if (/neon\.tech/.test(url)) throw new Error("e2e must never run against Neon");
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL_UNPOOLED: url } });
  // Tracks, plans and modules (core-prompt-01 is IN_REVIEW; the web server runs with ALLOW_UNPUBLISHED_MODULES=1).
  execSync("pnpm exec tsx --conditions=react-server prisma/seed.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  // Forløb content (idempotent; kept out of prisma/seed.ts so the Vercel preview build never runs it).
  execSync("pnpm exec tsx --conditions=react-server prisma/seed/forloeb.ts", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
  // Repeated local runs share one IP: reset rate-limit counters in this disposable e2e database only.
  execSync(`psql "${url}" -c 'DELETE FROM rate_limit'`, { stdio: "inherit" });
}
