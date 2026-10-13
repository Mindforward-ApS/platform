// Shared PII detector for the sandbox (docs/04-sandkasse.md § 10). Runs in the browser (before send) and on the
// server (authoritative gate). It returns kinds and counts ONLY — the matched value never leaves this module.

export const PII_KINDS = ["CPR", "CARD", "DK_ACCOUNT", "IBAN", "EXTERNAL_EMAIL", "PHONE"] as const;
export type PiiKind = (typeof PII_KINDS)[number];
export type PiiSeverity = "BLOCK" | "WARN";
export type PiiAction = "ALLOW" | PiiSeverity;

export interface PiiFinding {
  kind: PiiKind;
  severity: PiiSeverity;
  count: number;
}

export interface PiiResult {
  action: PiiAction;
  findings: PiiFinding[];
  /** Distinct kinds, BLOCK kinds first. */
  kinds: PiiKind[];
}

/** Kinds that are always WARN (the user may override). DK_ACCOUNT is WARN without a context word, BLOCK with one. */
export const WARN_ONLY_KINDS: readonly PiiKind[] = ["EXTERNAL_EMAIL", "PHONE"];

// ── validators ────────────────────────────────────────────────────────────

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** DDMMYY: day must exist in that month; 29 Feb only in a (possible) leap year. No modulus-11 (not required since 2007). */
export function isValidCprDate(dd: number, mm: number, yy: number): boolean {
  if (mm < 1 || mm > 12 || dd < 1) return false;
  if (dd > (DAYS_IN_MONTH[mm - 1] ?? 0)) return false;
  if (mm === 2 && dd === 29) return yy % 4 === 0;
  return true;
}

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** IBAN lengths per country (ISO 13616 registry, Nordic + EU + common). Unknown country → not an IBAN. */
export const IBAN_LENGTHS: Record<string, number> = {
  DK: 18, FO: 18, GL: 18, NO: 15, SE: 24, FI: 18, IS: 26, DE: 22, GB: 22, IE: 22, NL: 18, BE: 16, LU: 20, FR: 27,
  MC: 27, ES: 24, PT: 25, IT: 27, SM: 27, AT: 20, CH: 21, LI: 21, PL: 28, CZ: 24, SK: 24, HU: 28, SI: 19, HR: 21,
  RO: 24, BG: 22, GR: 27, CY: 28, MT: 31, EE: 20, LV: 21, LT: 20,
};

export function ibanMod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const value = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const digit of value) rem = (rem * 10 + (digit.charCodeAt(0) - 48)) % 97;
  }
  return rem;
}

// ── patterns ──────────────────────────────────────────────────────────────

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,3})?\b/g;
// Card: 13–19 digits, contiguous or in groups of four (last group shorter), or 4-6-5 (Amex).
const CARD_RE = /(?<!\d|\d[.,])(?:\d{13,19}|\d{4}(?:[ -]\d{4}){2,3}(?:[ -]\d{1,3})?|\d{4}[ -]\d{6}[ -]\d{5})(?!\d|[.,]\d)/g;
const CPR_RE = /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d{2})[-\s]?(\d{4})\b/g;
const DK_ACCOUNT_RE = /(?<!\d|\d[.,])\d{4}[\s-]?\d{6,10}(?!\d|[.,]\d)/g;
const ACCOUNT_CONTEXT_RE = /(?<!\p{L})(?:konto|reg|bank|overf[øo]r)/iu;
// Seed phone numbers (+45 0000 0xxx) are fictional and exempt; they are masked before phone detection.
const SEED_PHONE_RE = /\+45\s?0000\s?0\d{3}(?!\d)/g;
// Danish with country prefix (any grouping) or without prefix only when grouped (8 contiguous digits = order number).
const DK_PHONE_PREFIXED_RE = /(?<![\d+])(?:\+45|0045)\s?[2-9]\d(?:\s?\d{2}){3}(?!\d)/g;
const DK_PHONE_GROUPED_RE = /(?<![\d+]|\d[.,])(?:[2-9]\d(?:\s\d{2}){3}|[2-9]\d{3}\s\d{4})(?!\d|[.,]\d)/g;
const INTL_PHONE_RE = /\+\d[\d ]{7,15}\d/g;

const CONTEXT_WINDOW = 30;

interface Ctx {
  /** Original text, used for context look-ups. */
  text: string;
  /** Working copy where already-classified spans are blanked out, so one value is counted once. */
  masked: string;
  counts: Map<PiiKind, { block: number; warn: number }>;
}

