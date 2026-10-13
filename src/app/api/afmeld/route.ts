import { EnvValidationError } from "@/lib/env.schema";
import { db } from "@/server/db";
import { unsubscribeWithToken } from "@/server/email/consent";
import { logger } from "@/server/observability/logger";
import { requestMeta } from "@/server/security/request-meta";

// RFC 8058 one-click unsubscribe target for `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (marketing mails, M8).
// Authenticated by the HMAC token in ?t= (no login) — allowlisted in tests/unit/authz-scan.test.ts.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t")?.slice(0, 600) ?? "";
  try {
    const result = await unsubscribeWithToken(db(), token, requestMeta(request.headers));
    return new Response(null, { status: result === "DONE" ? 200 : 400 });
  } catch (err) {
    if (!(err instanceof EnvValidationError)) throw err;
    logger.error("unsubscribe.not_configured", { variables: err.variables });
    return new Response(null, { status: 503 });
  }
}
