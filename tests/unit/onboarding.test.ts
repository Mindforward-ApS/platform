import { describe, expect, it } from "vitest";
import {
  formatKroner,
  nextOpenStep,
  normalizePhone,
  onboardingPrices,
  onboardingSteps,
  progressPct,
  signupInput,
  type OnboardingSnapshot,
} from "@/lib/config/onboarding";
import { plans } from "@/lib/config/plans";
import { loginCodeSchema } from "@/lib/login-code";

// Sign-up + onboarding rules (approved preview, Marco 11 Nov 2026).

describe("normalizePhone", () => {
  it.each([
    ["12 34 56 78", "+4512345678"],
    ["12345678", "+4512345678"],
    ["+45 12 34 56 78", "+4512345678"],
    ["0045 12345678", "+4512345678"],
    ["+46 70 123 45 67", "+46701234567"],
    ["(+45) 12-34-56-78", null],
  ])("%s → %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(["", "1234", "+45 1234", "abc", "+45 123456789", "12 34 56 78 90 12 34 56 78"])("rejects %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe("signupInput", () => {
  it("requires all four fields and normalizes email + phone", () => {
    const ok = signupInput.parse({ firstName: " Sofie ", lastName: "Hansen", phone: "12 34 56 78", email: " Sofie@Firma.DK ", kind: "virksomhed" });
    expect(ok).toEqual({ firstName: "Sofie", lastName: "Hansen", phone: "+4512345678", email: "sofie@firma.dk", kind: "virksomhed" });
    expect(signupInput.safeParse({ firstName: "", lastName: "H", phone: "12345678", email: "a@b.dk" }).success).toBe(false);
    expect(signupInput.safeParse({ firstName: "S", lastName: "H", phone: "123", email: "a@b.dk" }).success).toBe(false);
    expect(signupInput.safeParse({ firstName: "S", lastName: "H", phone: "12345678", email: "nope" }).success).toBe(false);
  });
});

describe("loginCodeSchema", () => {
  it("accepts exactly 6 digits, spaces ignored", () => {
    expect(loginCodeSchema.parse("123 456")).toBe("123456");
    expect(loginCodeSchema.safeParse("12345").success).toBe(false);
    expect(loginCodeSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("steps (preview order)", () => {
  it("privat: tilmeld → kode → velkommen → medlemskab → start → værktøj → (test) → plan", () => {
    expect(onboardingSteps("privat", "FROM_SCRATCH")).toEqual(["tilmeld", "kode", "velkommen", "medlemskab", "start", "vaerktoej", "plan"]);
    expect(onboardingSteps("privat", "PLACEMENT_TEST")).toEqual(["tilmeld", "kode", "velkommen", "medlemskab", "start", "vaerktoej", "test", "plan"]);
  });

  it("erhverv: company and invite instead of membership", () => {
    expect(onboardingSteps("virksomhed", null)).toEqual(["tilmeld", "kode", "velkommen", "firma", "inviter", "start", "vaerktoej", "plan"]);
  });

  it("invited employee: no company or membership steps", () => {
    expect(onboardingSteps("medarbejder", "FROM_SCRATCH")).toEqual(["velkommen", "start", "vaerktoej", "plan"]);
  });

  it("progress counts the flow's steps", () => {
    expect(progressPct(null, "type", null)).toBe(0);
    expect(progressPct("privat", "tilmeld", null)).toBe(Math.round((1 / 7) * 100));
    expect(progressPct("privat", "plan", "FROM_SCRATCH")).toBe(100);
    expect(progressPct("virksomhed", "plan", "PLACEMENT_TEST")).toBe(100);
  });

  const base: OnboardingSnapshot = { role: "privat", hasPersonalPlan: false, hasTeamSize: false, startPath: null, hasTrack: false, hasPlacementForTrack: false };

  it("next open step walks the answers in order", () => {
    expect(nextOpenStep(base)).toBe("medlemskab");
    expect(nextOpenStep({ ...base, hasPersonalPlan: true })).toBe("start");
    expect(nextOpenStep({ ...base, hasPersonalPlan: true, startPath: "PLACEMENT_TEST" })).toBe("vaerktoej");
    expect(nextOpenStep({ ...base, hasPersonalPlan: true, startPath: "PLACEMENT_TEST", hasTrack: true })).toBe("test");
    expect(nextOpenStep({ ...base, hasPersonalPlan: true, startPath: "PLACEMENT_TEST", hasTrack: true, hasPlacementForTrack: true })).toBe("plan");
    expect(nextOpenStep({ ...base, hasPersonalPlan: true, startPath: "FROM_SCRATCH", hasTrack: true })).toBe("plan");
    expect(nextOpenStep({ ...base, role: "virksomhed" })).toBe("firma");
    expect(nextOpenStep({ ...base, role: "medarbejder" })).toBe("start");
  });
});

describe("prices (config, never in components)", () => {
  it("Enkelt bruger and 1–9 brugere follow the billing plans; the new plans are recorded only", () => {
    expect(onboardingPrices.personal.SINGLE.totalOre).toBe(plans.find((p) => p.key === "B2C_MONTHLY")?.unitAmountOre);
    expect(onboardingPrices.team.SIZE_1_9.perUserOre).toBe(plans.find((p) => p.key === "B2B_MONTHLY")?.unitAmountOre);
    expect(onboardingPrices.personal.FRIEND.billingPlanKey).toBeNull();
    expect(onboardingPrices.personal.STUDENT.billingPlanKey).toBeNull();
    expect(onboardingPrices.team.SIZE_10_PLUS.billingPlanKey).toBeNull();
    expect(onboardingPrices.team.ENTERPRISE.perUserOre).toBeNull();
  });

  it("formats kroner the Danish way", () => {
    expect(formatKroner(6900)).toBe("69");
    expect(formatKroner(3450)).toBe("34,50");
    expect(formatKroner(5450)).toBe("54,50");
    expect(formatKroner(10900)).toBe("109");
  });
});
