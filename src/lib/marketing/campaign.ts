import { z } from "zod";
import { marketingConfig } from "@/lib/config/marketing";
import { format, getMessages } from "@/lib/i18n";

// Discount campaigns (docs/09 § 7, docs/10 § 3; MFL bilag 1 nr. 7, Forbrugerombudsmandens prismarkedsføring).
// A campaign is ONLY ever described by a validated config object: the copy is generated from it, never free
// text. M8 ships the rules + tests; no campaign or Stripe promotion code is created here.

const DAY_MS = 24 * 60 * 60 * 1000;

const discountSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PERCENT"), value: z.number().int().min(1).max(100) }),
  z.object({ type: z.literal("AMOUNT_ORE"), value: z.number().int().positive() }),
]);

export const campaignSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9-]{3,32}$/, "kode: A–Z, 0–9 og bindestreg"),
    /** "Introduktionstilbud" must be labelled as such. */
    kind: z.enum(["INTRODUCTORY", "CAMPAIGN"]),
    discount: discountSchema,
    durationMonths: z.number().int().min(1).max(12),
    startsAt: z.date(),
    /** Required; equals the Stripe promotion code's expires_at and the end date shown to everyone. */
    expiresAt: z.date(),
    /** true = the end date is announced in the copy; allows > 10 days (still ≤ half the normal-price period). */
    announcedEndDate: z.boolean(),
    /** The REAL prior price: the current Stripe Price and since when it has applied unchanged. */
    priorPrice: z.object({ stripePriceId: z.string().min(1), unitAmountOre: z.number().int().positive(), effectiveSince: z.date() }),
    /** config normalPriceSince: start of the period the normal price has been charged. */
    normalPriceSince: z.date(),
    /** Countdowns may only count to the fixed, server-side expiresAt — never per visitor, never resetting. */
    countdown: z.enum(["NONE", "FIXED_EXPIRES_AT"]),
  })
  .strict()
  .superRefine((c, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const lengthMs = c.expiresAt.getTime() - c.startsAt.getTime();
    if (lengthMs <= 0) issue("expiresAt", "slutdato skal ligge efter start");
    if (!c.announcedEndDate && lengthMs > marketingConfig.campaign.maxDays * DAY_MS) {
      issue("expiresAt", `maks ${marketingConfig.campaign.maxDays} dage uden annonceret slutdato`);
    }
    const normalPeriodMs = c.startsAt.getTime() - c.normalPriceSince.getTime();
    if (lengthMs > normalPeriodMs / 2) issue("expiresAt", "kampagnen må højst vare halvdelen af perioden med normalpris");
    if (c.startsAt.getTime() - c.priorPrice.effectiveSince.getTime() < marketingConfig.campaign.minPriorPriceDays * DAY_MS) {
      issue("priorPrice", `førprisen skal have været gældende i mindst ${marketingConfig.campaign.minPriorPriceDays} dage før start`);
    }
    if (c.priorPrice.effectiveSince.getTime() < c.normalPriceSince.getTime()) issue("priorPrice", "førprisen kan ikke gælde fra før normalprisperioden");
    if (c.discount.type === "AMOUNT_ORE" && c.discount.value >= c.priorPrice.unitAmountOre) issue("discount", "rabatten skal være mindre end førprisen");
  });

export type Campaign = z.infer<typeof campaignSchema>;

/** Throws a ZodError listing every broken rule. */
export function validateCampaign(input: unknown): Campaign {
  return campaignSchema.parse(input);
}

/** Is the campaign live at `now`? Same answer for every visitor. */
export function campaignActive(c: Campaign, now: Date): boolean {
  return now.getTime() >= c.startsAt.getTime() && now.getTime() < c.expiresAt.getTime();
}

/** Milliseconds left until the fixed expiresAt (0 after it) — never relative to a visitor's first view. */
export function countdownRemainingMs(c: Campaign, now: Date): number | null {
  if (c.countdown !== "FIXED_EXPIRES_AT") return null;
  return Math.max(0, c.expiresAt.getTime() - now.getTime());
}

export interface CampaignCopy {
  heading: string | null;
  lines: string[];
}

const dateFmt = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", day: "numeric", month: "long", year: "numeric" });
const kr = (ore: number) => `${new Intl.NumberFormat("da-DK", { minimumFractionDigits: ore % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(ore / 100)} kr.`;

/**
 * Copy generated from the validated object (docs/09 § 7): discount, end date in Danish format, terms and the
 * real prior price. `regularPriceLabel` is the formatted price per period from Stripe/config (e.g. "49 kr./md").
 */
export function campaignCopy(c: Campaign, regularPriceLabel: string): CampaignCopy {
  const t = getMessages().monthly.campaign;
  const discount = c.discount.type === "PERCENT" ? format(t.percent, { value: c.discount.value }) : format(t.amount, { value: kr(c.discount.value).replace(" kr.", "") });
  // expiresAt is exclusive: the last day shown is the day before (Copenhagen time).
  const lastDay = dateFmt.format(new Date(c.expiresAt.getTime() - 1));
  return {
    heading: c.kind === "INTRODUCTORY" ? t.intro : null,
    lines: [discount, format(t.duration, { months: c.durationMonths, regular: regularPriceLabel }), format(t.priorPrice, { price: kr(c.priorPrice.unitAmountOre) }), format(t.endsAt, { date: lastDay })],
  };
}
