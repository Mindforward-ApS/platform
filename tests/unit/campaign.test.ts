import { describe, expect, it } from "vitest";
import { campaignActive, campaignCopy, campaignSchema, countdownRemainingMs, validateCampaign } from "@/lib/marketing/campaign";

const DAY = 24 * 60 * 60 * 1000;
const start = new Date("2027-03-01T08:00:00Z");
const valid = {
  code: "FORAAR-27",
  kind: "CAMPAIGN" as const,
  discount: { type: "PERCENT" as const, value: 20 },
  durationMonths: 3,
  startsAt: start,
  expiresAt: new Date(start.getTime() + 10 * DAY),
  announcedEndDate: false,
  priorPrice: { stripePriceId: "price_b2c", unitAmountOre: 4900, effectiveSince: new Date(start.getTime() - 90 * DAY) },
  normalPriceSince: new Date(start.getTime() - 120 * DAY),
  countdown: "FIXED_EXPIRES_AT" as const,
};

const errors = (input: unknown) => {
  const r = campaignSchema.safeParse(input);
  return r.success ? [] : r.error.issues.map((i) => i.path.join("."));
};

describe("campaign rules (docs/09 § 7)", () => {
  it("accepts a 10-day campaign with a real prior price", () => {
    expect(validateCampaign(valid).code).toBe("FORAAR-27");
  });

  it("rejects more than 10 days without an announced end date", () => {
    expect(errors({ ...valid, expiresAt: new Date(start.getTime() + 11 * DAY) })).toContain("expiresAt");
  });

  it("allows a longer campaign with an announced end date, but never more than half the normal-price period", () => {
    expect(errors({ ...valid, announcedEndDate: true, expiresAt: new Date(start.getTime() + 30 * DAY) })).toEqual([]);
    expect(errors({ ...valid, announcedEndDate: true, expiresAt: new Date(start.getTime() + 61 * DAY) })).toContain("expiresAt");
  });

  it("requires an end date after the start", () => {
    expect(errors({ ...valid, expiresAt: start })).toContain("expiresAt");
    expect(errors({ ...valid, expiresAt: undefined })).toContain("expiresAt");
  });

  it("requires a real prior price that applied ≥ 30 days before the start (no invented 'før'-price)", () => {
    expect(errors({ ...valid, priorPrice: { ...valid.priorPrice, effectiveSince: new Date(start.getTime() - 10 * DAY) } })).toContain("priorPrice");
    expect(errors({ ...valid, discount: { type: "AMOUNT_ORE", value: 4900 } })).toContain("discount");
  });

  it("has no resetting countdowns: only none or the fixed server expiresAt", () => {
    expect(errors({ ...valid, countdown: "PER_VISITOR" })).toContain("countdown");
    // Two visitors at the same moment see the same remaining time; later visitors see less, never a fresh timer.
    const t1 = new Date(start.getTime() + DAY);
    expect(countdownRemainingMs(validateCampaign(valid), t1)).toBe(9 * DAY);
    expect(countdownRemainingMs(validateCampaign(valid), new Date(t1.getTime() + DAY))).toBe(8 * DAY);
    expect(countdownRemainingMs(validateCampaign(valid), new Date(start.getTime() + 20 * DAY))).toBe(0);
    expect(campaignActive(validateCampaign(valid), new Date(start.getTime() + 10 * DAY))).toBe(false);
  });

  it("rejects free-text fields (copy is generated from the object)", () => {
    expect(errors({ ...valid, headline: "Kun i dag!" }).length).toBeGreaterThan(0);
  });

  it("generates copy with discount, terms, prior price and the end date in Danish", () => {
    const copy = campaignCopy(validateCampaign({ ...valid, kind: "INTRODUCTORY" }), "49 kr./md");
    expect(copy.heading).toBe("Introduktionstilbud");
    expect(copy.lines.join(" ")).toContain("20 % rabat");
    expect(copy.lines.join(" ")).toContain("derefter 49 kr./md");
    expect(copy.lines.join(" ")).toContain("Normalpris: 49 kr.");
    expect(copy.lines.join(" ")).toContain("11. marts 2027");
    expect(copy.lines.join(" ")).not.toMatch(/kun i dag/i);
  });
});
