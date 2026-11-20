import { execSync } from "node:child_process";

// Integration tests run against a dedicated local/CI Postgres (never Neon or other third parties).
// Non-destructive: apply pending migrations; tests create their own rows with random ids.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://greb@127.0.0.1:5435/greb_test";
  process.env.TEST_DATABASE_URL = url;
  execSync("pnpm exec prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL_UNPOOLED: url } });
}
