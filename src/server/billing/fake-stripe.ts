import Stripe from "stripe";
import type { StripeGateway } from "./stripe";

// In-process fake of exactly the Stripe calls billing uses (STRIPE_MOCK=1, tests, e2e). No network.
// Objects follow the shapes of the pinned API version (items carry current_period_*; invoices carry payments).
// Webhook events are signed with Stripe's own test-header helper and verified with Stripe's real
// constructEvent, so signature checking is exercised even without keys.

export interface FakePrice {
  /** Gross amount charged per unit (incl. VAT), øre. */
  unitAmountOre: number;
  interval: "month" | "year";
}

export interface FakeStripeOptions {
  webhookSecret: string;
  appUrl: string;
  /** Delivers a signed event. Without it, events queue up in `pendingEvents` for the test to deliver. */
  emit?: (payload: string, header: string) => Promise<void>;
  prices?: (priceId: string) => FakePrice | null;
}

interface FakeItem {
  id: string;
  object: "subscription_item";
  price: { id: string; object: "price" };
  quantity: number;
  current_period_start: number;
  current_period_end: number;
}

interface FakeSubscription {
  id: string;
  object: "subscription";
  customer: string;
  status: Stripe.Subscription.Status;
  metadata: Record<string, string>;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  ended_at: number | null;
  created: number;
  trial_end: number | null;
  latest_invoice: string | null;
  default_payment_method: string | null;
  items: { object: "list"; data: FakeItem[] };
}

interface FakeSession {
  id: string;
  object: "checkout.session";
  mode: "subscription" | "setup";
  status: "open" | "complete";
  url: string;
  customer: string | null;
  customer_email: string | null;
  metadata: Record<string, string>;
  subscription: string | null;
  setup_intent: string | null;
  payment_status: "paid" | "unpaid" | "no_payment_required";
  success_url: string | null;
  cancel_url: string | null;
  params: Stripe.Checkout.SessionCreateParams;
}

interface FakeInvoice {
  id: string;
  object: "invoice";
  customer: string;
  amount_paid: number;
  billing_reason: string;
  status: "paid";
  parent: { type: "subscription_details"; subscription_details: { subscription: string } };
  payments: { object: "list"; data: { id: string; payment: { type: "payment_intent"; payment_intent: string } }[] };
}

export interface FakeStripe extends StripeGateway {
  state: {
    customers: Map<string, { id: string; email: string | null; metadata: Record<string, string>; invoice_settings?: unknown }>;
    sessions: Map<string, FakeSession>;
    subscriptions: Map<string, FakeSubscription>;
    invoices: Map<string, FakeInvoice>;
    refunds: { id: string; payment_intent: string; amount: number }[];
  };
  pendingEvents: { payload: string; header: string; type: string }[];
  /** Simulates the customer paying on the hosted Checkout page. */
  completeCheckout(sessionId: string): Promise<FakeSession>;
  /** Test clock (seconds since epoch). */
  now(): number;
  setNow(seconds: number | null): void;
  /** Build + sign an event without emitting it (tests: replay, out-of-order). */
  signEvent(type: string, object: unknown, created?: number): { payload: string; header: string; id: string };
}

