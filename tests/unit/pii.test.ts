import { describe, expect, it } from "vitest";
import { detectPii, ibanMod97, isValidCprDate, luhnValid, type PiiKind } from "@/lib/pii";

const kinds = (text: string) => detectPii(text).kinds;
const severityOf = (text: string, kind: PiiKind) => detectPii(text).findings.find((f) => f.kind === kind)?.severity;

describe("PII filter (docs/04 § 10)", () => {
  describe("CPR", () => {
    it("blocks a CPR number with hyphen", () => {
      const r = detectPii("Mit CPR er 010190-1234, kan du huske det?");
      expect(r.action).toBe("BLOCK");
      expect(r.kinds).toEqual(["CPR"]);
    });
    it("blocks a CPR number without hyphen and with space", () => {
      expect(severityOf("cpr 0101901234", "CPR")).toBe("BLOCK");
      expect(severityOf("cpr 010190 1234", "CPR")).toBe("BLOCK");
    });
    it("ignores an invalid date (321399-1234 → no finding)", () => {
      expect(kinds("321399-1234")).toEqual([]);
    });
    it("checks the calendar date (31 Feb, 29 Feb in non-leap years)", () => {
      expect(isValidCprDate(31, 2, 90)).toBe(false);
      expect(isValidCprDate(29, 2, 91)).toBe(false);
      expect(isValidCprDate(29, 2, 92)).toBe(true);
      expect(kinds("310290-1234")).not.toContain("CPR");
    });
  });

  describe("CARD (Luhn)", () => {
    it("blocks a Luhn-valid card number with spaces, hyphens or none", () => {
      expect(luhnValid("4111111111111111")).toBe(true);
      expect(severityOf("kort 4111 1111 1111 1111", "CARD")).toBe("BLOCK");
      expect(severityOf("kort 4111-1111-1111-1111", "CARD")).toBe("BLOCK");
      expect(severityOf("kort 4111111111111111", "CARD")).toBe("BLOCK");
    });
    it("ignores a Luhn-invalid number", () => {
      expect(luhnValid("4111111111111112")).toBe(false);
      expect(kinds("kort 4111 1111 1111 1112")).not.toContain("CARD");
    });
  });

  describe("IBAN (mod-97, country length)", () => {
    it("blocks a valid Danish IBAN (18 chars), with or without spaces", () => {
      expect(ibanMod97("DK5000400440116243")).toBe(1);
      expect(severityOf("IBAN DK50 0040 0440 1162 43", "IBAN")).toBe("BLOCK");
      expect(severityOf("IBAN DK5000400440116243", "IBAN")).toBe("BLOCK");
    });
    it("ignores a Danish IBAN with a wrong check sum", () => {
      expect(kinds("IBAN DK51 0040 0440 1162 43")).not.toContain("IBAN");
    });
    it("ignores an unknown country code", () => {
      expect(kinds("XX50 0040 0440 1162 43")).not.toContain("IBAN");
    });
  });

  describe("DK_ACCOUNT", () => {
    it("blocks reg.nr. + account number with a context word", () => {
      expect(severityOf("Overfør til reg.nr. 1234 kontonr. 1234567890", "DK_ACCOUNT")).toBe("BLOCK");
      expect(severityOf("min konto: 1234 1234567890", "DK_ACCOUNT")).toBe("BLOCK");
      expect(severityOf("bank 1234-123456", "DK_ACCOUNT")).toBe("BLOCK");
    });
    it("only warns without a context word", () => {
      const r = detectPii("nummeret er 1234 1234567890 tror jeg");
      expect(r.action).toBe("WARN");
      expect(severityOf("nummeret er 1234 1234567890 tror jeg", "DK_ACCOUNT")).toBe("WARN");
    });
  });

  describe("EXTERNAL_EMAIL", () => {
    it("allows .example addresses (seed world)", () => {
      expect(kinds("skriv til mette@nordlys.example og hanne@boelgegroen-kaffe.example.")).toEqual([]);
    });
    it("warns for any other domain", () => {
      const r = detectPii("send det til kim.lund@gmail.com");
      expect(r.action).toBe("WARN");
      expect(r.kinds).toEqual(["EXTERNAL_EMAIL"]);
    });
  });

  describe("PHONE", () => {
    it("warns for Danish numbers with prefix or grouping, and international numbers", () => {
      expect(severityOf("ring 22 33 44 55", "PHONE")).toBe("WARN");
      expect(severityOf("ring +45 22334455", "PHONE")).toBe("WARN");
      expect(severityOf("ring 0045 22 33 44 55", "PHONE")).toBe("WARN");
      expect(severityOf("ring +46 70 123 45 67", "PHONE")).toBe("WARN");
    });
    it("exempts the seed format +45 0000 0xxx", () => {
      expect(kinds("Ali har nummer +45 0000 0104 og Kim +45 0000 0100")).toEqual([]);
    });
  });

  describe("false positives give no findings", () => {
    it.each([
      ["order numbers (8 digits)", "Ordre 40141 og ordre 40146 samt 40012345 og 51234567"],
      ["dates", "Mødet er 13.10.2026, 2026-10-13 og 13/10/2026 kl. 14:00"],
      ["amounts", "Omsætning 1.240.000 kr, 17930000 kr, 3,50 kr. og -13.950.000"],
      ["postcodes", "Kajgade 0, 8000 Aarhus C og 8600 Silkeborg"],
      ["seed phone numbers", "+45 0000 0100, +45 0000 0412"],
      ["week numbers and percentages", "uge 47–51, 92 % i uge 49, +38 %"],
    ])("%s", (_label, text) => {
      expect(detectPii(text)).toEqual({ action: "ALLOW", findings: [], kinds: [] });
    });
  });

  it("never returns the matched value — only kinds and counts", () => {
    const r = detectPii("CPR 010190-1234 og 020290-4321, kort 4111 1111 1111 1111");
    expect(JSON.stringify(r)).not.toMatch(/\d{4}/);
    expect(r.findings).toEqual([
      { kind: "CPR", severity: "BLOCK", count: 2 },
      { kind: "CARD", severity: "BLOCK", count: 1 },
    ]);
  });

  it("puts BLOCK kinds first when mixed with WARN kinds", () => {
    expect(detectPii("ring 22 33 44 55, CPR 010190-1234").kinds).toEqual(["CPR", "PHONE"]);
  });
});
