import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { betterAuth } from "better-auth";
import { testUtils } from "better-auth/plugins";
import Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.schema";
import { buildAuthOptions } from "@/server/auth/better-auth";
import { requestCancellation } from "@/server/billing/cancel";
import { startB2BCheckout, startB2BTrial, startB2CCheckout } from "@/server/billing/checkout";
import type { BillingDeps } from "@/server/billing/deps";
import { getEntitlements } from "@/server/billing/entitlements";
import { createFakeStripe, type FakeStripe } from "@/server/billing/fake-stripe";
import { fakePriceFromConfig, MOCK_WEBHOOK_SECRET } from "@/server/billing/stripe";
import { handleStripeWebhook } from "@/server/billing/webhook";
import { submitWithdrawal } from "@/server/billing/withdrawal";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const env = parseServerEnv({ ...process.env, STRIPE_MOCK: "1", JOBS_INLINE: "1", SUPPORT_INBOX: "support@example.test" });

/** Fake Stripe that delivers each event through the real, signature-checked webhook handler. */
function setup(opts: { deliver?: boolean } = {}): { deps: BillingDeps; fake: FakeStripe } {
  const deps = { db: testDb(), env } as BillingDeps;
  const fake = createFakeStripe({
    webhookSecret: MOCK_WEBHOOK_SECRET,
    appUrl: env.APP_URL,
    prices: (id) => fakePriceFromConfig(id, env),
    emit:
      opts.deliver === false
        ? undefined
        : async (payload, header) => {
            const res = await handleStripeWebhook(deps, payload, header);
            if (res.status !== 200) throw new Error(`webhook ${res.status}`);
          },
  });
  deps.stripe = fake;
  return { deps, fake };
}

const request = { ip: "203.0.113.7", userAgent: "vitest" };

async function personalCustomer() {
  const [org, user] = await Promise.all([makeOrg("PERSONAL"), makeUser()]);
  await addMember(org.id, user.id, "OWNER");
  return { org, user };
}

async function buyB2C(deps: BillingDeps, fake: FakeStripe) {
  const { org, user } = await personalCustomer();
  const res = await startB2CCheckout(deps, { organizationId: org.id, user, consents: { immediateAccess: true, withdrawalLossAck: true }, request });
  if (!res.ok) throw new Error(res.error);
  const sessionId = new URL(res.url).searchParams.get("session")!;
  await fake.completeCheckout(sessionId);
  return { org, user, sessionId };
}

