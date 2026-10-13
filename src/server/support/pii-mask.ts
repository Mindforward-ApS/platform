import { blockingKinds, detectPii, type PiiKind } from "@/lib/pii";

// Support PII filter (docs/08 § 1): CPR/card/account/IBAN numbers are MASKED before the LLM and before storage
// (the sandbox blocks instead; support must still help the user). Detection is the shared src/lib/pii detector,
// applied to candidate number spans with their surrounding context (account numbers need a context word).

export const MASK = "[skjult]";

// Digit runs with separators (CPR 010190-1234, cards in groups, reg.+konto) and IBAN-like spans.
const CANDIDATE_RE = /[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,3})?|\d[\d -]{8,}\d/g;
const CONTEXT = 30;

export interface MaskResult {
  text: string;
  maskedKinds: PiiKind[];
}

export function maskSupportPii(input: string): MaskResult {
  const text = input.normalize("NFC");
  const kinds = new Set<PiiKind>();
  let out = "";
  let last = 0;
  CANDIDATE_RE.lastIndex = 0;
  for (let m = CANDIDATE_RE.exec(text); m; m = CANDIDATE_RE.exec(text)) {
    const span = m[0].replace(/[ -]+$/, "");
    const before = (out + text.slice(last, m.index)).slice(-CONTEXT);
    const found = blockingKinds(detectPii(`${before}${span}`));
    if (found.length === 0) continue;
    for (const k of found) kinds.add(k);
    out += text.slice(last, m.index) + MASK;
    last = m.index + span.length;
  }
  out += text.slice(last);
  // Final safety net: if the detector still sees a BLOCK kind (unusual formatting), mask all digits.
  const residual = blockingKinds(detectPii(out));
  if (residual.length > 0) {
    for (const k of residual) kinds.add(k);
    out = out.replace(/\d/g, "•");
  }
  return { text: out, maskedKinds: [...kinds] };
}
