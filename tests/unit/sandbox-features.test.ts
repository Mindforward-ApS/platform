import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadFeatures } from "@/server/sandbox/features";

// The øvemiljø menu's feature guide (Marco 26 Oct 2026): fixed order, each with a page; no logos or links in content.

describe("content/sandbox-features/claude.json", () => {
  const features = loadFeatures("claude") ?? [];
  it("lists the features in the agreed order", () => {
    expect(features.map((f) => f.id)).toEqual(["samtaler", "incognito", "model", "lav-dokumenter", "mit-arbejde", "forbindelser", "handlinger", "projekter", "hukommelse", "planlagt", "faerdigheder"]);
  });
  it("only marks features as ready when the øvemiljø can practise them", () => {
    expect(features.filter((f) => f.practice === "ready").map((f) => [f.id, f.concept])).toEqual([
      ["forbindelser", "CONNECTORS"],
      ["projekter", "ASSISTANTS"],
      ["planlagt", "AUTOMATIONS"],
    ]);
  });
  it("has no logos, colours or links", () => {
    expect(readFileSync("content/sandbox-features/claude.json", "utf8")).not.toMatch(/https?:|\.svg|\.png|#[0-9a-f]{6}\b|logo/i);
  });
  it("other tracks have no guide yet", () => {
    expect(loadFeatures("chatgpt")).toBeNull();
  });
});