describe("Stripe webhook", () => {
  it("rejects an invalid signature with 400 and writes nothing", async () => {
    const { deps, fake } = setup({ deliver: false });
    const { payload } = fake.signEvent("customer.subscription.updated", { id: "sub_x" });
    const forged = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_wrong_secret" });
    const before = await testDb().webhookEvent.count();
    expect((await handleStripeWebhook(deps, payload, forged)).status).toBe(400);
    expect((await handleStripeWebhook(deps, payload, null)).status).toBe(400);
    expect((await handleStripeWebhook(deps, payload.replace("sub_x", "sub_y"), fake.signEvent("x", {}).header)).status).toBe(400);
    expect(await testDb().webhookEvent.count()).toBe(before);
  });

  it("is idempotent when Stripe delivers the same event twice", async () => {
    const { deps, fake } = setup({ deliver: false });
    const { org } = await personalCustomer();
    const res = await startB2CCheckout(deps, { organizationId: org.id, user: { id: (await makeUser()).id, email: `o-${randomUUID()}@example.test` }, consents: { immediateAccess: true, withdrawalLossAck: true }, request });
    if (!res.ok) throw new Error(res.error);
    await fake.completeCheckout(new URL(res.url).searchParams.get("session")!);
    for (const e of fake.pendingEvents) expect((await handleStripeWebhook(deps, e.payload, e.header)).status).toBe(200);
    const replay = fake.pendingEvents.find((e) => e.type === "checkout.session.completed")!;
    const second = await handleStripeWebhook(deps, replay.payload, replay.header);
    expect(second).toEqual({ status: 200, body: { received: true, duplicate: true } });
    const eventId = (JSON.parse(replay.payload) as { id: string }).id;
    expect(await testDb().webhookEvent.count({ where: { externalId: eventId } })).toBe(1);
    expect(await testDb().subscription.count({ where: { organizationId: org.id } })).toBe(1);
    expect(await testDb().emailMessage.count({ where: { organizationId: org.id, template: "order-confirmation" } })).toBe(1);
  });

  it("ignores out-of-order events older than the last applied one", async () => {
    const { deps, fake } = setup({ deliver: false });
    const { org } = await personalCustomer();
    const res = await startB2CCheckout(deps, { organizationId: org.id, user: { id: (await makeUser()).id, email: `p-${randomUUID()}@example.test` }, consents: { immediateAccess: true, withdrawalLossAck: true }, request });
    if (!res.ok) throw new Error(res.error);
    await fake.completeCheckout(new URL(res.url).searchParams.get("session")!);
    for (const e of fake.pendingEvents) await handleStripeWebhook(deps, e.payload, e.header);
    const row = await testDb().subscription.findFirstOrThrow({ where: { organizationId: org.id } });

    const t = fake.now();
    const newer = fake.signEvent("customer.subscription.updated", { id: row.stripeSubscriptionId }, t + 100);
    const older = fake.signEvent("customer.subscription.updated", { id: row.stripeSubscriptionId }, t + 50);
    expect((await handleStripeWebhook(deps, newer.payload, newer.header)).status).toBe(200);
    expect((await handleStripeWebhook(deps, older.payload, older.header)).status).toBe(200);
    const after = await testDb().subscription.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.lastStripeEventId).toBe(newer.id);
    expect(after.lastStripeEventAt.getTime()).toBe((t + 100) * 1000);
  });
});

