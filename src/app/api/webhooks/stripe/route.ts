import { billingDeps } from "@/server/billing/deps";
import { handleStripeWebhook } from "@/server/billing/webhook";

// Stripe → us. Authenticated by the Stripe-Signature header (verified on the raw body before any parsing),
// not by a user session — allowlisted in tests/unit/authz-scan.test.ts for that reason.
export async function POST(request: Request) {
  const raw = await request.text();
  const result = await handleStripeWebhook(billingDeps(), raw, request.headers.get("stripe-signature"));
  return Response.json(result.body, { status: result.status });
}
