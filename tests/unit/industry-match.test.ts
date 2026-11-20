import { describe, expect, it } from "vitest";
import { matchIndustryCode, normalizeIndustryCode } from "@/server/connectors/industry-match";

const rows = [
  { system: "DB25", prefix: "01", industryId: "landbrug" },
  { system: "DB25", prefix: "41", industryId: "haandvaerk" },
  { system: "DB25", prefix: "43", industryId: "haandvaerk" },
  { system: "DB25", prefix: "69", industryId: "advokat" },
  { system: "DB25", prefix: "6920", industryId: "revision" },
  { system: "DB07", prefix: "4791", industryId: "webshop" },
  { system: "DB07", prefix: "47", industryId: "detail" },
  { system: "DB07", prefix: "6920", industryId: "revision" },
] as const;

describe("industry code matching (DB25 / DB07)", () => {
  it("normalizes dots, spaces and leading/trailing noise", () => {
    expect(normalizeIndustryCode(" 69.20.00 ")).toBe("692000");
    expect(normalizeIndustryCode("abc")).toBe("");
  });

  it("uses the longest matching prefix", () => {
    expect(matchIndustryCode("692000", "DB25", rows)).toEqual({ industryId: "revision", system: "DB25", prefix: "6920" });
    expect(matchIndustryCode("691000", "DB25", rows)).toEqual({ industryId: "advokat", system: "DB25", prefix: "69" });
    expect(matchIndustryCode("43.22.00", "DB25", rows)?.industryId).toBe("haandvaerk");
  });

  it("matches within the given code system first, so DB07 and DB25 can disagree", () => {
    expect(matchIndustryCode("479100", "DB07", rows)?.industryId).toBe("webshop");
    expect(matchIndustryCode("471100", "DB07", rows)?.industryId).toBe("detail");
  });

  it("falls back to the other system when the given one has no match (CVR may return either)", () => {
    expect(matchIndustryCode("011100", "DB07", rows)).toEqual({ industryId: "landbrug", system: "DB25", prefix: "01" });
  });

  it("returns null for unknown or empty codes, so the UI shows the industry picker", () => {
    expect(matchIndustryCode("999999", "DB25", rows)).toBeNull();
    expect(matchIndustryCode("", "DB25", rows)).toBeNull();
    expect(matchIndustryCode(null, "DB25", rows)).toBeNull();
  });
});
