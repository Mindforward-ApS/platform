import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { GdprError, startAccountDeletion } from "@/server/gdpr/service";

// POST /api/me/delete (docs/10 § 1.5): sends a confirmation mail (SERVICE) with a one-time link to
// /konto/data/slet. Nothing is deleted until the user confirms; then gdpr.erase-user runs.

export async function POST() {
  let ctx;
  try {
    ctx = await requireUser();
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
  try {
    await startAccountDeletion(db(), ctx.user, serverEnv().APP_URL);
    return NextResponse.json({ status: "CONFIRMATION_SENT" }, { status: 202 });
  } catch (err) {
    if (err instanceof GdprError && err.code === "OWNER_MUST_TRANSFER") return NextResponse.json({ error: "OWNER_MUST_TRANSFER" }, { status: 409 });
    throw err;
  }
}
