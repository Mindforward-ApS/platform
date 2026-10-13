import { describe, expect, it } from "vitest";
import { getCatalog, getPlacementTest } from "@/server/placement/content";
import { answersFromPattern, correctAnswers } from "../fixtures/placement";
import { catalogToPlanModules, generatePlan, type PlanModule } from "@/server/placement/plan-generator";

const modules = catalogToPlanModules(getCatalog());
const chatgpt = getPlacementTest("CHATGPT");
const copilot = getPlacementTest("COPILOT");
const ids = (plan: ReturnType<typeof generatePlan>) => plan.items.map((i) => i.moduleId);

function planFor(test = chatgpt, opts: { questions?: Record<string, string>; jobRole?: PlanModule["roles"][number] | null; licenseTier?: "COPILOT_CHAT" | "COPILOT_M365" | "UNKNOWN" | null; mods?: PlanModule[] } = {}) {
  const jobRole = opts.jobRole ?? null;
  const licenseTier = opts.licenseTier ?? null;
  return generatePlan({
    test,
    answers: { profile: { jobRole, licenseTier }, questions: opts.questions ?? answersFromPattern(test, () => false) },
    jobRole,
    licenseTier,
    modules: opts.mods ?? modules,
  });
}

describe("generatePlan — order", () => {
  it("beginner: Level 1 → role module → Level 2 → Level 3, free modules first", () => {
    const plan = planFor(chatgpt, { jobRole: "SALES" });
    const groups = plan.items.map((i) => i.group);
    const firstIndex = (g: string) => groups.indexOf(g as never);
    const lastIndex = (g: string) => groups.lastIndexOf(g as never);
    expect(lastIndex("LEVEL_1")).toBeLessThan(firstIndex("ROLE"));
    expect(lastIndex("ROLE")).toBeLessThan(firstIndex("LEVEL_2"));
    expect(lastIndex("LEVEL_2")).toBeLessThan(firstIndex("LEVEL_3"));
    expect(ids(plan).slice(0, 3)).toEqual(["core-llm-01", "core-prompt-01", "core-data-01"]);
    expect(plan.items.some((i) => i.skippable)).toBe(false);
  });

  it("is deterministic: the exact expected module order for an all-wrong ChatGPT test without role", () => {
    expect(ids(planFor())).toEqual([
      "core-llm-01",
      "core-prompt-01",
      "core-data-01",
      "core-prompt-02",
      "core-fact-01",
      "core-policy-01",
      "core-mail-01",
      "core-meeting-01",
      "core-aiact-01",
      "feat-orient-01",
      "feat-assist-01",
      "core-files-01",
      "core-sheet-01",
      "core-report-01",
      "core-prompt-03",
      "feat-workspace-01",
      "feat-research-01",
      "core-image-01",
      "feat-connect-01",
      "feat-sched-01",
      "feat-agent-01",
      "core-quality-01",
      "core-workflow-01",
    ]);
  });

  it("SECURE areas mark their modules 'kan springes over' and move them to the end of their level — except always-required ones", () => {
    const plan = planFor(chatgpt, { questions: correctAnswers(chatgpt) });
    const item = (id: string) => plan.items.find((i) => i.moduleId === id);
    expect(item("core-llm-01")?.skippable).toBe(true);
    expect(item("core-prompt-01")?.skippable).toBe(true);
    expect(item("core-data-01")?.skippable).toBe(false); // always required
    expect(item("core-mail-01")?.skippable).toBe(false); // no area → never skippable
    const level1 = plan.items.filter((i) => i.group === "LEVEL_1").map((i) => i.moduleId);
    expect(level1).toEqual([
      "core-data-01",
      "core-mail-01",
      "core-meeting-01",
      "core-aiact-01",
      "feat-orient-01",
      "core-llm-01",
      "core-prompt-01",
      "core-prompt-02",
      "core-fact-01",
      "core-policy-01",
    ]);
  });

  it("UNCERTAIN areas are prioritised to the top (after the free modules)", () => {
    const questions = answersFromPattern(chatgpt, (q) => q.area !== "FACT_CHECK");
    const plan = planFor(chatgpt, { questions });
    const level1 = plan.items.filter((i) => i.group === "LEVEL_1").map((i) => i.moduleId);
    // core-llm-01 and core-prompt-01 are SECURE → skippable, so the free block is only core-data-01.
    expect(level1.slice(0, 2)).toEqual(["core-data-01", "core-fact-01"]);
    expect(plan.items.find((i) => i.moduleId === "core-fact-01")?.prioritized).toBe(true);
  });
});

