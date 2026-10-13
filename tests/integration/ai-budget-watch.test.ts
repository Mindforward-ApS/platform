import { afterEach, describe, expect, it } from "vitest";
import { runBudgetWatch, DEGRADED_FLAG } from "@/server/ai/budget-watch";
import { usageDay } from "@/server/ai/budget";
import { createGateway, GatewayError, type StreamInput } from "@/server/ai/gateway";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";
import { gatewayEnv, mailRecorder, scriptedModel } from "./support-fixtures";

// Each test uses its own far-future month so the shared GLOBAL_AI row of "today" is never touched.
const db = testDb();
const LIMIT = 100;

async function setSpent(month: string, spentDkk: number) {
  await db.budgetMonth.upsert({
    where: { scope_month: { scope: "GLOBAL_AI", month } },
    create: { scope: "GLOBAL_AI", month, limitDkk: LIMIT, spentDkk },
    update: { spentDkk, alert80SentAt: null, alert100SentAt: null, degradedAt: null },
  });
}

function watchDeps(at: Date, mail = mailRecorder(), notes: string[] = []) {
  return {
    mail,
    notes,
    deps: {
      db,
      env: { AI_GLOBAL_MONTHLY_BUDGET_DKK: LIMIT, AI_BUDGET_ALERT_PCT: 0.8, OWNER_DIGEST_EMAIL: "marco@example.test", APP_URL: "http://localhost:3000" },
      sendMail: mail.sendMail,
      notify: (m: string) => notes.push(m),
      now: () => at,
    },
  };
}

afterEach(async () => {
  await db.featureFlag.deleteMany({ where: { key: DEGRADED_FLAG } });
});

describe("ai.budget-watch (docs/02 § 6)", () => {
  it("sends the 80 % alert exactly once per month, also with concurrent runs", async () => {
    const at = new Date("2032-01-15T10:00:00Z");
    await setSpent("2032-01", 81);
    const w = watchDeps(at);
    const runs = await Promise.all([runBudgetWatch(w.deps), runBudgetWatch(w.deps), runBudgetWatch(w.deps)]);
    expect(runs.filter((r) => r.alert80Sent)).toHaveLength(1);
    await runBudgetWatch(w.deps);
    // More spend later in the same month: still no second alert.
    await db.budgetMonth.update({ where: { scope_month: { scope: "GLOBAL_AI", month: "2032-01" } }, data: { spentDkk: 90 } });
    expect((await runBudgetWatch(w.deps)).alert80Sent).toBe(false);
    expect(w.mail.sent.filter((m) => m.template === "ai-budget-alert")).toEqual([{ template: "ai-budget-alert", to: "marco@example.test" }]);
    expect(w.notes).toHaveLength(1);
    const row = await db.budgetMonth.findUniqueOrThrow({ where: { scope_month: { scope: "GLOBAL_AI", month: "2032-01" } } });
    expect(row.alert80SentAt).not.toBeNull();
  });

  it("does not alert below 80 % and alerts again in a new month", async () => {
    const w1 = watchDeps(new Date("2032-02-10T10:00:00Z"));
    await setSpent("2032-02", 79);
    expect((await runBudgetWatch(w1.deps)).alert80Sent).toBe(false);
    const w2 = watchDeps(new Date("2032-03-10T10:00:00Z"));
    await setSpent("2032-03", 85);
    expect((await runBudgetWatch(w2.deps)).alert80Sent).toBe(true);
    expect(w1.mail.sent).toHaveLength(0);
  });

  it("switches degraded mode on at 95 %, sends the 100 % alert once, and switches its own flag off in a new month", async () => {
    const w = watchDeps(new Date("2032-04-20T10:00:00Z"));
    await setSpent("2032-04", 100);
    const r = await runBudgetWatch(w.deps);
    expect(r).toMatchObject({ alert80Sent: true, alert100Sent: true, degradedSwitchedOn: true });
    expect((await db.featureFlag.findUniqueOrThrow({ where: { key: DEGRADED_FLAG } })).enabled).toBe(true);
    expect((await runBudgetWatch(w.deps)).alert100Sent).toBe(false);
    expect(await db.auditLog.count({ where: { action: "AI_BUDGET_MODE_CHANGED", targetId: DEGRADED_FLAG } })).toBeGreaterThanOrEqual(1);

    const next = watchDeps(new Date("2032-05-01T10:00:00Z"));
    const r2 = await runBudgetWatch(next.deps);
    expect(r2.degradedSwitchedOff).toBe(true);
    expect((await db.featureFlag.findUniqueOrThrow({ where: { key: DEGRADED_FLAG } })).enabled).toBe(false);
  });

  it("never switches off a degraded flag that Marco set by hand", async () => {
    await db.featureFlag.create({ data: { key: DEGRADED_FLAG, enabled: true, value: { source: "manual" } } });
    const w = watchDeps(new Date("2032-06-01T10:00:00Z"));
    expect((await runBudgetWatch(w.deps)).degradedSwitchedOff).toBe(false);
    expect((await db.featureFlag.findUniqueOrThrow({ where: { key: DEGRADED_FLAG } })).enabled).toBe(true);
  });
});

