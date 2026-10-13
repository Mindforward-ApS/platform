import { describe, expect, it, vi } from "vitest";
import { countPromptWords, normalizeForMatch, runChecks, type PromptCheck } from "@/server/scoring/deterministic-checks";

const noPii = () => ({ found: false });

const check = (c: Partial<PromptCheck> & Pick<PromptCheck, "kind">): PromptCheck => ({ severity: "BLOCK", message: `${c.kind} failed`, ...c });

describe("normalisation", () => {
  it("lowercases, NFC-normalises and collapses whitespace", () => {
    expect(normalizeForMatch("  Næste\n\tLEVERING  ")).toBe("næste levering");
    // "æ" composed vs "a" + combining… use å: U+0061 U+030A → U+00E5
    expect(normalizeForMatch("Fragtpartner Vårby")).toBe("fragtpartner vårby");
  });

  it("counts words", () => {
    expect(countPromptWords("Skriv et svar — til kunden, tak!")).toBe(6);
    expect(countPromptWords("   ")).toBe(0);
  });
});

describe("runChecks", () => {
  it("MIN_WORDS / MAX_WORDS / MIN_CHARS", () => {
    expect(runChecks("en to tre", [check({ kind: "MIN_WORDS", value: 3 })], noPii).blocked).toBeNull();
    expect(runChecks("en to", [check({ kind: "MIN_WORDS", value: 3 })], noPii).blocked?.kind).toBe("MIN_WORDS");
    expect(runChecks("en to tre fire", [check({ kind: "MAX_WORDS", value: 3 })], noPii).blocked?.kind).toBe("MAX_WORDS");
    expect(runChecks("abc", [check({ kind: "MIN_CHARS", value: 4 })], noPii).blocked?.kind).toBe("MIN_CHARS");
    expect(runChecks("abcd", [check({ kind: "MIN_CHARS", value: 4 })], noPii).blocked).toBeNull();
  });

  it("INCLUDES_ANY / INCLUDES_ALL / EXCLUDES_ALL use normalised substring matching", () => {
    const text = "Næste  LEVERING er fredag.";
    expect(runChecks(text, [check({ kind: "INCLUDES_ANY", terms: ["næste levering", "xyz"] })], noPii).blocked).toBeNull();
    expect(runChecks(text, [check({ kind: "INCLUDES_ANY", terms: ["mandag"] })], noPii).blocked?.kind).toBe("INCLUDES_ANY");
    expect(runChecks(text, [check({ kind: "INCLUDES_ALL", terms: ["FREDAG", "levering"] })], noPii).blocked).toBeNull();
    expect(runChecks(text, [check({ kind: "INCLUDES_ALL", terms: ["fredag", "rabat"] })], noPii).blocked?.kind).toBe("INCLUDES_ALL");
    expect(runChecks(text, [check({ kind: "EXCLUDES_ALL", terms: ["rabat", "kompensation"] })], noPii).blocked).toBeNull();
    expect(runChecks("Giv 10 % RABAT", [check({ kind: "EXCLUDES_ALL", terms: ["rabat"] })], noPii).blocked?.kind).toBe("EXCLUDES_ALL");
  });

  it("treats terms as plain text, never as regex", () => {
    expect(runChecks("a.b", [check({ kind: "INCLUDES_ANY", terms: ["a.b"] })], noPii).blocked).toBeNull();
    expect(runChecks("axb", [check({ kind: "INCLUDES_ANY", terms: ["a.b"] })], noPii).blocked?.kind).toBe("INCLUDES_ANY");
    expect(runChecks("(a+)+", [check({ kind: "INCLUDES_ANY", terms: ["(a+)+"] })], noPii).blocked).toBeNull();
  });

  it("NO_PII calls the injected detector", () => {
    const detector = vi.fn((t: string) => ({ found: t.includes("010190-1234") }));
    expect(runChecks("CPR 010190-1234", [check({ kind: "NO_PII" })], detector).blocked?.kind).toBe("NO_PII");
    expect(runChecks("ingen persondata", [check({ kind: "NO_PII" })], detector).blocked).toBeNull();
    expect(detector).toHaveBeenCalledTimes(2);
  });

  it("WARN checks report a message but do not block; the first BLOCK stops evaluation", () => {
    const later = vi.fn(() => ({ found: true }));
    const r = runChecks(
      "en to",
      [
        check({ kind: "INCLUDES_ANY", terms: ["fredag"], severity: "WARN", message: "warn-1" }),
        check({ kind: "MIN_WORDS", value: 5, message: "block-1" }),
        check({ kind: "NO_PII", message: "never reached" }),
      ],
      later,
    );
    expect(r.warnings.map((w) => w.message)).toEqual(["warn-1"]);
    expect(r.blocked?.message).toBe("block-1");
    expect(r.report).toEqual([
      { index: 0, kind: "INCLUDES_ANY", severity: "WARN", passed: false },
      { index: 1, kind: "MIN_WORDS", severity: "BLOCK", passed: false },
    ]);
    expect(later).not.toHaveBeenCalled();
  });
});