describe("B2C purchase", () => {
  it("stores both declarations before redirect; Subscription only appears via the webhook", async () => {
    const { deps } = setup({ deliver: false });
    const { org, user } = await personalCustomer();
    expect(await startB2CCheckout(deps, { organizationId: org.id, user, consents: { immediateAccess: true, withdrawalLossAck: false }, request })).toEqual({ ok: false, error: "CONSENTS_REQUIRED" });
    const res = await startB2CCheckout(deps, { organizationId: org.id, user, consents: { immediateAccess: true, withdrawalLossAck: true }, request });
    expect(res.ok).toBe(true);
    const consents = await testDb().consentRecord.findMany({ where: { organizationId: org.id } });
    expect(consents.map((c) => c.purpose).sort()).toEqual(["IMMEDIATE_ACCESS_REQUEST", "WITHDRAWAL_LOSS_ACK"]);
    for (const c of consents) {
      expect(c).toMatchObject({ source: "CHECKOUT", action: "GRANTED", textVersion: "checkout-consent.v1", ip: request.ip, userAgent: "vitest" });
      expect(c.textHash).toMatch(/^[0-9a-f]{64}$/);
      expect(c.checkoutSessionId).toMatch(/^cs_/);
    }
    // The redirect back from Checkout grants nothing; only the webhook writes Subscription.
    expect(await testDb().subscription.count({ where: { organizationId: org.id } })).toBe(0);
    expect((await getEntitlements(testDb(), org.id)).access).toBe("FREE");
  });

  it("webhook → ACTIVE, consent timestamps copied, 14-day deadline, order confirmation mail, full access", async () => {
    const { deps, fake } = setup();
    const { org } = await buyB2C(deps, fake);
    const sub = await testDb().subscription.findFirstOrThrow({ where: { organizationId: org.id } });
    expect(sub).toMatchObject({ status: "ACTIVE", planKey: "B2C_MONTHLY", withdrawalConsentTextVersion: "checkout-consent.v1" });
    expect(sub.immediateAccessConsentAt).not.toBeNull();
    expect(sub.withdrawalWaiverAcknowledgedAt).not.toBeNull();
    expect(sub.withdrawalDeadlineAt!.getTime() - sub.createdAt.getTime()).toBeGreaterThan(14 * 24 * 3600 * 1000);
    expect(sub.orderConfirmationEmailMessageId).not.toBeNull();
    expect((await getEntitlements(testDb(), org.id)).access).toBe("FULL");
    expect(await startB2CCheckout(deps, { organizationId: org.id, user: { id: "x", email: "x@example.test" }, consents: { immediateAccess: true, withdrawalLossAck: true }, request })).toEqual({ ok: false, error: "ALREADY_SUBSCRIBED" });
  });

  it("'Fortryd aftale' → receipt mail, cancel + full refund, FREE immediately", async () => {
    const { deps, fake } = setup();
    const { org, user } = await buyB2C(deps, fake);
    const receipt = await submitWithdrawal(deps, { input: { name: "Test Bruger", email: user.email, agreementReference: "Personlig" }, userId: user.id, organizationId: org.id, channel: "ACCOUNT", ...request });
    expect(receipt.matched).toBe(true);
    const wr = await testDb().withdrawalRequest.findUniqueOrThrow({ where: { id: receipt.id } });
    expect(wr).toMatchObject({ status: "PROCESSED", refundAmountOre: 4900 });
    expect(wr.receiptSentAt).not.toBeNull();
    expect(await testDb().emailMessage.count({ where: { idempotencyKey: `withdrawal:${wr.id}:receipt` } })).toBe(1);
    expect(fake.state.refunds).toHaveLength(1);
    expect((await testDb().subscription.findFirstOrThrow({ where: { organizationId: org.id } })).status).toBe("CANCELED");
    expect((await getEntitlements(testDb(), org.id)).access).toBe("FREE");
  });

  it("public withdrawal without a match still gets a receipt and escalates to SUPPORT_INBOX", async () => {
    const { deps } = setup();
    const email = `nobody-${randomUUID()}@example.test`;
    const receipt = await submitWithdrawal(deps, { input: { name: "Ukendt", email, agreementReference: "købt i går" }, userId: null, organizationId: null, channel: "PUBLIC", ...request });
    expect(receipt.matched).toBe(false);
    expect(await testDb().emailMessage.count({ where: { toEmail: email, template: "withdrawal-receipt" } })).toBe(1);
    expect(await testDb().escalation.count({ where: { reason: "WITHDRAWAL_UNMATCHED", summary: { contains: receipt.id } } })).toBe(1);
    expect(await testDb().emailMessage.count({ where: { idempotencyKey: `escalation:withdrawal:${receipt.id}`, toEmail: "support@example.test" } })).toBe(1);
  });

  it("cancellation keeps access to the end of the paid month and sends a confirmation", async () => {
    const { deps, fake } = setup();
    const { org, user } = await buyB2C(deps, fake);
    const res = await requestCancellation(deps, { organizationId: org.id, user });
    expect(res.ok).toBe(true);
    const sub = await testDb().subscription.findFirstOrThrow({ where: { organizationId: org.id } });
    expect(sub).toMatchObject({ status: "ACTIVE", cancelAtPeriodEnd: true });
    expect(sub.cancellationRequestedInAppAt).not.toBeNull();
    expect((await getEntitlements(testDb(), org.id)).access).toBe("FULL");
    expect(await testDb().emailMessage.count({ where: { organizationId: org.id, template: "cancellation-confirmed" } })).toBe(1);
  });
});

describe("Subscription is only written by the webhook path", () => {
  it("no source file outside billing/sync.ts and billing/webhook.ts writes the subscription table", () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(e)) out.push(full);
      }
      return out;
    };
    const writers = walk("src")
      .filter((f) => !f.includes("generated"))
      .filter((f) => /\.subscription\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/.test(readFileSync(f, "utf8")));
    expect(writers.sort()).toEqual(["src/server/billing/sync.ts", "src/server/billing/webhook.ts"]);
  });
});

