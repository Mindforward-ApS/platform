import { connection } from "next/server";
import { serverEnv } from "@/lib/env";

// Preview-only: throws so we can verify Sentry receives server errors (M0 acceptance).
// Disabled unless ENABLE_DEBUG_ROUTES=1, which env validation forbids in production.
export async function GET() {
  await connection();
  if (!serverEnv().ENABLE_DEBUG_ROUTES) return new Response(null, { status: 404 });
  throw new Error("MindForward Sentry test error (M0)");
}
