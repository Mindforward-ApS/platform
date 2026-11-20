import { detectPii, type PiiKind } from "@/lib/pii";

// Server-side PII gate (authoritative, docs/04 § 10): same rules as the client. BLOCK can never be overridden;
// WARN passes only when the user confirmed "Det er fiktivt — fortsæt". Never returns or logs the matched value.

export type PiiGateResult =
  | { outcome: "ALLOW"; kinds: []; overridden: false }
  | { outcome: "ALLOW"; kinds: PiiKind[]; overridden: true }
  | { outcome: "WARN"; kinds: PiiKind[] }
  | { outcome: "BLOCK"; kinds: PiiKind[] };

export function piiGate(text: string, clientOverride = false): PiiGateResult {
  const result = detectPii(text);
  if (result.action === "BLOCK") {
    return { outcome: "BLOCK", kinds: [...new Set(result.findings.filter((f) => f.severity === "BLOCK").map((f) => f.kind))] };
  }
  if (result.action === "WARN") return clientOverride ? { outcome: "ALLOW", kinds: result.kinds, overridden: true } : { outcome: "WARN", kinds: result.kinds };
  return { outcome: "ALLOW", kinds: [], overridden: false };
}
