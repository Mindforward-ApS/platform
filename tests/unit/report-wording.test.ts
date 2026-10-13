import { describe, expect, it } from "vitest";
import { orgAdminMessages } from "@/lib/i18n/da-admin";
import { buildReportDocument, reportCsv, reportPlainText, type ReportData } from "@/server/reports/render";
import { assertReportWording, findBannedTerms } from "@/server/reports/wording";

const data: ReportData = {
  organization: { name: "Testfirma ApS", aiPolicyUrl: "https://example.test/ai-politik" },
  period: { from: new Date("2026-09-01"), to: new Date("2026-10-01") },
  generatedAt: new Date("2026-10-13T10:00:00Z"),
  trial: true,
  notes: "Vi bruger AI til udkast til mails. Alle tjekker fakta før afsendelse.",
  employees: [
    {
      name: "Anna Andersen",
      email: "anna@example.test",
      role: "LEARNER",
      jobRole: "SALES",
      tracks: ["ChatGPT"],
      offered: 9,
      passedModules: [{ slug: "core-llm-01", title: "Hvad en sprogmodel er", version: 1, passedAt: new Date("2026-09-10") }],
      certificates: [{ track: "ChatGPT", levelLabel: "Niveau 1 · Grundlag", issuedAt: new Date("2026-09-20") }],
    },
    { name: "Bo; \"Citat\"", email: "bo@example.test", role: "ADMIN", jobRole: null, tracks: [], offered: 0, passedModules: [], certificates: [] },
  ],
  contentVersions: [{ slug: "core-llm-01", version: 1 }],
};

describe("report wording ban (roadmap M7)", () => {
  it("detects every banned term", () => {
    for (const bad of ["AI Act-certificering", "lovkrav om træning", "påkrævet niveau", "undgå bøder", "en bøde"]) {
      expect(findBannedTerms(bad).length, bad).toBeGreaterThan(0);
    }
    expect(findBannedTerms("Certifikater: 2 · dokumenteret, rollebaseret tiltag efter art. 4")).toEqual([]);
  });

  it("the generated CSV contains no banned terms", () => {
    const csv = reportCsv(buildReportDocument(data));
    expect(findBannedTerms(csv)).toEqual([]);
    expect(csv).toContain("Dokumenteret, rollebaseret tiltag efter art. 4");
  });

  it("the generated PDF text contains no banned terms", () => {
    const text = reportPlainText(buildReportDocument(data));
    expect(findBannedTerms(text)).toEqual([]);
    expect(text).toContain(orgAdminMessages.report.trialWatermark);
  });

  it("all report i18n strings are clean", () => {
    expect(findBannedTerms(JSON.stringify(orgAdminMessages.report))).toEqual([]);
  });

  it("refuses to build a report whose notes contain banned wording", () => {
    expect(() => buildReportDocument({ ...data, notes: "Det er et lovkrav, ellers får vi bøder" })).toThrow();
    expect(() => assertReportWording("certificering")).toThrow();
  });

  it("CSV escapes separators and quotes, and has one row per employee", () => {
    const csv = reportCsv(buildReportDocument(data));
    expect(csv).toContain('"Bo; ""Citat"""');
    expect(csv.split("\r\n").filter((l) => l.includes("@example.test"))).toHaveLength(2);
  });

  it("does not rank employees (sorted by name, no score columns)", () => {
    const doc = buildReportDocument({ ...data, employees: [...data.employees].reverse() });
    expect(doc.rows.map((r) => r[0])).toEqual(["Anna Andersen", 'Bo; "Citat"']);
    expect(doc.header.join(" ")).not.toMatch(/score|placering|rang/i);
  });
});
