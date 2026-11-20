import { z } from "zod";
import { plans } from "./plans";

// Sign-up + onboarding (approved preview, Marco 11 Nov 2026). Pure: shared by server actions, pages and tests.
// Prices shown in onboarding live HERE (never in components). Only SINGLE (= B2C_MONTHLY) and SIZE_1_9
// (= B2B_MONTHLY) are billable today; the rest are shown and recorded but have no Stripe price yet
// (TODO(billing): Marco creates Stripe prices for FRIEND, STUDENT and SIZE_10_PLUS; ENTERPRISE is "kontakt").

const planOre = (key: "B2C_MONTHLY" | "B2B_MONTHLY") => plans.find((p) => p.key === key)?.unitAmountOre ?? 0;

export const ONBOARDING_KINDS = ["privat", "virksomhed"] as const;
export type OnboardingKind = (typeof ONBOARDING_KINDS)[number];
export const onboardingKind = z.enum(ONBOARDING_KINDS);

export const PERSONAL_PLAN_CHOICES = ["SINGLE", "FRIEND", "STUDENT"] as const;
export type PersonalPlanChoiceKey = (typeof PERSONAL_PLAN_CHOICES)[number];
export const TEAM_SIZE_BANDS = ["SIZE_1_9", "SIZE_10_PLUS", "ENTERPRISE"] as const;
export type TeamSizeBandKey = (typeof TEAM_SIZE_BANDS)[number];
export const START_PATHS = ["PLACEMENT_TEST", "FROM_SCRATCH"] as const;
export type StartPathKey = (typeof START_PATHS)[number];

/** Monthly price in øre incl. VAT (privat) / per user excl. VAT (erhverv). null = "kontakt os". */
export const onboardingPrices = {
  personal: {
    SINGLE: { totalOre: planOre("B2C_MONTHLY"), perPersonOre: planOre("B2C_MONTHLY"), billingPlanKey: "B2C_MONTHLY" as const },
    FRIEND: { totalOre: 10900, perPersonOre: 5450, billingPlanKey: null },
    STUDENT: { totalOre: 3450, perPersonOre: 3450, billingPlanKey: null },
  },
  team: {
    SIZE_1_9: { perUserOre: planOre("B2B_MONTHLY"), support: "chat" as const, billingPlanKey: "B2B_MONTHLY" as const },
    SIZE_10_PLUS: { perUserOre: 5500, support: "phone" as const, billingPlanKey: null },
    ENTERPRISE: { perUserOre: null, support: "phone" as const, billingPlanKey: null },
  },
} as const;

/** "69" or "34,50" — kroner without the currency word (the copy adds "kr."). */
export function formatKroner(ore: number): string {
  return new Intl.NumberFormat("da-DK", { minimumFractionDigits: ore % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(ore / 100);
}

// ── Sign-up form ──────────────────────────────────────────────────────────

/**
 * Phone → E.164. Danish numbers may be typed as 8 digits ("12 34 56 78"), with +45 or 0045; other countries
 * need a leading + or 00. Returns null when it is not a plausible number.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[+\d][\d\s().-]*$/.test(trimmed)) return null;
  let digits = trimmed.replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  if (/^\d{8}$/.test(digits)) return `+45${digits}`;
  if (/^\+45\d{8}$/.test(digits)) return digits;
  if (/^\+[1-9]\d{6,14}$/.test(digits) && !digits.startsWith("+45")) return digits;
  return null;
}

const name = z.string().trim().min(1).max(60);

export const signupInput = z.object({
  firstName: name,
  lastName: name,
  phone: z.string().max(40).transform((v, ctx) => {
    const phone = normalizePhone(v);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: "PHONE" });
      return z.NEVER;
    }
    return phone;
  }),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  kind: onboardingKind.optional(),
});
export type SignupInput = z.infer<typeof signupInput>;

// ── Steps ─────────────────────────────────────────────────────────────────

/** Who is onboarding: a private person, a company admin creating the company, or an invited employee. */
export type OnboardingRole = "privat" | "virksomhed" | "medarbejder";

export type StepId = "type" | "tilmeld" | "kode" | "velkommen" | "medlemskab" | "firma" | "inviter" | "start" | "vaerktoej" | "test" | "plan";

/** The steps of each flow, in the preview's order (the progress bar counts these). */
export function onboardingSteps(role: OnboardingRole, path: StartPathKey | null): StepId[] {
  const tail: StepId[] = ["start", "vaerktoej", ...(path === "PLACEMENT_TEST" ? (["test"] as StepId[]) : []), "plan"];
  if (role === "virksomhed") return ["tilmeld", "kode", "velkommen", "firma", "inviter", ...tail];
  if (role === "medarbejder") return ["velkommen", ...tail];
  return ["tilmeld", "kode", "velkommen", "medlemskab", ...tail];
}

/** Progress in percent for a step, like the preview: (index + 1) / count. "type" is 0. */
export function progressPct(role: OnboardingRole | null, step: StepId, path: StartPathKey | null): number {
  if (!role || step === "type") return 0;
  const steps = onboardingSteps(role, path);
  const i = steps.indexOf(step);
  return i < 0 ? 0 : Math.round(((i + 1) / steps.length) * 100);
}

export interface OnboardingSnapshot {
  role: OnboardingRole;
  hasPersonalPlan: boolean;
  hasTeamSize: boolean;
  startPath: StartPathKey | null;
  hasTrack: boolean;
  hasPlacementForTrack: boolean;
}

/** The first step the signed-in user still has to answer (after "velkommen"). */
export function nextOpenStep(s: OnboardingSnapshot): StepId {
  if (s.role === "privat" && !s.hasPersonalPlan) return "medlemskab";
  if (s.role === "virksomhed" && !s.hasTeamSize) return "firma";
  if (!s.startPath) return "start";
  if (!s.hasTrack) return "vaerktoej";
  if (s.startPath === "PLACEMENT_TEST" && !s.hasPlacementForTrack) return "test";
  return "plan";
}

/** Steps reachable via ?trin= once signed in (pre-auth steps and "test" are their own pages). */
export const POST_AUTH_STEPS = ["velkommen", "medlemskab", "firma", "inviter", "start", "vaerktoej", "plan"] as const;
export type PostAuthStep = (typeof POST_AUTH_STEPS)[number];
export const isPostAuthStep = (s: unknown): s is PostAuthStep => typeof s === "string" && (POST_AUTH_STEPS as readonly string[]).includes(s);
