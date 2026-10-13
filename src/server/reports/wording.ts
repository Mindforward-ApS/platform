// AI Act messaging rules for the company report (docs/10 § 5, docs/00 § 10, roadmap M7). The report is a
// "dokumenteret, rollebaseret tiltag efter art. 4" — never certification, legal requirement, required level or fines.
// M9 adds the shared banned-claims list (src/server/content-engine/banned-claims.ts); this list is the report's own guard.

export const REPORT_BANNED_TERMS: readonly RegExp[] = [
  /certificer/i, // certificering, certificeret, certificere
  /lovkrav/i,
  /påkrævet\s+niveau/i,
  /\bbøde/i, // bøde, bøder, bødetrussel
  /undgå\s+bøder/i,
  /godkendt\s+efter/i,
];

export function findBannedTerms(text: string): string[] {
  return REPORT_BANNED_TERMS.filter((re) => re.test(text)).map((re) => re.source);
}

export class BannedWordingError extends Error {
  constructor(public readonly terms: string[]) {
    super(`Report text contains banned terms: ${terms.join(", ")}`);
    this.name = "BannedWordingError";
  }
}

/** Runtime guard: generated report text must never contain a banned term. */
export function assertReportWording(text: string): void {
  const found = findBannedTerms(text);
  if (found.length > 0) throw new BannedWordingError(found);
}
