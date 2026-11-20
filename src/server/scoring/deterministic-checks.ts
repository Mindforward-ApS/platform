import type { Step } from "@/lib/schemas/module";

// Deterministic PROMPT_TASK checks (docs/05 § 2 "Check-typer"). Term matching is lowercase + Unicode NFC +
// normalised whitespace + plain substring match — no regex built from content, so no ReDoS risk.

export type PromptCheck = Extract<Step, { type: "PROMPT_TASK" }>["checks"][number];

/** Injected PII detector (the sandbox's filter in src/lib/pii once wired; docs/04). */
export type PiiDetector = (text: string) => { found: boolean };

export interface CheckReportEntry {
  index: number;
  kind: PromptCheck["kind"];
  severity: PromptCheck["severity"];
  passed: boolean;
}

export interface ChecksResult {
  /** First failing BLOCK check, or null. Evaluation stops there. */
  blocked: { index: number; kind: PromptCheck["kind"]; message: string } | null;
  /** Failing WARN checks before the block (messages shown, LLM still called). */
  warnings: { index: number; kind: PromptCheck["kind"]; message: string }[];
  /** ids + pass/fail only — stored on StepResult.checksReport (no learner text). */
  report: CheckReportEntry[];
}

export function normalizeForMatch(text: string): string {
  return text.normalize("NFC").toLowerCase().replace(/\s+/gu, " ").trim();
}

export function countPromptWords(text: string): number {
  return text.split(/\s+/u).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

function passes(check: PromptCheck, text: string, normalized: string, detectPii: PiiDetector): boolean {
  const terms = (check.terms ?? []).map(normalizeForMatch);
  switch (check.kind) {
    case "MIN_WORDS":
      return countPromptWords(text) >= (check.value ?? 0);
    case "MAX_WORDS":
      return countPromptWords(text) <= (check.value ?? Number.POSITIVE_INFINITY);
    case "MIN_CHARS":
      return normalized.length >= (check.value ?? 0);
    case "INCLUDES_ANY":
      return terms.some((t) => normalized.includes(t));
    case "INCLUDES_ALL":
      return terms.every((t) => normalized.includes(t));
    case "EXCLUDES_ALL":
      return terms.every((t) => !normalized.includes(t));
    case "NO_PII":
      return !detectPii(text).found;
  }
}

export function runChecks(text: string, checks: readonly PromptCheck[], detectPii: PiiDetector): ChecksResult {
  const normalized = normalizeForMatch(text);
  const result: ChecksResult = { blocked: null, warnings: [], report: [] };
  for (const [index, check] of checks.entries()) {
    const passed = passes(check, text, normalized, detectPii);
    result.report.push({ index, kind: check.kind, severity: check.severity, passed });
    if (passed) continue;
    if (check.severity === "BLOCK") {
      result.blocked = { index, kind: check.kind, message: check.message };
      break;
    }
    result.warnings.push({ index, kind: check.kind, message: check.message });
  }
  return result;
}
