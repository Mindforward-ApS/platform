import { afterEach, describe, expect, it, vi } from "vitest";
import { billingRules, plans, type PlanConfig } from "@/lib/config/plans";
import { computeEntitlements, type SubscriptionSnapshot } from "@/server/billing/entitlements";
import { describePrice, getPlan, planKeyForPriceId, priceIdForPlan } from "@/server/billing/plans";
import { decideSeat } from "@/server/billing/seats";
import { formatDate, withdrawalDeadline } from "@/server/billing/time";
import { addVat, formatDkk, planPrice, splitInclusive } from "@/server/billing/vat";
import { isWithdrawalOpen } from "@/server/billing/withdrawal";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-13T10:00:00Z");

function sub(over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    planKey: "B2C_MONTHLY",
    status: "ACTIVE",
    quantity: 1,
    currentPeriodStart: new Date(now.getTime() - 5 * DAY),
    currentPeriodEnd: new Date(now.getTime() + 25 * DAY),
    trialEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    endedAt: null,
    withdrawn: false,
    ...over,
  };
}

describe("entitlements (docs/07 § 3)", () => {
  it("FREE: no subscription on a PERSONAL org = placement test + first 3 modules, no monthly cycle, no certificate", () => {
    const e = computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: null, now });
    expect(e).toMatchObject({ planKey: "FREE", access: "FREE", modules: "FREE_LIMITED", freeModuleLimit: 3, placementTest: true, monthlyCycle: false, certificates: false });
    expect(e.freeModuleLimit).toBe(billingRules.b2cFreeModules);
  });

  it("B2B without a plan: no modules, invitations within the org's seat limit", () => {
    const e = computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 5, subscription: null, now });
    expect(e).toMatchObject({ modules: "NONE", seatLimit: 5, readOnly: false });
  });

  it("trialing B2B: full access, report with trial watermark, max 5 users even if quantity is higher", () => {
    const e = computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 5, subscription: sub({ planKey: "B2B_MONTHLY", status: "TRIALING", quantity: 8, trialEnd: new Date(now.getTime() + 3 * DAY) }), now });
    expect(e).toMatchObject({ access: "FULL", modules: "FULL", seatLimit: 5, companyReport: true, reportWatermark: "TRIAL" });
  });

  it("trial lasts at most until trialEnd (14 days): after it, READ_ONLY even before the webhook arrives", () => {
    const trialEnd = new Date(now.getTime() - 1000);
    const e = computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 5, subscription: sub({ planKey: "B2B_MONTHLY", status: "TRIALING", quantity: 5, trialEnd }), now });
    expect(e).toMatchObject({ access: "READ_ONLY", readOnly: true, banner: "TRIAL_ENDED", modules: "NONE" });
  });

  it("active B2C: full access, monthly cycle and certificates", () => {
    expect(computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub(), now })).toMatchObject({ access: "FULL", modules: "FULL", monthlyCycle: true, certificates: true, seatLimit: 1, companyReport: false });
  });

  it("active B2B: seats = quantity, company report without watermark", () => {
    expect(computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 12, subscription: sub({ planKey: "B2B_MONTHLY", quantity: 12 }), now })).toMatchObject({ seatLimit: 12, companyReport: true, reportWatermark: null });
  });

  it("past_due: full access with banner inside the 14-day grace, then lapses", () => {
    const inGrace = computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ status: "PAST_DUE", currentPeriodStart: new Date(now.getTime() - 13 * DAY) }), now });
    expect(inGrace).toMatchObject({ access: "FULL", banner: "PAST_DUE" });
    const after = computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ status: "PAST_DUE", currentPeriodStart: new Date(now.getTime() - 15 * DAY) }), now });
    expect(after.access).toBe("FREE");
  });

  it("paused (trial ended without card): B2B READ_ONLY", () => {
    expect(computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 5, subscription: sub({ planKey: "B2B_MONTHLY", status: "PAUSED", quantity: 5 }), now })).toMatchObject({ access: "READ_ONLY", readOnly: true, companyReport: true });
  });

  it("expired/canceled: B2C → FREE; B2B → READ_ONLY for 90 days, then no access", () => {
    const ended = new Date(now.getTime() - 10 * DAY);
    expect(computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ status: "CANCELED", endedAt: ended }), now }).access).toBe("FREE");
    const b2b = computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 5, subscription: sub({ planKey: "B2B_MONTHLY", status: "CANCELED", endedAt: ended, quantity: 5 }), now });
    expect(b2b).toMatchObject({ access: "READ_ONLY", readOnly: true });
    const old = computeEntitlements({ orgType: "BUSINESS", orgSeatLimit: 5, subscription: sub({ planKey: "B2B_MONTHLY", status: "CANCELED", endedAt: new Date(now.getTime() - 91 * DAY) }), now });
    expect(old.access).toBe("NONE");
  });

  it("unpaid and incomplete_expired behave like canceled", () => {
    for (const status of ["UNPAID", "INCOMPLETE_EXPIRED"] as const) {
      expect(computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ status }), now }).access).toBe("FREE");
    }
  });

  it("cancelled at period end keeps access until the period ends, then FREE (even if the webhook is late)", () => {
    expect(computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ cancelAtPeriodEnd: true }), now }).access).toBe("FULL");
    expect(computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ cancelAtPeriodEnd: true, currentPeriodEnd: new Date(now.getTime() - 1) }), now }).access).toBe("FREE");
  });

  it("withdrawn ('Fortryd aftale') → FREE immediately", () => {
    expect(computeEntitlements({ orgType: "PERSONAL", orgSeatLimit: 1, subscription: sub({ withdrawn: true }), now }).access).toBe("FREE");
  });
});

