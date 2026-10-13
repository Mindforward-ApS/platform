import { billingRules } from "@/lib/config/plans";

// Danish legal deadlines are calendar days in Europe/Copenhagen (docs/07-betaling.md § 8.4).
export const TIME_ZONE = "Europe/Copenhagen";

function localParts(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Offset of Copenhagen from UTC in minutes at the given instant (60 in winter, 120 in summer). */
function offsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, timeZoneName: "shortOffset" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? "GMT+1";
  const match = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
}

/** UTC instant of local midnight at the start of the given Copenhagen calendar date. */
export function copenhagenMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  // Two passes handle the DST switch between the guess and the real instant.
  let instant = guess - offsetMinutes(new Date(guess)) * 60_000;
  instant = guess - offsetMinutes(new Date(instant)) * 60_000;
  return new Date(instant);
}

/**
 * Last moment of the withdrawal period: the end of calendar day `withdrawalDays` after the purchase day
 * (purchase on 1 Oct → visible through 15 Oct 23:59:59.999 Copenhagen time). [JURA: verificeres — fristberegning]
 */
export function withdrawalDeadline(purchasedAt: Date, days: number = billingRules.withdrawalDays): Date {
  const { y, m, d } = localParts(purchasedAt);
  const nextDayAfterDeadline = new Date(Date.UTC(y, m - 1, d + days + 1));
  return new Date(copenhagenMidnight(nextDayAfterDeadline.getUTCFullYear(), nextDayAfterDeadline.getUTCMonth() + 1, nextDayAfterDeadline.getUTCDate()).getTime() - 1);
}

const dateFmt = new Intl.DateTimeFormat("da-DK", { timeZone: TIME_ZONE, day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("da-DK", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });

/** "13. oktober 2026" */
export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

/** "14.05" (Danish clock format) */
export function formatTime(date: Date): string {
  return timeFmt.format(date);
}