describe("generatePlan — ROLE modules", () => {
  it("adds only the role module for the chosen job role", () => {
    const plan = planFor(chatgpt, { jobRole: "FINANCE" });
    expect(plan.items.filter((i) => i.type === "ROLE").map((i) => i.moduleId)).toEqual(["role-finance-01"]);
  });

  it("adds no role module without a role or with OTHER", () => {
    expect(planFor(chatgpt, { jobRole: null }).items.some((i) => i.type === "ROLE")).toBe(false);
    expect(planFor(chatgpt, { jobRole: "OTHER" }).items.some((i) => i.type === "ROLE")).toBe(false);
  });
});

describe("generatePlan — tracks and Copilot license tier", () => {
  it("only modules on the test's track", () => {
    expect(ids(planFor(chatgpt))).not.toContain("feat-copilot-chat-01");
    expect(ids(planFor(copilot, { licenseTier: "COPILOT_CHAT" }))).toContain("feat-copilot-chat-01");
  });

  it("COPILOT_CHAT filters out modules that need a paid license and reports them separately", () => {
    const plan = planFor(copilot, { licenseTier: "COPILOT_CHAT" });
    expect(plan.effectiveTier).toBe("COPILOT_CHAT");
    for (const id of ["feat-copilot-m365-01", "feat-connect-01", "feat-sched-01", "feat-agent-01"]) {
      expect(ids(plan)).not.toContain(id);
      expect(plan.excludedForTier).toContain(id);
    }
    expect(ids(plan)).toContain("core-quality-01");
  });

  it("COPILOT_M365 keeps the paid-license modules", () => {
    const plan = planFor(copilot, { licenseTier: "COPILOT_M365" });
    expect(plan.excludedForTier).toEqual([]);
    expect(ids(plan)).toEqual(expect.arrayContaining(["feat-copilot-m365-01", "feat-connect-01", "feat-agent-01"]));
  });

  it("'Ved ikke' (UNKNOWN) and a missing answer are treated as COPILOT_CHAT", () => {
    expect(planFor(copilot, { licenseTier: "UNKNOWN" }).effectiveTier).toBe("COPILOT_CHAT");
    expect(planFor(copilot, { licenseTier: null }).effectiveTier).toBe("COPILOT_CHAT");
    expect(ids(planFor(copilot, { licenseTier: "UNKNOWN" }))).toEqual(ids(planFor(copilot, { licenseTier: "COPILOT_CHAT" })));
  });

  it("license tiers never filter ChatGPT or Claude plans", () => {
    const plan = planFor(getPlacementTest("CLAUDE"), { licenseTier: "COPILOT_CHAT" });
    expect(plan.effectiveTier).toBeNull();
    expect(ids(plan)).toContain("feat-connect-01");
  });

  it("works on any module list (e.g. only what is published in the DB) and ignores NEWS", () => {
    const mods: PlanModule[] = [
      { id: "x-news", title: "Nyhed", level: 1, type: "NEWS", tracks: ["CHATGPT"], requiredLicense: null, roles: [], minutes: 3, sortOrder: 0 },
      { id: "core-prompt-01", title: "Din første gode prompt", level: 1, type: "CORE", tracks: ["CHATGPT"], requiredLicense: "COPILOT_CHAT", roles: [], minutes: 10, sortOrder: 1 },
    ];
    expect(ids(planFor(chatgpt, { mods }))).toEqual(["core-prompt-01"]);
  });
});
