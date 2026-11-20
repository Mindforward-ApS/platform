import { NextResponse } from "next/server";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { badgeImage } from "@/server/certificates/card-image";
import { certificateDetails } from "@/server/certificates/service";
import { db } from "@/server/db";

// Square PNG badge for the holder's CV or profile. Holder only; generated on demand, nothing stored.

export async function GET(_request: Request, ctx: RouteContext<"/api/certifikater/[id]/badge">) {
  let auth;
  try {
    auth = await requireUser();
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
  const { id } = await ctx.params;
  const d = await certificateDetails(db(), auth.user.id, id.slice(0, 64));
  if (!d) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const img = badgeImage({ holderName: d.holderName, levelLabel: d.levelLabel, trackName: d.trackName, issuedLabel: format(getMessages().account.certificates.issuedOn, { date: formatDateDa(d.issuedAt) }), verificationCode: d.verificationCode });
  const png = await img.arrayBuffer();
  return new Response(png, {
    headers: {
      "content-type": "image/png",
      "content-disposition": `attachment; filename="mindforward-badge-${d.verificationCode}.png"`,
      "cache-control": "private, no-store",
    },
  });
}