describe("B2B trial and seat cap", () => {
  function makeTestAuth() {
    const options = buildAuthOptions({ db: testDb(), env: parseServerEnv(process.env) });
    return betterAuth({ ...options, plugins: [...options.plugins.filter((p) => p.id !== "next-cookies"), testUtils()] });
  }
  let auth: ReturnType<typeof makeTestAuth>;
  let login: (userId: string) => Promise<Headers>;
  beforeAll(async () => {
    auth = makeTestAuth();
    const ctx = (await auth.$context) as unknown as { test: { getAuthHeaders(o: { userId: string }): Promise<Headers> } };
    login = (userId) => ctx.test.getAuthHeaders({ userId });
  });

  it("starts a 14-day trial without card; rejects the invitation that would be the 6th seat with an explanation", async () => {
    const { deps } = setup();
    const [org, owner] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(org.id, owner.id, "OWNER");
    const cvr = String(10_000_000 + Math.floor(Math.random() * 89_999_999));
    expect(await startB2BTrial(deps, { organizationId: org.id, user: owner, cvr: "123" })).toEqual({ ok: false, error: "INVALID_CVR" });
    expect(await startB2BTrial(deps, { organizationId: org.id, user: owner, cvr })).toEqual({ ok: true });
    const sub = await testDb().subscription.findFirstOrThrow({ where: { organizationId: org.id } });
    expect(sub).toMatchObject({ status: "TRIALING", quantity: 5, planKey: "B2B_MONTHLY" });
    expect(Math.round((sub.trialEnd!.getTime() - Date.now()) / 86_400_000)).toBe(14);
    expect((await testDb().organization.findUniqueOrThrow({ where: { id: org.id } })).seatLimit).toBe(5);

    const headers = await login(owner.id);
    for (let i = 0; i < 4; i++) {
      await auth.api.createInvitation({ headers, body: { email: `seat${i}-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } });
    }
    // Owner + 4 open invitations = 5 seats; one more would be the 6th.
    const sixth = auth.api.createInvitation({ headers, body: { email: `seat5-${randomUUID()}@example.test`, role: "LEARNER", organizationId: org.id } });
    await expect(sixth).rejects.toThrow(/Alle 5 pladser er i brug/);
    expect(await testDb().invitation.count({ where: { organizationId: org.id } })).toBe(4);

    // Second trial on the same CVR is refused.
    const other = await makeOrg("BUSINESS");
    expect(await startB2BTrial(deps, { organizationId: other.id, user: owner, cvr })).toEqual({ ok: false, error: "TRIAL_USED" });
  });

  it("B2B purchase requires at least 5 seats (server-side)", async () => {
    const { deps } = setup();
    const [org, owner] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(org.id, owner.id, "OWNER");
    expect(await startB2BCheckout(deps, { organizationId: org.id, user: owner, planKey: "B2B_MONTHLY", seats: 4 })).toEqual({ ok: false, error: "MIN_SEATS" });
    expect((await startB2BCheckout(deps, { organizationId: org.id, user: owner, planKey: "B2B_MONTHLY", seats: 5 })).ok).toBe(true);
  });

  it("converts a trial to paid via card setup: same subscription, ACTIVE, 7 seats", async () => {
    const { deps, fake } = setup();
    const [org, owner] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
    await addMember(org.id, owner.id, "OWNER");
    await startB2BTrial(deps, { organizationId: org.id, user: owner, cvr: String(10_000_000 + Math.floor(Math.random() * 89_999_999)) });
    const res = await startB2BCheckout(deps, { organizationId: org.id, user: owner, planKey: "B2B_MONTHLY", seats: 7 });
    if (!res.ok) throw new Error(res.error);
    await fake.completeCheckout(new URL(res.url).searchParams.get("session")!);
    const subs = await testDb().subscription.findMany({ where: { organizationId: org.id } });
    expect(subs).toHaveLength(1);
    expect(subs[0]).toMatchObject({ status: "ACTIVE", quantity: 7 });
    expect((await testDb().organization.findUniqueOrThrow({ where: { id: org.id } })).seatLimit).toBe(7);
  });
});
