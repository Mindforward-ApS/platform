import { describe, expect, it } from "vitest";
import { budgetLevel, globalBudgetState } from "@/server/ai/budget";
import { gradePromptTask, isAiPaused } from "@/server/scoring/prompt-task-grader";

describe("global monthly AI budget levels (docs/02 § 6)", () => {
  it.each([
    [0, "NORMAL"],
    [0.79, "NORMAL"],
    [0.8, "ALERT"],
    [0.949, "ALERT"],
    [0.95, "DEGRADED"],
    [0.999, "DEGRADED"],
    [1, "BLOCKED"],
    [1.4, "BLOCKED"],
  ] as const)("%s → %s", (pct, level) => {
    expect(budgetLevel(pct)).toBe(level);
  });

  it("respects a configured alert threshold", () => {
    expect(budgetLevel(0.7, 0.7)).toBe("ALERT");
    expect(budgetLevel(0.69, 0.7)).toBe("NORMAL");
  });

  it("computes the state from the Copenhagen month row and the configured limit", async () => {
    const fake = {
      budgetMonth: {
        findUnique: async ({ where }: { where: { scope_month: { month: string } } }) => (where.scope_month.month === "2026-11" ? { spentDkk: 4750 } : null),
      },
    } as unknown as Parameters<typeof globalBudgetState>[0];
    // 23:30 UTC on 31 Oct = 00:30 on 1 Nov in Copenhagen (CET).
    const s = await globalBudgetState(fake, 5000, new Date("2026-10-31T23:30:00Z"));
    expect(s).toMatchObject({ month: "2026-11", spentDkk: 4750, pct: 0.95, level: "DEGRADED" });
    const empty = await globalBudgetState(fake, 5000, new Date("2026-12-15T12:00:00Z"));
    expect(empty).toMatchObject({ spentDkk: 0, pct: 0, level: "NORMAL" });
  });
});

describe("PROMPT_TASK at 100 %: deterministic checks run, rubric becomes PENDING", () => {
  const step = {
    id: "p1",
    type: "PROMPT_TASK" as const,
    points: 10,
    instruction: "Skriv et svar",
    scenario: "Kunde",
    checks: [],
    rubric: { version: "r1", criteria: [{ id: "c1", label: "Klar", weight: 1, description: "Klar tekst" }], passThreshold: 0.6 },
  };

  it("returns PENDING without retrying when the gateway reports AI_DISABLED", async () => {
    let calls = 0;
    const out = await gradePromptTask(
      { step: step as never, submission: "Hej Hanne, tak for din mail." },
      {
        detectPii: () => ({ found: false }),
        gradeWithModel: async () => {
          calls++;
          throw Object.assign(new Error("AI_DISABLED"), { code: "AI_DISABLED", details: { reason: "GLOBAL_CAP" } });
        },
      },
    );
    expect(out.status).toBe("PENDING");
    expect(calls).toBe(1);
    expect(isAiPaused({ code: "PROVIDER" })).toBe(false);
  });
});
