// Kalender date model: calendar days in Europe/Copenhagen as "YYYY-MM-DD" plus minutes after local midnight.
// Pure, no I/O; shared by the /kalender page (server) and the calendar component (client).

export const CALENDAR_TZ = "Europe/Copenhagen";
export type Day = string; // "YYYY-MM-DD"
export type CalendarEventTypeKey = "LESSON" | "PRACTICE" | "MEETING";
export type CalendarTypeLabel = "Lektion" | "Øvelse" | "Holdmøde";

export const TYPE_LABEL: Record<CalendarEventTypeKey, CalendarTypeLabel> = { LESSON: "Lektion", PRACTICE: "Øvelse", MEETING: "Holdmøde" };
export const TYPE_KEY: Record<CalendarTypeLabel, CalendarEventTypeKey> = { Lektion: "LESSON", Øvelse: "PRACTICE", Holdmøde: "MEETING" };
/** Where "Åbn" goes for a planned block of each type (meetings have no page). */
export const DEFAULT_HREF: Record<CalendarEventTypeKey, string | null> = { LESSON: "/forloeb", PRACTICE: "/sandkasse", MEETING: null };

/** One block on the calendar as the server sends it: a planned event, or computed activity (done = read-only). */
export interface CalendarItem {
  id: string;
  title: string;
  type: CalendarEventTypeKey;
  startsAt: string; // ISO instant
  endsAt: string;
  href: string | null;
  done: boolean;
}

const DAY_MS = 86_400_000;
const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function local(at: Date) {
  const p = parts.formatToParts(at);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDay = (utcMs: number): Day => {
  const d = new Date(utcMs);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};
const dayMs = (day: Day) => {
  const [y, m, d] = day.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Copenhagen calendar day and minute of an instant. */
export function cph(at: Date): { day: Day; min: number } {
  const l = local(at);
  return { day: `${l.y}-${pad(l.m)}-${pad(l.d)}`, min: l.h * 60 + l.mi };
}

/** Offset of Copenhagen from UTC at an instant, in ms. */
function offsetMs(at: Date): number {
  const l = local(at);
  return Date.UTC(l.y, l.m - 1, l.d, l.h, l.mi, l.s) - Math.floor(at.getTime() / 1000) * 1000;
}

/** The instant of a Copenhagen wall-clock time; `min` may run past midnight (1440 = next day 00:00). */
export function cphToUtc(day: Day, min: number): Date {
  const naive = dayMs(day) + min * 60_000;
  let t = naive - offsetMs(new Date(naive));
  const second = naive - offsetMs(new Date(t));
  if (second !== t) t = second; // the guess crossed a DST switch
  return new Date(t);
}

export const addDays = (day: Day, n: number): Day => toDay(dayMs(day) + n * DAY_MS);
export const daysBetween = (a: Day, b: Day) => Math.round((dayMs(b) - dayMs(a)) / DAY_MS);
/** Weekday, Monday = 0. */
export const dowOf = (day: Day) => (new Date(dayMs(day)).getUTCDay() + 6) % 7;
export const weekStartOf = (day: Day): Day => addDays(day, -dowOf(day));
export const monthOf = (day: Day) => ({ y: Number(day.slice(0, 4)), m: Number(day.slice(5, 7)) - 1 });
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Same day of month n months later, clamped to the month's length. */
export function addMonths(day: Day, n: number): Day {
  const { y, m } = monthOf(day);
  const t = new Date(Date.UTC(y, m + n, 1));
  const d = Math.min(Number(day.slice(8, 10)), daysInMonth(t.getUTCFullYear(), t.getUTCMonth()));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(d)}`;
}

/** Month grid around a day: starts on the Monday on or before the 1st, 5 or 6 whole weeks. */
export function monthGrid(day: Day): { start: Day; weeks: number } {
  const { y, m } = monthOf(day);
  const first = `${y}-${pad(m + 1)}-01`;
  const lead = dowOf(first);
  return { start: addDays(first, -lead), weeks: Math.max(5, Math.ceil((lead + daysInMonth(y, m)) / 7)) };
}

/** The range the calendar loads for a day: six whole weeks from the month grid's Monday, so every week view of
 *  any day in that month is covered. */
export function loadRange(day: Day): { from: Date; to: Date } {
  const { start } = monthGrid(day);
  return { from: cphToUtc(start, 0), to: cphToUtc(addDays(start, 42), 0) };
}
