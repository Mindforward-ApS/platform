import { execSync } from "node:child_process";

// Apply migrations to the e2e database (local Postgres or the CI service container; never Neon).
export default function globalSetup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must point at the e2e database");
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL_UNPOOLED: url } });
}
