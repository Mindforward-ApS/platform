import type { EscalationPriority, EscalationReason } from "@/generated/prisma/enums";

// Deterministic triage of the user's (PII-masked) message BEFORE the model (docs/08 § 3, § 4). The hard limits
// are enforced here and by the absence of tools — never only by the prompt:
//  - automatic escalation triggers (security, double charge, paid-but-no-access, human/complaint words)
//  - forbidden requests (discount, price change, other people's data) → fixed refusal + Escalation, no model call
//  - refund requests → the model answers with get_withdrawal_link; the agent escalates afterwards unless a B2C
//    withdrawal window is open (docs/08 § 3.2, eval refund-in-window)
// Base64-looking tokens are decoded and triaged too (eval jb-base64).

export type PolicyIntent = "REFUND" | "DISCOUNT" | "PRICE_CHANGE" | "OTHER_USER_DATA";

export interface AutoEscalation {
  reason: EscalationReason;
  priority: EscalationPriority;
  trigger: "SECURITY" | "DOUBLE_CHARGE" | "ACCOUNT_ACCESS" | "HUMAN" | "COMPLAINT";
}

export interface Triage {
  intents: PolicyIntent[];
  auto: AutoEscalation | null;
}

const SECURITY_RE = /\b(hack(et|ed)?|kompromitteret|compromised|datalæk|data breach|uautoriseret)\b|nogen har (ændret|skiftet|overtaget) (min|mit)/i;
const DOUBLE_CHARGE_RE = /(trukket|betalt|opkrævet|debiteret)( mig)? (to|2) gange|dobbelt ?(betaling|træk|trækning|opkrævning)|chargeback|charged twice|double charge/i;
const ACCESS_RE = /(betalt|købt|paid)[^.!?]{0,60}(kan ikke|kommer ikke|ingen adgang|can'?t|cannot|no access)|(kan ikke|kommer ikke|can'?t)[^.!?]{0,30}(logge|komme|log) (ind|in)[^.!?]{0,60}(betalt|paid)/i;
const COMPLAINT_RE = /\b(klage|klager|advokat|forbrugerombudsmand(en)?|forbrugerklagenævnet|lawyer|complaint)\b/i;
const HUMAN_RE = /\b(menneske|et rigtigt menneske|human|real person)\b|(tale|snakke|skrive) med (en|et) (medarbejder|person|menneske)|fat i (en|et) (medarbejder|menneske|person)|ring(e)? (til mig|mig op)|kan (i|du) ringe/i;

const REFUND_RE = /(penge|pengene|beløbet|mine penge)( \w+)? (tilbage|retur)|refund|refusion|refunder|tilbagebetal|krediter|kreditér|kreditnota|money back|fortryd|withdraw/i;
const DISCOUNT_RE = /rabat|discount|kupon|coupon|promo ?kode|gratis (måned|måneder|periode)|free month/i;
const PRICE_CHANGE_RE = /(sænk|ændr|nedsæt|sæt)\w* (prisen|min pris|vores pris|abonnementsprisen)|billigere pris|forlæng\w* (min |vores |jeres )?(prøveperiode|trial)|extend (my )?trial|lower (the |my )?price/i;
const THIRD_PERSON = String.raw`(hans|hendes|deres|medarbejder(e|en|ens|nes|s)?|kolleg(a|aen|aer|aens|ers)|teamets?|de andres?)`;
const THEIR_TEXT = String.raw`(skrev|skrevet|svarede|prompts?|tekster|besvarelser?|opgavetekster)`;
const OTHER_USER_RE = new RegExp(
  String.raw`\b${THIRD_PERSON}\b[^?.!]{0,60}\b${THEIR_TEXT}\b|\b${THEIR_TEXT}\b[^?.!]{0,60}\b${THIRD_PERSON}\b|\b(for|til|om|af) (bruger|user) ?(nr\.? ?)?[\w-]*\d[\w-]*|andre brugeres|en anden brugers|anden brugers|other users?'?s?`,
  "i",
);
// "vis hvad Mette skrev" — a capitalised name between the question word and the verb (product names excluded).
const NAMED_PERSON_WROTE_RE = /\b(hvad|vis|se)\b[^?.!]{0,30}\b(?!Øvemodel|ChatGPT|Copilot|Claude|Gemini|Mindforward|Nordlys)[A-ZÆØÅ][a-zæøå]+\b[^?.!]{0,20}\b(skrev|skrevet|svarede|har lavet|prompts?)\b/;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const BASE64_RE = /\b[A-Za-z0-9+/]{12,}={0,2}(?![A-Za-z0-9+/=])/g;

