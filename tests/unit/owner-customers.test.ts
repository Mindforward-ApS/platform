import { describe, expect, it } from "vitest";
import type { SubscriptionStatus } from "@/generated/prisma/client";
import { ownerDashboard } from "@/lib/config/owner-dashboard";
import {
  completionPct,
  customerStatus,
  monthlyNetOre,
  paidSeats,
  pickCurrentSubscription,
  summarize,
} from "@/server/owner/customer-metrics";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-16T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const cfg = { inactiveAfterDays: 14, onboardingDays: 14 };

function sub(
  status: SubscriptionStatus,
  extra: Partial<{ planKey: string; quantity: number; unitAmountOre: number | null; cancelAtPeriodEnd: boolean; createdAt: Date }> = {},
) {
  return { planKey: "B2B_MONTHLY", quantity: 5, unitAmountOre: null, cancelAtPeriodEnd: false, createdAt: daysAgo(30), status, ...extra };
}

describe("config", () => {
  it("has an ARR goal of 1 mio kr and thresholds of 14 days", () => {
    expect(ownerDashboard.arrGoalOre).toBe(1_000_000 * 100);
    expect(ownerDashboard.inactiveAfterDays).toBe(14);
    expect(ownerDashboard.onboardingDays).toBe(14);
  });
});

describe("monthlyNetOre (MRR ex. VAT, from plan config/DB — never hardcoded)", () => {
  it("B2B monthly: unit price × seats, already ex. VAT", () => {
    expect(monthlyNetOre(sub("ACTIVE"))).toBe(4900 * 5);
  });

  it("B2B annual: yearly amount spread over 12 months", () => {
    expect(monthlyNetOre(sub("ACTIVE", { planKey: "B2B_ANNUAL" }))).toBe(Math.round((49000 * 5) / 12));
  });

  it("B2C monthly: price includes VAT, so MRR is the net amount", () => {
    expect(monthlyNetOre(sub("ACTIVE", { planKey: "B2C_MONTHLY", quantity: 1 }))).toBe(3920);
  });

  it("the subscription's Plan row amount wins over config", () => {
    expect(monthlyNetOre(sub("ACTIVE", { unitAmountOre: 9900 }))).toBe(9900 * 5);
  });

  it("past due still counts; trials, cancelled and unknown plans count 0", () => {
    expect(monthlyNetOre(sub("PAST_DUE"))).toBe(4900 * 5);
    expect(monthlyNetOre(sub("TRIALING"))).toBe(0);
    expect(monthlyNetOre(sub("CANCELED"))).toBe(0);
    expect(monthlyNetOre(sub("ACTIVE", { planKey: "FREE" }))).toBe(0);
    expect(monthlyNetOre(sub("ACTIVE", { planKey: "NOPE" }))).toBe(0);
  });

  it("paid seats follow the same rule", () => {
    expect(paidSeats(sub("ACTIVE", { quantity: 12 }))).toBe(12);
    expect(paidSeats(sub("TRIALING", { quantity: 5 }))).toBe(0);
  });
});

describe("pickCurrentSubscription", () => {
  it("prefers the newest open subscription over a newer cancelled one", () => {
    const open = sub("ACTIVE", { createdAt: daysAgo(40) });
    const cancelled = sub("CANCELED", { createdAt: daysAgo(2) });
    expect(pickCurrentSubscription([cancelled, open])).toBe(open);
  });

  it("falls back to the newest of any status, and null without subscriptions", () => {
    const older = sub("CANCELED", { createdAt: daysAgo(90) });
    const newer = sub("INCOMPLETE_EXPIRED", { createdAt: daysAgo(10) });
    expect(pickCurrentSubscription([older, newer])).toBe(newer);
    expect(pickCurrentSubscription([])).toBeNull();
  });
});

describe("customerStatus", () => {
  const active = { status: "ACTIVE" as const, cancelAtPeriodEnd: false };
  const old = daysAgo(60);

  it("billing problems come first, even for a busy customer", () => {
    for (const status of ["PAST_DUE", "UNPAID", "INCOMPLETE", "PAUSED"] as const) {
      expect(customerStatus({ subscription: { status, cancelAtPeriodEnd: false }, createdAt: old, lastActivityAt: now }, now, cfg)).toEqual(
        { kind: "PAYMENT_ISSUE" },
      );
    }
  });

  it("ended, ending, trial and not started", () => {
    expect(
      customerStatus({ subscription: { status: "CANCELED", cancelAtPeriodEnd: false }, createdAt: old, lastActivityAt: now }, now, cfg)
        .kind,
    ).toBe("CANCELED");
    expect(
      customerStatus({ subscription: { status: "ACTIVE", cancelAtPeriodEnd: true }, createdAt: old, lastActivityAt: now }, now, cfg).kind,
    ).toBe("CANCELING");
    expect(
      customerStatus(
        { subscription: { status: "TRIALING", cancelAtPeriodEnd: false }, createdAt: daysAgo(3), lastActivityAt: null },
        now,
        cfg,
      ).kind,
    ).toBe("TRIAL");
    expect(customerStatus({ subscription: null, createdAt: old, lastActivityAt: null }, now, cfg).kind).toBe("NO_SUBSCRIPTION");
  });

  it("a paying customer younger than the onboarding window is onboarding, not inactive", () => {
    expect(customerStatus({ subscription: active, createdAt: daysAgo(13), lastActivityAt: null }, now, cfg).kind).toBe("ONBOARDING");
  });

  it("inactive from exactly 14 quiet days; 13 is still active", () => {
    expect(customerStatus({ subscription: active, createdAt: old, lastActivityAt: daysAgo(14) }, now, cfg)).toEqual({
      kind: "INACTIVE",
      days: 14,
    });
    expect(customerStatus({ subscription: active, createdAt: old, lastActivityAt: daysAgo(13) }, now, cfg)).toEqual({ kind: "ACTIVE" });
  });

  it("never any activity after onboarding is inactive without a day count", () => {
    expect(customerStatus({ subscription: active, createdAt: old, lastActivityAt: null }, now, cfg)).toEqual({
      kind: "INACTIVE",
      days: null,
    });
  });
});

describe("completionPct", () => {
  it("is null without active members and rounds to whole percent", () => {
    expect(completionPct(0, 0)).toBeNull();
    expect(completionPct(4, 3)).toBe(75);
    expect(completionPct(3, 1)).toBe(33);
  });

  it("never exceeds 100", () => {
    expect(completionPct(2, 5)).toBe(100);
  });
});

describe("summarize", () => {
  it("adds up MRR, ARR, seats and completion across customers", () => {
    const t = summarize(
      [
        { mrrOre: 24500, paidSeats: 5, activeMembers: 4, membersWithPassed: 2 },
        { mrrOre: 3920, paidSeats: 1, activeMembers: 1, membersWithPassed: 1 },
      ],
      100_000_000,
    );
    expect(t).toMatchObject({ mrrOre: 28420, arrOre: 341040, paidSeats: 6, completionPct: 60 });
    expect(t.goalPct).toBe(0); // 0,34 % → rounded down
  });

  it("rounds goal progress down and handles no customers", () => {
    expect(summarize([{ mrrOre: 8_325_000, paidSeats: 0, activeMembers: 0, membersWithPassed: 0 }], 100_000_000).goalPct).toBe(99);
    expect(summarize([], 100_000_000)).toEqual({
      mrrOre: 0,
      arrOre: 0,
      goalOre: 100_000_000,
      goalPct: 0,
      paidSeats: 0,
      completionPct: null,
    });
  });
});
