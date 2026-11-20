import { beforeAll, describe, expect, it } from "vitest";
import { seedConnectors } from "@/server/connectors/seed";
import { DEMO_RATE_LIMIT, DemoError, prepareDemoRun } from "@/server/connectors/demo";
import { demoTestRunner, type ConnectorTestRunner } from "@/server/connectors/test-runner";
import { CONNECTOR_DEMO_MAX_TOKENS, modelConfig } from "@/server/ai/models";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";
import { makeSubscription } from "./monthly-fixtures";

// "Prøv den": paid/trial only, 10 runs per hour, prompt limit, runs logged; the model sees only fictional data.

beforeAll(async () => {
  await seedConnectors(testDb());
});

/** Records what would be sent to the gateway and streams a canned answer (no network, no LLM). */
function fakeRunner() {
  const sent: { userText: string; dynamicContext: string; feature: string }[] = [];
  const runner: ConnectorTestRunner = demoTestRunner(async (raw) => {
    sent.push({ userText: raw.userText, dynamicContext: raw.dynamicContext, feature: raw.feature });
    return { run: async ({ onText }) => (onText?.("Demo-svar"), { text: "Demo-svar" }) };
  });
  return { runner, sent };
}

async function learner(paid: boolean) {
  const [org, user] = await Promise.all([makeOrg("BUSINESS"), makeUser()]);
  await addMember(org.id, user.id, "LEARNER");
  if (paid) await makeSubscription(org.id, "ACTIVE");
  return { userId: user.id, organizationId: org.id };
}

const demoId = async () => (await testDb().connectorDemo.findUniqueOrThrow({ where: { slug: "revision-microsoft-365" } })).id;

describe("connector demo (Prøv den)", () => {
  it("runs for a paying org on fictional data and logs the run without the prompt text", async () => {
    const scope = await learner(true);
    const { runner, sent } = fakeRunner();
    const id = await demoId();
    const demo = await testDb().connectorDemo.findUniqueOrThrow({ where: { id } });
    const run = await prepareDemoRun(testDb(), runner, scope, { demoId: id, prompt: demo.prompt, platform: "COPILOT" });
    const chunks: string[] = [];
    await run.run({ onText: (t) => chunks.push(t) });
    expect(chunks.join("")).toBe("Demo-svar");
    expect(sent[0]?.feature).toBe("CONNECTOR_DEMO");
    expect(sent[0]?.dynamicContext).toContain("Lund Tømrer ApS");
    expect(sent[0]?.dynamicContext).toContain("demoen kører IKKE i den");
    const logged = await testDb().connectorDemoRun.findMany({ where: { userId: scope.userId } });
    expect(logged).toEqual([expect.objectContaining({ status: "OK", platform: "COPILOT", promptEdited: false })]);
  });

  it("refuses free accounts (paid plans and trials only) and logs the refusal", async () => {
    const scope = await learner(false);
    await expect(prepareDemoRun(testDb(), fakeRunner().runner, scope, { demoId: await demoId(), prompt: "Hej", platform: "CLAUDE" })).rejects.toMatchObject({ code: "NOT_ENTITLED", status: 403 });
    expect(await testDb().connectorDemoRun.count({ where: { userId: scope.userId, status: "BLOCKED_NOT_ENTITLED" } })).toBe(1);
  });

  it("respects the rate limit: the 11th run within an hour gets 429", async () => {
    const scope = await learner(true);
    const id = await demoId();
    for (let i = 0; i < DEMO_RATE_LIMIT.max; i++) await prepareDemoRun(testDb(), fakeRunner().runner, scope, { demoId: id, prompt: "Opsummér mailene", platform: "CLAUDE" });
    const err = await prepareDemoRun(testDb(), fakeRunner().runner, scope, { demoId: id, prompt: "Opsummér mailene", platform: "CLAUDE" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DemoError);
    expect(err).toMatchObject({ code: "RATE_LIMITED", status: 429 });
  });

  it("caps the prompt length and the output tokens per run", async () => {
    const scope = await learner(true);
    await expect(prepareDemoRun(testDb(), fakeRunner().runner, scope, { demoId: await demoId(), prompt: "x".repeat(2001), platform: "CLAUDE" })).rejects.toMatchObject({ code: "PROMPT_TOO_LONG" });
    const cfg = modelConfig("CONNECTOR_DEMO", { AI_MODEL_DEFAULT: "m", AI_TIMEOUT_MS: 30_000 } as never);
    expect(cfg.maxTokens).toBe(CONNECTOR_DEMO_MAX_TOKENS);
    expect(CONNECTOR_DEMO_MAX_TOKENS).toBeLessThanOrEqual(800);
  });

  it("marks an edited prompt and unknown demos are 404", async () => {
    const scope = await learner(true);
    const run = await prepareDemoRun(testDb(), fakeRunner().runner, scope, { demoId: await demoId(), prompt: "Skriv det som en tabel", platform: "CHATGPT" });
    await run.run({});
    expect(await testDb().connectorDemoRun.findFirst({ where: { userId: scope.userId } })).toMatchObject({ promptEdited: true });
    await expect(prepareDemoRun(testDb(), fakeRunner().runner, scope, { demoId: "missing", prompt: "x", platform: "CLAUDE" })).rejects.toMatchObject({ status: 404 });
  });
});