describe("VAT (25 % from config)", () => {
  it("B2C price is incl. VAT: 4900 øre = 3920 net + 980 VAT", () => {
    expect(splitInclusive(4900)).toEqual({ netOre: 3920, vatOre: 980, grossOre: 4900 });
    expect(planPrice(getPlan("B2C_MONTHLY"))).toEqual({ netOre: 3920, vatOre: 980, grossOre: 4900 });
  });

  it("B2B price is ex. VAT: 5 seats × 4900 = 24500 net + 6125 VAT", () => {
    expect(addVat(4900)).toEqual({ netOre: 4900, vatOre: 1225, grossOre: 6125 });
    expect(planPrice(getPlan("B2B_MONTHLY"), 5)).toEqual({ netOre: 24500, vatOre: 6125, grossOre: 30625 });
  });

  it("uses the configured rate", () => {
    expect(billingRules.vatRate).toBe(0.25);
    expect(addVat(1000, 0.1).grossOre).toBe(1100);
  });

  it("formats øre as Danish kroner", () => {
    expect(formatDkk(4900).replace(/\s/g, " ")).toBe("49,00 kr.");
  });
});

describe("price change in config flows through without code change", () => {
  it("display text and VAT follow the plan amount", () => {
    const changed: PlanConfig = { ...getPlan("B2C_MONTHLY"), unitAmountOre: 5900 };
    expect(describePrice(changed).headline.replace(/\s/g, " ")).toBe("59,00 kr. pr. md. inkl. moms");
    expect(describePrice(changed).grossOre).toBe(5900);
    const b2b: PlanConfig = { ...getPlan("B2B_MONTHLY"), unitAmountOre: 9900 };
    expect(describePrice(b2b).headline.replace(/\s/g, " ")).toBe("99,00 kr. pr. bruger pr. md. ekskl. moms (123,75 kr. inkl. moms)");
  });

  it("there is no B2C annual plan (00 § 10a)", () => {
    expect(plans.some((p) => p.audience === "B2C" && p.interval === "YEAR")).toBe(false);
  });

  it("maps Stripe Price ids to plans both ways", () => {
    const env = { STRIPE_PRICE_B2C_MONTHLY: "price_b2c", STRIPE_PRICE_B2B_MONTHLY: "price_b2b", STRIPE_PRICE_B2B_ANNUAL: undefined, STRIPE_MOCK: false };
    expect(priceIdForPlan(getPlan("B2C_MONTHLY"), env)).toBe("price_b2c");
    expect(planKeyForPriceId("price_b2b", env)).toBe("B2B_MONTHLY");
    expect(planKeyForPriceId("price_unknown", env)).toBeNull();
    expect(() => priceIdForPlan(getPlan("B2B_ANNUAL"), env)).toThrow(/STRIPE_PRICE_B2B_ANNUAL/);
    expect(priceIdForPlan(getPlan("B2B_ANNUAL"), { ...env, STRIPE_MOCK: true })).toBe("price_mock_b2b_annual");
  });
});

