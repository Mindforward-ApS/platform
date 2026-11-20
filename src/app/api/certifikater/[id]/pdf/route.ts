import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { certificatePdf } from "@/server/certificates/pdf";
import { certificateDetails } from "@/server/certificates/service";
import { db } from "@/server/db";

// Certificate PDF, generated on demand for its holder only (nothing stored; pdfStorageKey stays null).

export async function GET(_request: Request, ctx: RouteContext<"/api/certifikater/[id]/pdf">) {
  let auth;
  try {
    auth = await requireUser();
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
  const { id } = await ctx.params;
  const details = await certificateDetails(db(), auth.user.id, id.slice(0, 64));
  if (!details) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const pdf = await certificatePdf(details, `${serverEnv().APP_URL}/certifikat/${details.verificationCode}`);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="mindforward-certifikat-${details.verificationCode}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
