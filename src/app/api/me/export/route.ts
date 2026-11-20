import { NextResponse } from "next/server";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { exportUserData, GdprError } from "@/server/gdpr/service";

// GET /api/me/export (docs/10 § 1.5): the signed-in user's own data as JSON. Rate limit 1 per 24 hours.

export async function GET() {
  let ctx;
  try {
    ctx = await requireUser();
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
  try {
    const data = await exportUserData(db(), ctx.user.id);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="mindforward-mine-data-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof GdprError && err.code === "RATE_LIMITED") return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "retry-after": "86400" } });
    throw err;
  }
}
