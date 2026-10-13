// Marketing limits (docs/09 § 4, § 7). Values are config so they can change without touching send logic.
export const marketingConfig = {
  /** Max MARKETING mails per recipient across all flows. */
  caps: [
    { days: 7, max: 2 },
    { days: 30, max: 6 },
  ],
  /** Newsletter: max 1 per Copenhagen calendar month. */
  newsletterPerMonth: 1,
  /** Quiet hours (Copenhagen): no marketing from 20:00 until 08:00, nor on Sundays and public holidays. */
  quietFromHour: 20,
  quietUntilHour: 8,
  /** Lead nurture timing after the double opt-in click (docs/09 § 5). */
  nurture: [
    { template: "nurture-1", afterMs: 60 * 60 * 1000 },
    { template: "nurture-2", afterMs: 3 * 24 * 60 * 60 * 1000 },
    { template: "nurture-3", afterMs: 7 * 24 * 60 * 60 * 1000 },
    { template: "nurture-4", afterMs: 14 * 24 * 60 * 60 * 1000 },
  ],
  /** "Max 1 flow at a time": a newsletter waits while a nurture mail went out within this many days. */
  nurtureActiveDays: 14,
  /** Campaign rules (docs/09 § 7). */
  campaign: {
    maxDays: 10,
    /** Price must have been unchanged this long before the campaign [JURA: verificeres — præcis periode]. */
    minPriorPriceDays: 30,
  },
} as const;

export type NurtureTemplate = (typeof marketingConfig.nurture)[number]["template"];
