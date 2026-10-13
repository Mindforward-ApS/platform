import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CERTIFICATE_DISCLAIMER, CERTIFICATE_LEVELS } from "@/lib/config/certificates";
import { checkEligibility, requiredModulesFor, tierAllows, type TrackModule } from "@/server/certificates/eligibility";

const level1 = CERTIFICATE_LEVELS[0]!;
const trackModules: TrackModule[] = level1.requiredModules.map((slug) => ({ slug, requiredLicense: "COPILOT_CHAT" }));
const passedAll = level1.requiredModules.map((slug) => ({ slug, passedAt: new Date("2026-10-01") }));

describe("certificate config", () => {
  it("level 1 = the 9 core level-1 modules present in content/modules", () => {
    const files = readdirSync("content/modules").filter((f) => f.endsWith(".json"));
    const level1InContent = files
      .map((f) => JSON.parse(readFileSync(`content/modules/${f}`, "utf8")) as { id: string; type: string; level: number })
      .filter((m) => m.type === "CORE" && m.level === 1)
      .map((m) => m.id)
      .sort();
    expect(level1.requiredModules).toHaveLength(9);
    expect([...level1.requiredModules].sort()).toEqual(level1InContent);
  });

  it("uses the fixed disclaimer with the product name Mindforward", () => {
    expect(CERTIFICATE_DISCLAIMER).toBe(
      "Certifikatet dokumenterer gennemført træning i Mindforward. Det er ikke en juridisk certificering, en offentlig godkendelse eller et krav efter AI-forordningen.",
    );
  });
});

describe("certificate eligibility", () => {
  it("eligible when every required module is passed", () => {
    expect(checkEligibility({ level: level1, trackModules, learnerTier: null, passed: passedAll })).toEqual({
      eligible: true,
      required: [...level1.requiredModules],
      missing: [],
    });
  });

  it("not eligible with one module missing, and says which", () => {
    const r = checkEligibility({ level: level1, trackModules, learnerTier: null, passed: passedAll.filter((p) => p.slug !== "core-fact-01") });
    expect(r.eligible).toBe(false);
    expect(r.missing).toEqual(["core-fact-01"]);
  });

  it("modules marked skippable by the placement test are not required — except core-data-01 and core-aiact-01", () => {
    const skippable = new Set(["core-llm-01", "core-data-01", "core-aiact-01"]);
    const required = requiredModulesFor({ level: level1, trackModules, learnerTier: null, skippable });
    expect(required).not.toContain("core-llm-01");
    expect(required).toContain("core-data-01");
    expect(required).toContain("core-aiact-01");
    const passed = passedAll.filter((p) => p.slug !== "core-llm-01");
    expect(checkEligibility({ level: level1, trackModules, learnerTier: null, passed, skippable }).eligible).toBe(true);
  });

  it("only modules on the learner's track are required", () => {
    const onlyTwo = trackModules.filter((m) => m.slug === "core-llm-01" || m.slug === "core-data-01");
    const r = checkEligibility({ level: level1, trackModules: onlyTwo, learnerTier: null, passed: passedAll.slice(0, 1) });
    expect(r.required).toEqual(["core-llm-01", "core-data-01"]);
    expect(r.missing).toEqual(["core-data-01"]);
  });

  it("an empty required set is never eligible", () => {
    expect(checkEligibility({ level: level1, trackModules: [], learnerTier: null, passed: passedAll }).eligible).toBe(false);
  });

  it("modules needing the paid Copilot license only count for learners with it", () => {
    expect(tierAllows("COPILOT_M365", "COPILOT_CHAT")).toBe(false);
    expect(tierAllows("COPILOT_M365", "COPILOT_M365")).toBe(true);
    expect(tierAllows("COPILOT_CHAT", null)).toBe(true);
    const m365: TrackModule[] = trackModules.map((m) => (m.slug === "core-prompt-02" ? { ...m, requiredLicense: "COPILOT_M365" as const } : m));
    expect(requiredModulesFor({ level: level1, trackModules: m365, learnerTier: "COPILOT_CHAT" })).not.toContain("core-prompt-02");
    expect(requiredModulesFor({ level: level1, trackModules: m365, learnerTier: "COPILOT_M365" })).toContain("core-prompt-02");
  });
});
