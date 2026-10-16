// ISO 8601 weeks in the Danish calendar (Europe/Copenhagen), for "passed per week" charts. Pure, no I/O.

export interface IsoWeek {
  year: number;
  week: number;
}

const DAY = 86_400_000;
const TIME_ZONE = "Europe/Copenhagen";

/** ISO week of a calendar date (month 1–12). */
export function isoWeek(year: number, month: number, day: number): IsoWeek {
  const date = Date.UTC(year, month - 1, day);
  const weekday = (new Date(date).getUTCDay() + 6) % 7; // Monday = 0
  const thursday = new Date(date + (3 - weekday) * DAY);
  const isoYear = thursday.getUTCFullYear();
  const jan4 = Date.UTC(isoYear, 0, 4);
  const jan4Weekday = (new Date(jan4).getUTCDay() + 6) % 7;
  const week1Monday = jan4 - jan4Weekday * DAY;
  return { year: isoYear, week: Math.floor((date - weekday * DAY - week1Monday) / (7 * DAY)) + 1 };
}

/** The calendar date of an instant in Copenhagen. */
function localDate(at: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function weekOf(at: Date): IsoWeek {
  const { y, m, d } = localDate(at);
  return isoWeek(y, m, d);
}

/** The last `n` ISO weeks up to and including the current one, oldest first. */
export function lastIsoWeeks(now: Date, n: number): IsoWeek[] {
  const { y, m, d } = localDate(now);
  const today = Date.UTC(y, m - 1, d);
  return Array.from({ length: n }, (_, i) => {
    const at = new Date(today - (n - 1 - i) * 7 * DAY);
    return isoWeek(at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate());
  });
}

export interface WeekPasses extends IsoWeek {
  passed: number;
  /** Average best score of the modules passed that week (rounded), or null when none carry a score. */
  avgScorePct: number | null;
}

/** Group passes into the last `n` weeks (zero-filled, oldest first). Passes outside the window are ignored. */
export function bucketPassesByWeek(passes: { passedAt: Date; scorePct: number | null }[], now: Date, n: number): WeekPasses[] {
  const weeks = lastIsoWeeks(now, n);
  const key = (w: IsoWeek) => `${w.year}-${w.week}`;
  const acc = new Map(weeks.map((w) => [key(w), { passed: 0, sum: 0, scored: 0 }]));
  for (const p of passes) {
    const bucket = acc.get(key(weekOf(p.passedAt)));
    if (!bucket) continue;
    bucket.passed += 1;
    if (p.scorePct !== null) {
      bucket.sum += p.scorePct;
      bucket.scored += 1;
    }
  }
  return weeks.map((w) => {
    const b = acc.get(key(w))!;
    return { ...w, passed: b.passed, avgScorePct: b.scored ? Math.round(b.sum / b.scored) : null };
  });
}
