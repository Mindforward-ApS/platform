// Output guard (docs/08 § 3.1): regex/word list run on EVERY assistant answer before it is shown or stored.
// A hit replaces the answer with a safe fallback + automatic escalate_to_human + a digest flag (SupportMessage
// toolName "guard"). Enforced in code, not only in the prompt.

export const CANARY = "GREB-CANARY-7731";

export type GuardRule = "PROMISE" | "LEGAL" | "LEAK" | "FOREIGN_EMAIL" | "AFFILIATION";

const PROMISE: RegExp[] = [
  /refunder(er|et|ing)?\b/i,
  /refusion(en)? (er|bliver) (godkendt|sendt|gennemført)/i,
  /får (pengene|beløbet|dine penge) (tilbage|retur)/i,
  /du får (en |din |jeres )?(refusion|kreditering|kreditnota)/i,
  /(refusion|kreditering)(en)? er (godkendt|på vej)/i,
  /\brabat/i,
  /gratis måned/i,
  /\b[Kk]ode\s*:?\s*[A-Z0-9]{4,}\b/,
  /forlæng(er|et|e)? (din |jeres )?prøveperiode/i,
  /\b(you('ll| will) (get|receive) (a )?refund|refund (is|has been) (approved|issued))\b/i,
  /\bdiscount\b/i,
];

const LEGAL: RegExp[] = [
  /du har (ikke )?ret til/i,
  /det er (ikke )?lovligt/i,
  /lovkrav/i,
  /\bbøde/i,
  /certificeringskrav/i,
  /kræver certificering/i,
];

const LEAK: RegExp[] = [/<<SYS/i, new RegExp(CANARY, "i"), /DET MÅ DU ALDRIG/, /SEND VIDERE TIL ET MENNESKE \(escalate_to_human\)/];

const AFFILIATION: RegExp[] = [
  /(er|vi er) (en )?(officiel|godkendt) (partner|kursus)/i,
  /(tilknyttet|godkendt af|samarbejder med) (openai|microsoft|anthropic|google)(?!.*ikke)/i,
  /\b(det er|svarene kommer fra) (chatgpt|copilot|claude|gemini)\b/i,
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;

export interface GuardContext {
  /** E-mails the assistant may mention: the user's own, the org's billing e-mail from a tool result, the support inbox. */
  allowedEmails: string[];
}

export type GuardResult = { ok: true } | { ok: false; rule: GuardRule; pattern: string };

const NEGATED_AFFILIATION = /\bikke\b[^.]{0,40}(tilknyttet|godkendt|samarbejde)|(tilknyttet|godkendt)[^.]{0,40}\bikke\b/i;

export function guardOutput(text: string, ctx: GuardContext): GuardResult {
  const groups: [GuardRule, RegExp[]][] = [
    ["LEAK", LEAK],
    ["PROMISE", PROMISE],
    ["LEGAL", LEGAL],
  ];
  for (const [rule, patterns] of groups) {
    for (const re of patterns) if (re.test(text)) return { ok: false, rule, pattern: re.source };
  }
  for (const re of AFFILIATION) {
    const m = re.exec(text);
    if (!m) continue;
    // "Mindforward er ikke tilknyttet eller godkendt af OpenAI …" is the required disclaimer, not a claim.
    const sentence = sentenceAround(text, m.index);
    if (NEGATED_AFFILIATION.test(sentence) || /\bikke\b/i.test(sentence)) continue;
    return { ok: false, rule: "AFFILIATION", pattern: re.source };
  }
  const allowed = new Set(ctx.allowedEmails.map((e) => e.trim().toLowerCase()).filter(Boolean));
  for (const email of text.match(EMAIL_RE) ?? []) {
    if (!allowed.has(email.replace(/\.+$/, "").toLowerCase())) return { ok: false, rule: "FOREIGN_EMAIL", pattern: "email" };
  }
  return { ok: true };
}

function sentenceAround(text: string, index: number): string {
  const start = Math.max(text.lastIndexOf(".", index), text.lastIndexOf("\n", index)) + 1;
  const endDot = text.indexOf(".", index);
  return text.slice(start, endDot < 0 ? text.length : endDot);
}
