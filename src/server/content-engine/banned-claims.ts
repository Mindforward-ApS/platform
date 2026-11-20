// Forbidden claims in auto-generated modules (docs/06 § 7.2, CLAUDE.md "ALDRIG", docs/10). Deterministic, no LLM.
// Case-insensitive; Danish letters handled with Unicode-aware boundaries.

export interface BannedHit {
  rule: string;
  match: string;
}

const W = "(?<![\\p{L}\\p{N}])"; // word start
const E = "(?![\\p{L}\\p{N}])"; // word end
const re = (body: string) => new RegExp(`${W}(?:${body})${E}`, "giu");

const VENDORS = "OpenAI|Microsoft|Anthropic|Google";

export const BANNED_RULES: { rule: string; pattern: RegExp }[] = [
  { rule: "certification", pattern: re("certificering\\p{L}*|certificeringskrav\\p{L}*|AI[- ]Act[- ]certific\\p{L}*|certified|certification") },
  { rule: "legal-requirement", pattern: re("lovkrav\\p{L}*|lovpligtig\\p{L}*|påkrævet niveau|krav om certific\\p{L}*|AI-forordningen kræver|loven kræver") },
  { rule: "fines", pattern: re("bøde\\p{L}*|bødestraf\\p{L}*|sanktion\\p{L}*") },
  { rule: "vendor-endorsement", pattern: re(`(?:godkendt|anbefalet|certificeret|udviklet|støttet) af (?:${VENDORS})|officiel(?:t|le)? (?:partner|kursus|samarbejdspartner)|i samarbejde med (?:${VENDORS})|(?:${VENDORS})[- ]godkendt`) },
  { rule: "guarantee", pattern: re("garanti\\p{L}*|garanterer|100 ?% sikker") },
  { rule: "superlative", pattern: re("revolutionerende|banebrydende|den bedste|verdens bedste|markedets bedste") },
];

/** Region claims are only allowed with region evidence from classify (docs/06 § 5). */
const REGION_CLAIM = re("tilgængelig (?:i|for) (?:Danmark|EU|Europa|EØS|danske)\\p{L}*");
/** "gratis" about a third-party product needs a FACT claim that backs it. */
const FREE = re("gratis");

export function findBannedClaims(text: string, opts: { regionKnown: boolean; freeBacked: boolean }): BannedHit[] {
  const hits: BannedHit[] = [];
  for (const { rule, pattern } of BANNED_RULES) for (const m of text.matchAll(pattern)) hits.push({ rule, match: m[0] });
  if (!opts.regionKnown) for (const m of text.matchAll(REGION_CLAIM)) hits.push({ rule: "region-without-evidence", match: m[0] });
  if (!opts.freeBacked) for (const m of text.matchAll(FREE)) hits.push({ rule: "free-without-source", match: m[0] });
  return hits;
}
