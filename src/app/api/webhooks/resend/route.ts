import { db } from "@/server/db";
import { handleResendWebhook } from "@/server/email/resend-webhook";

// Resend → us (bounce, complaint, delivered). Authenticated by the Svix signature (svix-id/-timestamp/-signature,
// RESEND_WEBHOOK_SECRET) verified on the raw body before any parsing — not by a user session, so it is
// allowlisted in tests/unit/authz-scan.test.ts.
export async function POST(request: Request) {
  const raw = await request.text();
  const result = await handleResendWebhook({ db: db() }, raw, request.headers);
  return Response.json(result.body, { status: result.status });
}