describe("B2B seats", () => {
  it("minimum is 5 seats and trial is max 5 users / 14 days", () => {
    expect(getPlan("B2B_MONTHLY").minSeats).toBe(5);
    expect(getPlan("B2B_ANNUAL").minSeats).toBe(5);
    expect(billingRules.b2bTrialMaxUsers).toBe(5);
    expect(billingRules.b2bTrialDays).toBe(14);
  });

  it("allows the 5th seat and rejects the 6th", () => {
    expect(decideSeat({ used: 4, limit: 5, readOnly: false })).toEqual({ allowed: true });
    expect(decideSeat({ used: 5, limit: 5, readOnly: false })).toMatchObject({ allowed: false, reason: "SEAT_LIMIT_REACHED" });
    expect(decideSeat({ used: 0, limit: 5, readOnly: true })).toMatchObject({ allowed: false, reason: "READ_ONLY" });
  });
});

describe('"Fortryd aftale" window (fake clock)', () => {
  afterEach(() => vi.useRealTimers());
  const purchasedAt = new Date("2026-10-01T09:30:00Z"); // 11.30 Copenhagen (CEST)

  function visibleAt(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    return isWithdrawalOpen({ orgType: "PERSONAL", status: "ACTIVE", withdrawalDeadlineAt: withdrawalDeadline(purchasedAt), alreadyWithdrawn: false }, new Date());
  }

  it("deadline is the end of day 14 after the purchase day, Copenhagen time", () => {
    expect(withdrawalDeadline(purchasedAt).toISOString()).toBe("2026-10-15T21:59:59.999Z");
    expect(formatDate(withdrawalDeadline(purchasedAt))).toBe("15. oktober 2026");
  });

  it("is visible at purchase, on day 13 and until the last minute of day 14", () => {
    expect(visibleAt("2026-10-01T09:30:01Z")).toBe(true);
    expect(visibleAt("2026-10-14T12:00:00Z")).toBe(true);
    expect(visibleAt("2026-10-15T21:59:00Z")).toBe(true);
  });

  it("is hidden one minute after the deadline and on day 15+", () => {
    expect(visibleAt("2026-10-15T22:00:00Z")).toBe(false);
    expect(visibleAt("2026-10-17T12:00:00Z")).toBe(false);
  });

  it("handles the switch to winter time inside the period", () => {
    // Purchase 20 Oct (CEST); deadline 3 Nov 23:59:59.999 CET = 22:59:59.999Z.
    expect(withdrawalDeadline(new Date("2026-10-20T08:00:00Z")).toISOString()).toBe("2026-11-03T22:59:59.999Z");
  });

  it("is never shown for B2B, after a withdrawal or on a canceled subscription", () => {
    const base = { orgType: "PERSONAL" as const, status: "ACTIVE" as const, withdrawalDeadlineAt: withdrawalDeadline(purchasedAt), alreadyWithdrawn: false };
    const t = new Date("2026-10-02T10:00:00Z");
    expect(isWithdrawalOpen({ ...base, orgType: "BUSINESS" }, t)).toBe(false);
    expect(isWithdrawalOpen({ ...base, alreadyWithdrawn: true }, t)).toBe(false);
    expect(isWithdrawalOpen({ ...base, status: "CANCELED" }, t)).toBe(false);
  });
});
