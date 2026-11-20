import { connection } from "next/server";
import pkg from "../../../../package.json";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";

// Liveness + DB ping (docs/02-arkitektur.md § 8). Public, no authz (allowlisted), no data.
// Used by the external uptime check (docs/runbooks/observability.md): 200 = ok, 503 = DB unreachable.
export async function GET() {
  await connection();
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const region = process.env.VERCEL_REGION ?? "local";
  const base = { app: pkg.name, appVersion: pkg.version, version, region, time: new Date().toISOString() };
  const started = Date.now();
  try {
    await db().$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "ok", dbLatencyMs: Date.now() - started, ...base }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.error("health.db_failed", { err });
    return Response.json({ status: "degraded", db: "error", ...base }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
