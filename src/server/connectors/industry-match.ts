// Danish industry codes (DB25 since 1 Jan 2025, DB07 before) → our user-friendly Industry.
// Pure: the rows come from IndustryCode in the database (content/connectors/industries.json).

export type CodeSystem = "DB25" | "DB07";

export interface IndustryCodeRow {
  system: CodeSystem;
  prefix: string;
  industryId: string;
}

export interface IndustryMatch {
  industryId: string;
  system: CodeSystem;
  prefix: string;
}

/** "69.20.00" → "692000". Anything that is not a digit is dropped. */
export function normalizeIndustryCode(code: string): string {
  return code.replace(/\D/g, "");
}

function longestPrefix(code: string, system: CodeSystem, rows: readonly IndustryCodeRow[]): IndustryMatch | null {
  let best: IndustryCodeRow | null = null;
  for (const r of rows) {
    if (r.system !== system || !code.startsWith(r.prefix)) continue;
    if (!best || r.prefix.length > best.prefix.length) best = r;
  }
  return best ? { industryId: best.industryId, system: best.system, prefix: best.prefix } : null;
}

/** Longest prefix wins within the given system; falls back to the other system, since CVR may return either. */
export function matchIndustryCode(code: string | null | undefined, system: CodeSystem, rows: readonly IndustryCodeRow[]): IndustryMatch | null {
  const normalized = normalizeIndustryCode(code ?? "");
  if (!normalized) return null;
  const other: CodeSystem = system === "DB25" ? "DB07" : "DB25";
  return longestPrefix(normalized, system, rows) ?? longestPrefix(normalized, other, rows);
}
