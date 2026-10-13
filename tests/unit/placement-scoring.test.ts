import { describe, expect, it } from "vitest";
import type { PlacementAnswers } from "@/lib/schemas/placement";
import { getPlacementTest } from "@/server/placement/content";
import { answersFromPattern, correctAnswers } from "../fixtures/placement";
import { scorePlacement } from "@/server/placement/scoring";

const test = getPlacementTest("CHATGPT");
const profile = { jobRole: null, licenseTier: null } as const;

describe("scorePlacement", () => {
  it("all correct → level 3, every area SECURE (area level 3)", () => {
    const s = scorePlacement(test, { profile, questions: correctAnswers(test) });
    expect(s.scorePct).toBe(100);
    expect(s.level).toBe(3);
    expect(s.areas.every((a) => a.state === "SECURE" && a.level === 3)).toBe(true);
  });

  it("all wrong → level 1, every area UNCERTAIN", () => {
    const s = scorePlacement(test, { profile, questions: answersFromPattern(test, () => false) });
    expect(s.scorePct).toBe(0);
    expect(s.level).toBe(1);
    expect(s.areas.every((a) => a.state === "UNCERTAIN" && a.level === 1)).toBe(true);
  });

  it("per-area scores: half right in a 2-question area is PARTIAL, 1 of 3 is UNCERTAIN", () => {
    const answers: PlacementAnswers = {
      profile,
      questions: answersFromPattern(test, (q, indexInArea) => {
        if (q.area === "MODEL") return indexInArea === 0; // 1/2
        if (q.area === "DATA_SECURITY") return indexInArea === 0; // 1/3
        return true;
      }),
    };
    const s = scorePlacement(test, answers);
    const byId = Object.fromEntries(s.areas.map((a) => [a.id, a]));
    expect(byId.MODEL).toMatchObject({ correct: 1, total: 2, state: "PARTIAL", level: 2 });
    expect(byId.DATA_SECURITY).toMatchObject({ correct: 1, total: 3, state: "UNCERTAIN", level: 1 });
    expect(byId.PROMPTING).toMatchObject({ state: "SECURE" });
    expect(s.correct).toBe(9);
    expect(s.level).toBe(2); // 75 % → between level2MinPct and level3MinPct
  });

  it("unanswered or unknown option ids count as wrong", () => {
    const s = scorePlacement(test, { profile, questions: { q01: "z" } });
    expect(s.correct).toBe(0);
    expect(s.total).toBe(test.questions.length);
  });

  it("gives exactly 3 recommendations, weakest areas first", () => {
    const answers: PlacementAnswers = { profile, questions: answersFromPattern(test, (q) => q.area !== "FACT_CHECK" && q.area !== "ADVANCED") };
    const s = scorePlacement(test, answers);
    expect(s.recommendations).toHaveLength(3);
    expect(s.recommendations.slice(0, 2).map((r) => r.areaId)).toEqual(["FACT_CHECK", "ADVANCED"]);
    const fact = test.areas.find((a) => a.id === "FACT_CHECK");
    expect(s.recommendations[0]?.text).toBe(fact?.advice.improve);
  });

  it("a perfect score still gives 3 'next step' recommendations", () => {
    const s = scorePlacement(test, { profile, questions: correctAnswers(test) });
    expect(s.recommendations).toHaveLength(3);
    for (const r of s.recommendations) expect(test.areas.find((a) => a.id === r.areaId)?.advice.next).toBe(r.text);
  });
});