const MONTH = 30 * 24 * 3600;
const YEAR = 365 * 24 * 3600;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createFakeStripe(options: FakeStripeOptions): FakeStripe {
  let counter = 0;
  let fixedNow: number | null = null;
  const id = (prefix: string) => `${prefix}_mock${Date.now().toString(36)}${(++counter).toString(36)}`;
  const now = () => fixedNow ?? Math.floor(Date.now() / 1000);
  const idempotent = new Map<string, unknown>();
  const state: FakeStripe["state"] = { customers: new Map(), sessions: new Map(), subscriptions: new Map(), invoices: new Map(), refunds: [] };
  const pendingEvents: FakeStripe["pendingEvents"] = [];

  async function once<T>(key: string | undefined, run: () => Promise<T>): Promise<T> {
    if (key && idempotent.has(key)) return idempotent.get(key) as T;
    const result = await run();
    if (key) idempotent.set(key, result);
    return result;
  }

  function signEvent(type: string, object: unknown, created = now()) {
    const eventId = id("evt");
    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      api_version: "2026-09-30.endive",
      created,
      type,
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      data: { object: clone(object) },
    });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: options.webhookSecret });
    return { payload, header, id: eventId };
  }

  async function emit(type: string, object: unknown) {
    const { payload, header } = signEvent(type, object);
    if (options.emit) await options.emit(payload, header);
    else pendingEvents.push({ payload, header, type });
  }

  function priceOf(priceId: string): FakePrice {
    return options.prices?.(priceId) ?? { unitAmountOre: 0, interval: "month" };
  }

  function periodLength(sub: FakeSubscription): number {
    const priceId = sub.items.data[0]?.price.id ?? "";
    return priceOf(priceId).interval === "year" ? YEAR : MONTH;
  }

  function newPeriod(sub: FakeSubscription, start: number) {
    for (const item of sub.items.data) {
      item.current_period_start = start;
      item.current_period_end = start + periodLength(sub);
    }
  }

  function chargeInvoice(sub: FakeSubscription, reason: string): FakeInvoice {
    const amount = sub.items.data.reduce((sum, i) => sum + priceOf(i.price.id).unitAmountOre * i.quantity, 0);
    const invoice: FakeInvoice = {
      id: id("in"),
      object: "invoice",
      customer: sub.customer,
      amount_paid: amount,
      billing_reason: reason,
      status: "paid",
      parent: { type: "subscription_details", subscription_details: { subscription: sub.id } },
      payments: { object: "list", data: [{ id: id("inpay"), payment: { type: "payment_intent", payment_intent: id("pi") } }] },
    };
    state.invoices.set(invoice.id, invoice);
    sub.latest_invoice = invoice.id;
    return invoice;
  }

  function createSubscription(customer: string, items: { price: string; quantity: number }[], metadata: Record<string, string>, trialDays?: number): FakeSubscription {
    const t = now();
    const sub: FakeSubscription = {
      id: id("sub"),
      object: "subscription",
      customer,
      status: trialDays ? "trialing" : "active",
      metadata,
      cancel_at_period_end: false,
      canceled_at: null,
      ended_at: null,
      created: t,
      trial_end: trialDays ? t + trialDays * 24 * 3600 : null,
      latest_invoice: null,
      default_payment_method: null,
      items: {
        object: "list",
        data: items.map((i) => ({ id: id("si"), object: "subscription_item", price: { id: i.price, object: "price" }, quantity: i.quantity, current_period_start: t, current_period_end: t })),
      },
    };
    newPeriod(sub, t);
    if (sub.trial_end) for (const item of sub.items.data) item.current_period_end = sub.trial_end;
    state.subscriptions.set(sub.id, sub);
    return sub;
  }

  function requireSub(subId: string): FakeSubscription {
    const sub = state.subscriptions.get(subId);
    if (!sub) throw new Error(`No such subscription: ${subId}`);
    return sub;
  }

  const fake: FakeStripe = {
    state,
    pendingEvents,
    now,
    setNow(seconds) {
      fixedNow = seconds;
    },
    signEvent,

    customers: {
      async create(params, opts) {
        return once(opts?.idempotencyKey, async () => {
          const customer = { id: id("cus"), email: params.email ?? null, metadata: (params.metadata ?? {}) as Record<string, string> };
          state.customers.set(customer.id, customer);
          return { id: customer.id };
        });
      },
      async update(customerId, params) {
        const customer = state.customers.get(customerId);
        if (!customer) throw new Error(`No such customer: ${customerId}`);
        customer.invoice_settings = params.invoice_settings;
        return { id: customer.id };
      },
    },

    checkout: {
      sessions: {
        async create(params, opts) {
          return once(opts?.idempotencyKey, async () => {
            const sessionId = id("cs");
            const session: FakeSession = {
              id: sessionId,
              object: "checkout.session",
              mode: params.mode === "setup" ? "setup" : "subscription",
              status: "open",
              url: `${options.appUrl}/dev/stripe-mock?session=${sessionId}`,
              customer: params.customer ?? null,
              customer_email: params.customer_email ?? null,
              metadata: (params.metadata ?? {}) as Record<string, string>,
              subscription: null,
              setup_intent: null,
              payment_status: "unpaid",
              success_url: params.success_url ?? null,
              cancel_url: params.cancel_url ?? null,
              params,
            };
            state.sessions.set(session.id, session);
            return { id: session.id, url: session.url };
          });
        },
      },
    },

    async completeCheckout(sessionId) {
      const session = state.sessions.get(sessionId);
      if (!session) throw new Error(`No such checkout session: ${sessionId}`);
      if (session.status === "complete") return session;
      const customer = session.customer ?? (await fake.customers.create({ email: session.customer_email ?? undefined })).id;
      session.customer = customer;
      if (session.mode === "setup") {
        session.setup_intent = id("seti");
        session.payment_status = "no_payment_required";
        session.status = "complete";
        await emit("checkout.session.completed", { ...session, params: undefined });
        return session;
      }
      const items = (session.params.line_items ?? []).map((li) => ({ price: li.price ?? "", quantity: li.quantity ?? 1 }));
      const sub = createSubscription(customer, items, (session.params.subscription_data?.metadata ?? {}) as Record<string, string>, session.params.subscription_data?.trial_period_days);
      const invoice = sub.status === "active" ? chargeInvoice(sub, "subscription_create") : null;
      session.subscription = sub.id;
      session.payment_status = invoice ? "paid" : "no_payment_required";
      session.status = "complete";
      await emit("customer.subscription.created", sub);
      await emit("checkout.session.completed", { ...session, params: undefined });
      if (invoice) await emit("invoice.paid", invoice);
      return session;
    },

    subscriptions: {
      async create(params, opts) {
        return once(opts?.idempotencyKey, async () => {
          const items = (params.items ?? []).map((i) => ({ price: i.price ?? "", quantity: i.quantity ?? 1 }));
          const sub = createSubscription(params.customer ?? "", items, (params.metadata ?? {}) as Record<string, string>, params.trial_period_days);
          await emit("customer.subscription.created", sub);
          return clone(sub);
        });
      },
      async retrieve(subId) {
        return clone(requireSub(subId));
      },
      async update(subId, params, opts) {
        return once(opts?.idempotencyKey, async () => {
          const sub = requireSub(subId);
          if (params.cancel_at_period_end !== undefined) sub.cancel_at_period_end = params.cancel_at_period_end;
          if (params.metadata) sub.metadata = { ...sub.metadata, ...(params.metadata as Record<string, string>) };
          if (typeof params.default_payment_method === "string") sub.default_payment_method = params.default_payment_method;
          for (const change of params.items ?? []) {
            const item = sub.items.data.find((i) => i.id === change.id);
            if (!item) continue;
            if (change.price) item.price = { id: change.price, object: "price" };
            if (change.quantity !== undefined) item.quantity = change.quantity;
          }
          let invoice: FakeInvoice | null = null;
          if (params.trial_end === "now" && sub.status === "trialing") {
            sub.status = "active";
            sub.trial_end = now();
            newPeriod(sub, now());
            invoice = chargeInvoice(sub, "subscription_cycle");
          }
          await emit("customer.subscription.updated", sub);
          if (invoice) await emit("invoice.paid", invoice);
          return clone(sub);
        });
      },
      async cancel(subId) {
        const sub = requireSub(subId);
        if (sub.status !== "canceled") {
          sub.status = "canceled";
          sub.canceled_at = now();
          sub.ended_at = now();
          await emit("customer.subscription.deleted", sub);
        }
        return clone(sub);
      },
    },

    invoices: {
      async retrieve(invoiceId) {
        const invoice = state.invoices.get(invoiceId);
        if (!invoice) throw new Error(`No such invoice: ${invoiceId}`);
        return clone(invoice);
      },
    },

    setupIntents: {
      async retrieve(setupIntentId) {
        return { id: setupIntentId, object: "setup_intent", status: "succeeded", payment_method: `pm_for_${setupIntentId}` };
      },
    },

    billingPortal: {
      sessions: {
        async create(params) {
          return { url: params.return_url ?? `${options.appUrl}/konto/abonnement` };
        },
      },
    },

    refunds: {
      async create(params, opts) {
        return once(opts?.idempotencyKey, async () => {
          const refund = { id: id("re"), payment_intent: String(params.payment_intent ?? ""), amount: params.amount ?? 0 };
          state.refunds.push(refund);
          await emit("charge.refunded", { id: id("ch"), object: "charge", payment_intent: refund.payment_intent, amount_refunded: refund.amount });
          return { id: refund.id, amount: refund.amount };
        });
      },
    },

    webhooks: {
      constructEvent(payload, header, secret) {
        return Stripe.webhooks.constructEvent(payload, header, secret);
      },
    },
  };
  return fake;
}
