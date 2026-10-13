import { connection } from "next/server";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";

// Liveness + DB ping (docs/02-arkitektur.md § 8). Public, no authz (allowlisted).
export async function GET() {
  await connection();
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const region = process.env.VERCEL_REGION ?? "local";
  const started = Date.now();
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok", dbLatencyMs: Date.now() - started, version, region });
  } catch (err) {
    logger.error("health.db_failed", { err });
    return Response.json({ status: "degraded", db: "error", version, region }, { status: 503 });
  }
}
