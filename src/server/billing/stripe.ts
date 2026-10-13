import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";
import type { ServerEnv } from "@/lib/env.schema";
import { createFakeStripe, type FakePrice, type FakeStripe } from "./fake-stripe";
import { getPlan, planKeyForPriceId } from "./plans";
import { planPrice } from "./vat";

/** The fake charges what config says the Stripe Price costs (gross, incl. VAT). */
export function fakePriceFromConfig(priceId: string, env: ServerEnv): FakePrice | null {
  const key = planKeyForPriceId(priceId, env);
  if (!key) return null;
  const plan = getPlan(key);
  return { unitAmountOre: planPrice(plan, 1).grossOre, interval: plan.interval === "YEAR" ? "year" : "month" };
}

// The single Stripe entry point (docs/07-betaling.md § 1.6). API version pinned here and verified against the
// installed `stripe` package types (v23: current_period_start/end live on subscription ITEMS, invoice
// payments are in `invoice.payments`, hosted Checkout is `ui_mode: "hosted_page"`).
export const STRIPE_API_VERSION = "2026-09-30.endive" as const;

/** The subset of the Stripe SDK billing uses. Responses are `unknown` and parsed with Zod at the boundary. */
export interface StripeGateway {
  customers: {
    create(params: Stripe.CustomerCreateParams, options?: Stripe.RequestOptions): Promise<{ id: string }>;
    update(id: string, params: Stripe.CustomerUpdateParams, options?: Stripe.RequestOptions): Promise<{ id: string }>;
  };
  checkout: {
    sessions: { create(params: Stripe.Checkout.SessionCreateParams, options?: Stripe.RequestOptions): Promise<{ id: string; url: string | null }> };
  };
  subscriptions: {
    create(params: Stripe.SubscriptionCreateParams, options?: Stripe.RequestOptions): Promise<unknown>;
    retrieve(id: string): Promise<unknown>;
    update(id: string, params: Stripe.SubscriptionUpdateParams, options?: Stripe.RequestOptions): Promise<unknown>;
    cancel(id: string, params?: Stripe.SubscriptionCancelParams, options?: Stripe.RequestOptions): Promise<unknown>;
  };
  invoices: { retrieve(id: string, params?: Stripe.InvoiceRetrieveParams): Promise<unknown> };
  setupIntents: { retrieve(id: string): Promise<unknown> };
  billingPortal: { sessions: { create(params: Stripe.BillingPortal.SessionCreateParams): Promise<{ url: string }> } };
  refunds: { create(params: Stripe.RefundCreateParams, options?: Stripe.RequestOptions): Promise<{ id: string; amount: number }> };
  webhooks: { constructEvent(payload: string, header: string, secret: string): unknown };
}

/** Secret used by the fake Stripe to sign the events it emits (tests/e2e only). */
export const MOCK_WEBHOOK_SECRET = "whsec_greb_mock_secret";

const globalForStripe = globalThis as unknown as { stripeGateway?: StripeGateway; fakeStripe?: FakeStripe };

/** Fake Stripe singleton (STRIPE_MOCK=1). Emits signed webhook events to our own endpoint, like Stripe would. */
export function getFakeStripe(): FakeStripe {
  globalForStripe.fakeStripe ??= createFakeStripe({
    webhookSecret: webhookSecret(),
    appUrl: serverEnv().APP_URL,
    prices: (priceId) => fakePriceFromConfig(priceId, serverEnv()),
    emit: async (payload, header) => {
      // Local loopback only (mock mode): deliver like Stripe does, through the real signature-checked route.
      const res = await fetch(`${serverEnv().APP_URL}/api/webhooks/stripe`, {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": header },
        body: payload,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`mock webhook delivery failed: ${res.status}`);
    },
  });
  return globalForStripe.fakeStripe;
}

export function getStripe(): StripeGateway {
  if (globalForStripe.stripeGateway) return globalForStripe.stripeGateway;
  const env = serverEnv();
  if (env.STRIPE_MOCK) {
    globalForStripe.stripeGateway = getFakeStripe();
  } else {
    if (!env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY === "sk_test_") throw new Error("STRIPE_SECRET_KEY mangler");
    // SDK handles timeout + retries (idempotency keys make POST retries safe; docs: CLAUDE.md "eksterne kald").
    globalForStripe.stripeGateway = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: STRIPE_API_VERSION,
      maxNetworkRetries: 2,
      timeout: 15_000,
      appInfo: { name: "greb" },
    });
  }
  return globalForStripe.stripeGateway;
}

/** For tests: inject a fake gateway. */
export function setStripeForTests(gateway: StripeGateway | undefined): void {
  globalForStripe.stripeGateway = gateway;
}

export function webhookSecret(env: Pick<ServerEnv, "STRIPE_MOCK" | "STRIPE_WEBHOOK_SECRET"> = serverEnv()): string {
  if (env.STRIPE_MOCK) return env.STRIPE_WEBHOOK_SECRET && env.STRIPE_WEBHOOK_SECRET !== "whsec_" ? env.STRIPE_WEBHOOK_SECRET : MOCK_WEBHOOK_SECRET;
  if (!env.STRIPE_WEBHOOK_SECRET || env.STRIPE_WEBHOOK_SECRET === "whsec_") throw new Error("STRIPE_WEBHOOK_SECRET mangler");
  return env.STRIPE_WEBHOOK_SECRET;
}
