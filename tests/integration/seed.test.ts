import { describe, expect, it } from "vitest";
import { seedAll } from "@/server/content/seed";
import { testDb } from "./helpers";

describe("db:seed", () => {
  it("seeds tracks, plans and modules, and is idempotent", async () => {
    await seedAll(testDb());
    const snapshot = async () => ({
      tracks: await testDb().track.count(),
      plans: await testDb().plan.count(),
      modules: await testDb().module.count(),
      versions: await testDb().moduleVersion.count(),
      moduleTracks: await testDb().moduleTrack.count(),
    });
    const first = await snapshot();
    await seedAll(testDb());
    expect(await snapshot()).toEqual(first);
  });

  it("activates ChatGPT, Copilot and Claude; Gemini is inactive; Copilot has two license tiers", async () => {
    await seedAll(testDb());
    const tracks = await testDb().track.findMany({ orderBy: { sortOrder: "asc" } });
    expect(tracks.map((t) => [t.key, t.isActive])).toEqual([["CHATGPT", true], ["COPILOT", true], ["CLAUDE", true], ["GEMINI", false]]);
    expect(tracks.find((t) => t.key === "COPILOT")?.licenseTiers).toEqual(["COPILOT_CHAT", "COPILOT_M365"]);
  });

  it("seeds prices from config: B2C 49 kr incl. VAT monthly, B2B 49 kr ex. VAT monthly / 490 kr yearly, min. 5 seats, no B2C annual", async () => {
    await seedAll(testDb());
    const plans = Object.fromEntries((await testDb().plan.findMany({ where: { active: true } })).map((p) => [p.code, p]));
    expect(Object.keys(plans).sort()).toEqual(["B2B_ANNUAL", "B2B_MONTHLY", "B2C_MONTHLY"]);
    expect(plans.B2C_MONTHLY).toMatchObject({ unitAmountOre: 4900, taxBehavior: "INCLUSIVE", interval: "MONTH" });
    expect(plans.B2B_MONTHLY).toMatchObject({ unitAmountOre: 4900, taxBehavior: "EXCLUSIVE", minSeats: 5, trialDays: 14, trialMaxSeats: 5 });
    expect(plans.B2B_ANNUAL).toMatchObject({ unitAmountOre: 49000, interval: "YEAR", minSeats: 5 });
  });

  it("loads core-prompt-01 on all its tracks; held in review until its golden set exists", async () => {
    await seedAll(testDb());
    const mod = await testDb().module.findUniqueOrThrow({ where: { slug: "core-prompt-01" }, include: { tracks: { include: { track: true } }, versions: true } });
    expect(mod.tracks.map((t) => t.track.key).sort()).toEqual(["CHATGPT", "CLAUDE", "COPILOT", "GEMINI"]);
    expect(mod.requiredLicense).toBe("COPILOT_CHAT");
    expect(mod.versions[0]).toMatchObject({ version: 1, maxPoints: 100, status: "IN_REVIEW" });
    expect(mod.publishedVersionId).toBeNull();
  });
});