/** Decodes base64-looking tokens that turn into readable text (jailbreak by encoding). */
export function decodedVariants(text: string): string[] {
  const out: string[] = [];
  for (const token of text.match(BASE64_RE) ?? []) {
    if (!/[A-Z]/.test(token) || !/[a-z0-9]/.test(token)) continue;
    try {
      const decoded = Buffer.from(token, "base64").toString("utf8");
      if (/^[\p{L}\p{N}\p{P}\p{Zs}]{4,}$/u.test(decoded)) out.push(decoded);
    } catch {
      // not base64
    }
  }
  return out;
}

export function detectIntents(text: string, ownEmail: string): PolicyIntent[] {
  const intents = new Set<PolicyIntent>();
  for (const t of [text, ...decodedVariants(text)]) {
    if (REFUND_RE.test(t)) intents.add("REFUND");
    if (DISCOUNT_RE.test(t)) intents.add("DISCOUNT");
    if (PRICE_CHANGE_RE.test(t)) intents.add("PRICE_CHANGE");
    if (OTHER_USER_RE.test(t) || NAMED_PERSON_WROTE_RE.test(t)) intents.add("OTHER_USER_DATA");
    const own = ownEmail.trim().toLowerCase();
    if ((t.match(EMAIL_RE) ?? []).some((e) => e.replace(/\.+$/, "").toLowerCase() !== own)) intents.add("OTHER_USER_DATA");
  }
  // "Kan jeg få pengene tilbage" mentions money, not a discount; keep both checks independent.
  return [...intents];
}

export function detectAutoEscalation(text: string): AutoEscalation | null {
  if (SECURITY_RE.test(text)) return { reason: "SECURITY", priority: "HIGH", trigger: "SECURITY" };
  if (DOUBLE_CHARGE_RE.test(text)) return { reason: "REFUND_OR_BILLING_DISPUTE", priority: "HIGH", trigger: "DOUBLE_CHARGE" };
  if (ACCESS_RE.test(text)) return { reason: "ACCOUNT_ACCESS", priority: "HIGH", trigger: "ACCOUNT_ACCESS" };
  if (COMPLAINT_RE.test(text)) return { reason: "ANGRY_OR_COMPLAINT", priority: "NORMAL", trigger: "COMPLAINT" };
  if (HUMAN_RE.test(text)) return { reason: "OTHER", priority: "NORMAL", trigger: "HUMAN" };
  return null;
}

export function triage(text: string, ownEmail: string): Triage {
  return { intents: detectIntents(text, ownEmail), auto: detectAutoEscalation(text) };
}

/** Forbidden requests answered by code with a fixed refusal + escalation (refunds are handled by the agent). */
export const REFUSED_INTENTS = ["DISCOUNT", "PRICE_CHANGE", "OTHER_USER_DATA"] as const satisfies readonly PolicyIntent[];
export type RefusedIntent = (typeof REFUSED_INTENTS)[number];

export function refusedIntent(intents: PolicyIntent[]): RefusedIntent | null {
  // Other people's data first: it is the most sensitive refusal.
  if (intents.includes("OTHER_USER_DATA")) return "OTHER_USER_DATA";
  if (intents.includes("DISCOUNT")) return "DISCOUNT";
  if (intents.includes("PRICE_CHANGE")) return "PRICE_CHANGE";
  return null;
}

export const REFUSAL_ESCALATION: Record<RefusedIntent, { reason: EscalationReason; priority: EscalationPriority }> = {
  DISCOUNT: { reason: "PRICING_OR_DISCOUNT", priority: "LOW" },
  PRICE_CHANGE: { reason: "PRICING_OR_DISCOUNT", priority: "LOW" },
  OTHER_USER_DATA: { reason: "LEGAL_OR_PRIVACY", priority: "NORMAL" },
};

/** "nej", "virker ikke" … — three in a row without a solution → escalate (docs/08 § 4). */
export function isUnresolvedReply(text: string): boolean {
  return /^\s*(nej|nope|no)\b|virker (stadig )?ikke|hjalp ikke|det løste ikke|doesn'?t work|didn'?t help/i.test(text);
}
