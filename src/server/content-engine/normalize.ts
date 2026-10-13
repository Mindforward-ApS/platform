import { createHash } from "node:crypto";
import { z } from "zod";

// Text normalization + hashing (docs/06 § 3). Normalizing BEFORE hashing means noise (whitespace,
// tracking parameters, "updated 5 minutes ago") never produces a ChangeEvent.

export const parsedEntrySchema = z.strictObject({
  entryKey: z.string().min(1).max(200),
  date: z.string().nullable(), // ISO date (yyyy-mm-dd)
  title: z.string(),
  text: z.string(),
  url: z.string(),
});
export type ParsedEntry = z.infer<typeof parsedEntrySchema>;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const RELATIVE_TIME = /\b(updated|opdateret)\s+(about\s+)?(\d+|an?|en|et)\s+(second|minute|hour|day|week|month|sekund|minut|time|dag|uge|måned)[a-zæøå]*\s+(ago|siden)\b/gi;

/** Strip utm_* (and other common tracking) parameters from every URL in a string. */
export function stripTracking(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"')\]]+/g, (raw) => {
    try {
      const u = new URL(raw);
      for (const k of [...u.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_[ce]id$)/i.test(k)) u.searchParams.delete(k);
      const out = u.toString();
      return raw.endsWith("/") || !out.endsWith("/") ? out : out.slice(0, -1);
    } catch {
      return raw;
    }
  });
}

/** NFC, tracking params removed, relative timestamps removed, whitespace collapsed per line, blank lines collapsed, trimmed. */
export function normalizeText(text: string): string {
  return stripTracking(text.normalize("NFC"))
    .replace(RELATIVE_TIME, "")
    .replace(/ /g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v\r]+/g, " ").trim())
    .filter((line, i, all) => line !== "" || (i > 0 && all[i - 1] !== ""))
    .join("\n")
    .trim();
}

export function entryHash(e: Pick<ParsedEntry, "entryKey" | "date" | "title" | "text">): string {
  return sha256(`${e.entryKey}\n${e.date ?? ""}\n${e.title}\n${e.text}`);
}

export function contentHash(entries: ParsedEntry[]): string {
  return sha256(entries.map(entryHash).sort().join("\n"));
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};

/**
 * Finds a date in a heading: "October 9, 2026", "9 October 2026", "2026-10-09", "Oct 9th, 2026",
 * or a month heading "October 2026" (→ first of month). Returns ISO yyyy-mm-dd or null.
 */
export function parseDate(text: string): string | null {
  const t = text.replace(/(\d)(st|nd|rd|th)\b/gi, "$1");
  let m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return iso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m && MONTHS[m[1]!.toLowerCase()]) return iso(Number(m[3]), MONTHS[m[1]!.toLowerCase()]!, Number(m[2]));
  m = t.match(/\b(\d{1,2})\.?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m && MONTHS[m[2]!.toLowerCase()]) return iso(Number(m[3]), MONTHS[m[2]!.toLowerCase()]!, Number(m[1]));
  m = t.match(/\b([A-Za-z]{3,9})\s+(?:CY)?(\d{4})\b/);
  if (m && MONTHS[m[1]!.toLowerCase()]) return iso(Number(m[2]), MONTHS[m[1]!.toLowerCase()]!, 1);
  return null;
}

/** True when the heading is (only) a date, e.g. "October 9, 2026" — such headings group the entries below them. */
export function isDateHeading(text: string): boolean {
  const date = parseDate(text);
  if (!date) return false;
  const rest = text
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .replace(/\b[A-Za-z]{3,9}\b/g, (w) => (MONTHS[w.toLowerCase()] ? "" : w))
    .replace(/\b(CY)?\d{1,4}\b/g, "")
    .replace(/[\s,.–—:-]+/g, "");
  return rest.length === 0;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Stable key when the source offers no id: sha256(date + title), shortened. */
export function fallbackKey(date: string | null, title: string): string {
  return `h-${sha256(`${date ?? ""}\n${title}`).slice(0, 16)}`;
}

/** yyyy-mm-dd in Europe/Copenhagen. */
export function copenhagenDate(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** yyyy-mm in Europe/Copenhagen. */
export function copenhagenMonth(d: Date = new Date()): string {
  return copenhagenDate(d).slice(0, 7);
}

/** ISO week "2026-W42" of a date (Copenhagen calendar day). */
export function isoWeek(d: Date = new Date()): string {
  const [y, m, day] = copenhagenDate(d).split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, day));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${pad(week)}`;
}