function add(ctx: Ctx, kind: PiiKind, severity: PiiSeverity) {
  const entry = ctx.counts.get(kind) ?? { block: 0, warn: 0 };
  if (severity === "BLOCK") entry.block++;
  else entry.warn++;
  ctx.counts.set(kind, entry);
}

function mask(ctx: Ctx, start: number, length: number) {
  ctx.masked = ctx.masked.slice(0, start) + " ".repeat(length) + ctx.masked.slice(start + length);
}

function scan(ctx: Ctx, re: RegExp, classify: (match: RegExpExecArray) => PiiSeverity | null, kind: PiiKind) {
  re.lastIndex = 0;
  const hits: { index: number; length: number; severity: PiiSeverity }[] = [];
  for (let m = re.exec(ctx.masked); m; m = re.exec(ctx.masked)) {
    const severity = classify(m);
    if (severity) hits.push({ index: m.index, length: m[0].length, severity });
  }
  for (const h of hits) {
    add(ctx, kind, h.severity);
    mask(ctx, h.index, h.length);
  }
}

export function detectPii(input: string): PiiResult {
  const text = input.normalize("NFC");
  const ctx: Ctx = { text, masked: text, counts: new Map() };

  scan(ctx, EMAIL_RE, (m) => (m[0].replace(/\.+$/, "").toLowerCase().endsWith(".example") ? null : "WARN"), "EXTERNAL_EMAIL");
  // Seed e-mails are not PII but must not be re-read as numbers by later detectors.
  ctx.masked = ctx.masked.replace(EMAIL_RE, (e) => " ".repeat(e.length));

  scan(
    ctx,
    IBAN_RE,
    (m) => {
      const compact = m[0].replace(/\s/g, "");
      const len = IBAN_LENGTHS[compact.slice(0, 2)];
      if (!len || compact.length < len) return null;
      return ibanMod97(compact.slice(0, len)) === 1 ? "BLOCK" : null;
    },
    "IBAN",
  );

  scan(
    ctx,
    CARD_RE,
    (m) => {
      const digits = m[0].replace(/[ -]/g, "");
      if (digits.length < 13 || digits.length > 19) return null;
      if (/^(\d)\1+$/.test(digits)) return null; // 0000… is Luhn-valid but not a card
      return luhnValid(digits) ? "BLOCK" : null;
    },
    "CARD",
  );

  scan(ctx, CPR_RE, (m) => (isValidCprDate(Number(m[1]), Number(m[2]), Number(m[3])) ? "BLOCK" : null), "CPR");

  scan(
    ctx,
    DK_ACCOUNT_RE,
    (m) => {
      const from = Math.max(0, m.index - CONTEXT_WINDOW);
      const around = ctx.text.slice(from, m.index) + " " + ctx.text.slice(m.index + m[0].length, m.index + m[0].length + CONTEXT_WINDOW);
      return ACCOUNT_CONTEXT_RE.test(around) ? "BLOCK" : "WARN";
    },
    "DK_ACCOUNT",
  );

  ctx.masked = ctx.masked.replace(SEED_PHONE_RE, (p) => " ".repeat(p.length));
  scan(ctx, DK_PHONE_PREFIXED_RE, () => "WARN", "PHONE");
  scan(ctx, DK_PHONE_GROUPED_RE, () => "WARN", "PHONE");
  scan(ctx, INTL_PHONE_RE, (m) => (m[0].replace(/\D/g, "").length >= 8 ? "WARN" : null), "PHONE");

  const findings: PiiFinding[] = [];
  for (const kind of PII_KINDS) {
    const c = ctx.counts.get(kind);
    if (!c) continue;
    if (c.block > 0) findings.push({ kind, severity: "BLOCK", count: c.block });
    if (c.warn > 0) findings.push({ kind, severity: "WARN", count: c.warn });
  }
  const action: PiiAction = findings.some((f) => f.severity === "BLOCK") ? "BLOCK" : findings.length > 0 ? "WARN" : "ALLOW";
  const ordered = [...findings].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "BLOCK" ? -1 : 1));
  const kinds = [...new Set(ordered.map((f) => f.kind))];
  return { action, findings, kinds };
}

/** Kinds that blocked the text (cannot be overridden). */
export function blockingKinds(result: PiiResult): PiiKind[] {
  return [...new Set(result.findings.filter((f) => f.severity === "BLOCK").map((f) => f.kind))];
}