describe("owner cost overview data (/admin/forbrug)", () => {
  it("aggregates per feature/day/user without names or e-mails", async () => {
    const { usageReport, pseudonym } = await import("@/server/ai/usage-report");
    const user = await makeUser();
    const now = new Date();
    await db.aiCall.create({ data: { userId: user.id, feature: "SUPPORT_AGENT", model: "m", promptKey: "support-agent", promptVersion: "v1", status: "OK", inputTokens: 100, outputTokens: 20, costDkk: 0.5, createdAt: now } });
    await db.aiUsageDaily.upsert({ where: { userId_day: { userId: user.id, day: usageDay(now) } }, create: { userId: user.id, day: usageDay(now), inputTokens: 100, outputTokens: 20, costDkk: 0.5, callCount: 1 }, update: {} });
    const r = await usageReport(db, { limitDkk: 5000, alertPct: 0.8, now });
    expect(r.byFeature.find((f) => f.feature === "SUPPORT_AGENT")?.calls).toBeGreaterThanOrEqual(1);
    expect(r.byDay.length).toBeGreaterThanOrEqual(1);
    expect(r.topUsersToday.map((u) => u.user)).toContain(pseudonym(user.id));
    expect(JSON.stringify(r)).not.toContain(user.email);
  });
});

describe("gateway behaviour at the global cap", () => {
  async function owner() {
    const user = await makeUser();
    const org = await makeOrg("PERSONAL");
    await addMember(org.id, user.id, "OWNER");
    return { userId: user.id, organizationId: org.id };
  }
  const input = (o: { userId: string; organizationId: string }, feature: StreamInput["feature"] = "SANDBOX_CHAT"): StreamInput => ({
    feature,
    promptKey: feature === "SUPPORT_AGENT" ? "support-agent" : feature === "GRADE_PROMPT_TASK" ? "grade-prompt-task" : "sandbox-chat",
    userId: o.userId,
    organizationId: o.organizationId,
    userText: "Skriv en hilsen",
    messages: [{ role: "user", content: "Skriv en hilsen" }],
  });

  it("100 %: blocks new SANDBOX_* / grading calls nicely (AI_DISABLED + GLOBAL_CAP) without calling the model", async () => {
    const at = new Date("2032-07-10T10:00:00Z");
    await setSpent("2032-07", 100);
    const model = scriptedModel([{ text: "nej" }]);
    const g = createGateway({ db, env: { ...gatewayEnv, AI_GLOBAL_MONTHLY_BUDGET_DKK: LIMIT }, provider: model.provider, now: () => at });
    const o = await owner();
    for (const feature of ["SANDBOX_CHAT", "SANDBOX_AGENT", "GRADE_PROMPT_TASK"] as const) {
      const err = await g.prepareStream(input(o, feature)).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(GatewayError);
      expect((err as GatewayError).code).toBe("AI_DISABLED");
      expect((err as GatewayError).details.reason).toBe("GLOBAL_CAP");
    }
    expect(model.requests).toHaveLength(0);
    expect(await db.aiCall.count({ where: { userId: o.userId, status: "BLOCKED_GLOBAL_CAP" } })).toBe(3);
  });

  it("95 %: degraded mode shortens answers to 400 tokens and pauses content draft/verify", async () => {
    const at = new Date("2032-08-10T10:00:00Z");
    await setSpent("2032-08", 96);
    const model = scriptedModel([{ text: "kort svar" }]);
    const g = createGateway({ db, env: { ...gatewayEnv, AI_GLOBAL_MONTHLY_BUDGET_DKK: LIMIT }, provider: model.provider, now: () => at });
    const o = await owner();
    await (await g.prepareStream(input(o))).run({});
    expect(model.requests[0]?.max_tokens).toBe(400);
    const draft = await g
      .prepareStream({ ...input(o), feature: "CONTENT_DRAFT", userId: null, organizationId: null })
      .catch((e: unknown) => e);
    expect((draft as GatewayError).details.reason).toBe("DEGRADED_PAUSE");
  });

  it("below 95 %: normal answers; the per-user daily token cap still blocks with USER_CAP", async () => {
    const at = new Date("2032-09-10T10:00:00Z");
    await setSpent("2032-09", 10);
    const model = scriptedModel([{ text: "svar" }]);
    const g = createGateway({ db, env: { ...gatewayEnv, AI_GLOBAL_MONTHLY_BUDGET_DKK: LIMIT, AI_USER_DAILY_TOKEN_CAP: 1000 }, provider: model.provider, now: () => at });
    const o = await owner();
    await (await g.prepareStream(input(o))).run({});
    expect(model.requests[0]?.max_tokens).toBe(800);
    await db.aiUsageDaily.update({ where: { userId_day: { userId: o.userId, day: usageDay(at) } }, data: { inputTokens: 5000 } });
    const err = await g.prepareStream(input(o)).catch((e: unknown) => e);
    expect((err as GatewayError).code).toBe("USER_CAP");
  });
});
