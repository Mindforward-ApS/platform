import { describe, expect, it } from "vitest";
import { parseConnectorContent } from "@/lib/schemas/connectors";
import { matchIndustryCode } from "@/server/connectors/industry-match";
import { loadConnectorContent } from "@/server/connectors/content";
import { FIXTURE_COMPANIES } from "@/server/connectors/lookup";

describe("content/connectors", () => {
  const c = loadConnectorContent();

  it("validates: 25–35 industries, 5 fully filled, every OFFICIAL/THIRD_PARTY has a source and date", () => {
    expect(c.industries.length).toBeGreaterThanOrEqual(25);
    expect(c.industries.length).toBeLessThanOrEqual(35);
    expect(c.profiles.map((p) => p.industry).sort()).toEqual(["haandvaerk", "landbrug", "raadgivning", "revision", "webshop"]);
    for (const a of c.availability.filter((x) => x.status === "OFFICIAL" || x.status === "THIRD_PARTY")) {
      expect(a.sourceUrl, `${a.connector}/${a.platform}`).toMatch(/^https:\/\//);
      expect(a.lastVerifiedAt).not.toBeNull();
    }
    expect(c.demos.length).toBe(15);
  });

  it("every connector has an availability row for all three platforms", () => {
    for (const x of c.connectors) {
      const platforms = c.availability.filter((a) => a.connector === x.slug).map((a) => a.platform).sort();
      expect(platforms, x.slug).toEqual(["CHATGPT", "CLAUDE", "COPILOT"]);
    }
  });

  it("refuses OFFICIAL without a source URL (never invent availability)", () => {
    const bad = { ...c, availability: [{ connector: "gmail", platform: "CLAUDE", status: "OFFICIAL", sourceUrl: null, lastVerifiedAt: null }] };
    expect(() => parseConnectorContent(bad as never)).toThrow();
  });

  it("the fictional CVR fixtures match the industries they are meant for", () => {
    const rows = c.industries.flatMap((i) => (["DB25", "DB07"] as const).flatMap((system) => i.codes[system].map((prefix) => ({ system, prefix, industryId: i.slug }))));
    expect(FIXTURE_COMPANIES.map((f) => matchIndustryCode(f.industryCode, f.codeSystem, rows)?.industryId)).toEqual(["landbrug", "haandvaerk", "revision", "webshop", "raadgivning"]);
  });
});

describe("connector source URLs", () => {
  it("only https sources are accepted (no javascript: or data: hrefs)", () => {
    const c = loadConnectorContent();
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "http://example.com"]) {
      const raw = { ...c, availability: [{ connector: "gmail", platform: "CLAUDE", status: "OFFICIAL", sourceUrl: bad, lastVerifiedAt: "2026-10-15" }] };
      expect(() => parseConnectorContent(raw as never), bad).toThrow();
    }
  });
});
