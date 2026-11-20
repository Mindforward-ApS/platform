import { connection, NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { createPreviewSession, previewAccessAllowed } from "@/server/auth/preview-access";
import { db } from "@/server/db";

// Preview-only shortcut: signs in the fixed demo user and opens /hjem. 404 unless PREVIEW_AUTO_LOGIN=1 outside
// production (see src/server/auth/preview-access.ts). Listed as a reviewed exception in tests/unit/authz-scan.test.ts.
export async function GET(request: Request) {
  // Never prerender: the answer (and the session cookie) must be made per request, with the runtime env.
  await connection();
  if (!previewAccessAllowed(serverEnv())) return new Response(null, { status: 404 });
  const cookie = await createPreviewSession(db());
  const url = new URL(request.url);
  // Optional ?til=/forloeb/chatgpt — same-site paths only (no "//host" or "/\\host" open redirects).
  const til = url.searchParams.get("til");
  const path = til && /^\/(?![\/\\])/.test(til) ? til : "/hjem";
  const res = NextResponse.redirect(new URL(path, url.origin), 303);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.attributes.httpOnly ?? true,
    secure: cookie.attributes.secure ?? url.protocol === "https:",
    sameSite: "lax",
    path: cookie.attributes.path ?? "/",
    expires: cookie.expiresAt,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
