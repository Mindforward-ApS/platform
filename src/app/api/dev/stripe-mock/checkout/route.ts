import { serverEnv } from "@/lib/env";
import { requireUser } from "@/server/auth/authz";
import { getFakeStripe } from "@/server/billing/stripe";

// STRIPE_MOCK only (env validation forbids it in production): stands in for Stripe's hosted Checkout page.
// "Paying" completes the fake session, which emits signed webhooks to /api/webhooks/stripe like Stripe does.
export async function GET(request: Request) {
  if (!serverEnv().STRIPE_MOCK) return new Response("Not found", { status: 404 });
  await requireUser();
  const sessionId = new URL(request.url).searchParams.get("session");
  if (!sessionId) return new Response("Missing session", { status: 400 });
  const session = await getFakeStripe().completeCheckout(sessionId);
  return Response.redirect(session.success_url ?? `${serverEnv().APP_URL}/konto/abonnement`, 303);
}
