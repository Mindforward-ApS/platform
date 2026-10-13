import { copenhagenMidnight, TIME_ZONE } from "@/server/billing/time";

// Calendar helpers for the monthly cycle, reminders and marketing quiet hours. Everything is in
// Europe/Copenhagen (docs/02 § 5); the clock is always passed in so tests use a fake one.

export interface CphParts {
  year: number;
  month: number; // 1–12
  day: number;
  hour: number; // 0–23
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
}

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function cphParts(at: Date): CphParts {
  const parts = partsFmt.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), hour: Number(get("hour")) % 24, weekday: WEEKDAYS.indexOf(get("weekday")) };
}

/** UTC instant of a Copenhagen wall-clock time (day may overflow, e.g. 32 → next month). */
export function copenhagenInstant(year: number, month: number, day: number, hour: number): Date {
  const wall = Date.UTC(year, month - 1, day, hour);
  let instant = wall;
  for (let i = 0; i < 2; i++) {
    const p = cphParts(new Date(instant));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, new Date(instant).getUTCMinutes());
    instant = wall - (shown - instant);
  }
  return new Date(instant);
}

/** "2026-11" — MonthlyCycle.month for the Copenhagen calendar month containing `at`. */
export function monthKey(at: Date): string {
  const { year, month } = cphParts(at);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(key);
  if (!match) throw new Error(`Invalid month key: ${key}`);
  return { year: Number(match[1]), month: Number(match[2]) };
}

/** [start, end) of a Copenhagen calendar month as UTC instants. */
export function monthRange(key: string): { start: Date; end: Date } {
  const { year, month } = parseMonthKey(key);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return { start: copenhagenMidnight(year, month, 1), end: copenhagenMidnight(next.year, next.month, 1) };
}

export function previousMonthKey(key: string): string {
  const { year, month } = parseMonthKey(key);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
}

// ── Danish public holidays (quiet days for marketing, docs/09 § 4) ──

/** Gregorian Easter Sunday (anonymous algorithm). */
function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Official Danish public holidays ("helligdage") as "MM-DD". Store bededag was abolished from 2024.
 * Juleaften, nytårsaften and grundlovsdag are not official holidays [JURA/ejer: verificeres om de skal med].
 */
export function danishHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const base = Date.UTC(year, easter.month - 1, easter.day);
  const rel = (days: number) => {
    const d = new Date(base + days * 86_400_000);
    return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  };
  return new Set(["01-01", rel(-3), rel(-2), rel(0), rel(1), rel(39), rel(49), rel(50), "12-25", "12-26"]);
}

export function isDanishHoliday(at: Date): boolean {
  const { year, month, day } = cphParts(at);
  return danishHolidays(year).has(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}
