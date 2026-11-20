import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { placementConfig } from "@/lib/config/placement";
import { MARKETING_CONSENT } from "@/lib/legal/marketing-consent";
import { getPlacementTest, type PlacementTrack } from "@/server/placement/content";
import { validatePlacementContent } from "../../scripts/placement-validate";

const TRACKS: PlacementTrack[] = ["CHATGPT", "COPILOT", "CLAUDE"];
// docs/10 § 5 + CLAUDE.md "ALDRIG": no certification/legal-requirement/fine claims in public copy.
const BANNED = [/certificer/i, /lovkrav/i, /\bbøde/i, /påkrævet niveau/i];

describe("placement content", () => {
  it("content:validate finds no errors in tests, catalog or consent text", () => {
    expect(validatePlacementContent().errors).toEqual([]);
  });

  for (const track of TRACKS) {
    it(`${track}: 12 questions in the curriculum distribution, within the 5-minute budget`, () => {
      const t = getPlacementTest(track);
      expect(t.questions).toHaveLength(placementConfig.maxQuestions);
      const count = (area: string) => t.questions.filter((q) => q.area === area).length;
      expect([count("MODEL"), count("PROMPTING"), count("FACT_CHECK"), count("DATA_SECURITY"), count("ADVANCED")]).toEqual([2, 3, 2, 3, 2]);
      const seconds = t.questions.reduce((n, q) => n + q.estimatedSeconds, 0) + t.profileQuestions.length * placementConfig.profileQuestionSeconds;
      expect(seconds).toBeLessThanOrEqual(placementConfig.timeBudgetSeconds);
    });

    it(`${track}: asks job role on every track; license tier only on COPILOT`, () => {
      const kinds = getPlacementTest(track).profileQuestions.map((p) => p.kind);
      expect(kinds).toContain("JOB_ROLE");
      expect(kinds.includes("LICENSE_TIER")).toBe(track === "COPILOT");
    });

    it(`${track}: no banned claims`, () => {
      const text = readFileSync(`content/placement/${track.toLowerCase()}.v1.json`, "utf8");
      for (const re of BANNED) expect(text).not.toMatch(re);
    });
  }

  it("the consent constant is exactly the canonical file in content/legal/", () => {
    expect(readFileSync(MARKETING_CONSENT.file, "utf8").trim()).toBe(MARKETING_CONSENT.text);
    expect(MARKETING_CONSENT.version).toBe("marketing-consent.v1");
  });

  it("the placement UI strings contain no banned claims", () => {
    const text = readFileSync("src/lib/i18n/da-placement.ts", "utf8");
    for (const re of BANNED) expect(text).not.toMatch(re);
  });
});
