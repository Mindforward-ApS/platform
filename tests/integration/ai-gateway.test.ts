import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { createGateway, GatewayError, MAX_TOOL_ROUNDS, type GatewayEnv, type StreamInput } from "@/server/ai/gateway";
import { mockProvider, MOCK_REPLY_PREFIX, ProviderError, type ModelProvider, type ProviderRequest, type ProviderResponse } from "@/server/ai/client";
import { usageDay } from "@/server/ai/budget";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const env: GatewayEnv = {
  AI_ENABLED: true,
  AI_MOCK: true,
  ANTHROPIC_API_KEY: undefined,
  AI_MODEL_DEFAULT: "claude-haiku-4-5",
  AI_MODEL_FALLBACK: undefined,
  AI_MODEL_GRADER: undefined,
  SUPPORT_MODEL: undefined,
  AI_TIMEOUT_MS: 5000,
  AI_USER_DAILY_TOKEN_CAP: 60000,
  AI_GLOBAL_MONTHLY_BUDGET_DKK: 5000,
  AI_USD_DKK_RATE: 6.9,
};

async function owner() {
  const user = await makeUser();
  const org = await makeOrg("PERSONAL");
  await addMember(org.id, user.id, "OWNER");
  return { userId: user.id, organizationId: org.id };
}

const input = (o: { userId: string; organizationId: string }, text = "Skriv en kort hilsen til Hanne", extra: Partial<StreamInput> = {}): StreamInput => ({
  feature: "SANDBOX_CHAT",
  promptKey: "sandbox-chat",
  userId: o.userId,
  organizationId: o.organizationId,
  userText: text,
  skinKey: "chatgpt",
  cachedContext: ["NORDLYS-VERDENEN (test)"],
  messages: [{ role: "user", content: text }],
  ...extra,
});

/** Records requests; behaviour per call supplied by the test. */
function scripted(steps: Array<(req: ProviderRequest, signal: AbortSignal) => Promise<ProviderResponse> | ProviderResponse>) {
  const requests: ProviderRequest[] = [];
  const provider: ModelProvider = {
    name: "test",
    async send(req, { signal, onText }) {
      requests.push(req);
      const step = steps[Math.min(requests.length - 1, steps.length - 1)];
      if (!step) throw new Error("no step");
      const resp = await step(req, signal);
      for (const b of resp.content) if (b.type === "text") onText?.(b.text);
      return resp;
    },
  };
  return { provider, requests };
}
const usage = { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 };
const ok = (text = "Svar"): ProviderResponse => ({ content: [{ type: "text", text }], stopReason: "end_turn", usage });

describe("AI gateway (docs/02 § 6) with AI_MOCK", () => {
  it("streams a deterministic offline answer and logs the call without text", async () => {
    const o = await owner();
    const gw = createGateway({ db: testDb(), env });
    const deltas: string[] = [];
    const result = await (await gw.prepareStream(input(o))).run({ onText: (d) => deltas.push(d) });
    expect(result.text.startsWith(MOCK_REPLY_PREFIX)).toBe(true);
    expect(deltas.join("")).toBe(result.text);
    expect(result).toMatchObject({ model: "claude-haiku-4-5", promptVersion: "v1", fallbackUsed: false });

    const calls = await testDb().aiCall.findMany({ where: { userId: o.userId } });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ feature: "SANDBOX_CHAT", model: "claude-haiku-4-5", promptKey: "sandbox-chat", promptVersion: "v1", status: "OK" });
    expect(JSON.stringify(calls[0])).not.toContain("Hanne");
    const daily = await testDb().aiUsageDaily.findUnique({ where: { userId_day: { userId: o.userId, day: usageDay(new Date()) } } });
    expect(daily?.callCount).toBe(1);
    expect(daily?.inputTokens).toBeGreaterThan(0);
    expect(await testDb().budgetMonth.count({ where: { scope: "GLOBAL_AI" } })).toBeGreaterThan(0);
  });

  it("puts cache_control on the static system prefix and the last tool", async () => {
    const o = await owner();
    const { provider, requests } = scripted([() => ok()]);
    const gw = createGateway({ db: testDb(), env, provider });
    const tools = [
      { name: "mail_search", description: "a", input_schema: { type: "object", properties: {} } },
      { name: "mail_read", description: "b", input_schema: { type: "object", properties: {} } },
    ];
    await (await gw.prepareStream(input(o, "Hej", { tools, runTool: async () => ({ content: "[]" }), dynamicContext: "Trin: rolle og format" }))).run({});
    const req = requests[0]!;
    const system = req.system as Array<{ text: string; cache_control?: unknown }>;
    expect(system[0]!.text).toContain('Du er "Øvemodel"');
    expect(system[0]!.text).toContain("selvstændig chat-app"); // chatgpt skin addendum
    expect(system[1]).toMatchObject({ text: "NORDLYS-VERDENEN (test)", cache_control: { type: "ephemeral" } });
    expect(system[2]!.cache_control).toBeUndefined(); // dynamic context after the breakpoint
    expect((req.tools as Array<{ cache_control?: unknown }>)[1]!.cache_control).toEqual({ type: "ephemeral" });
    expect((req.tools as Array<{ cache_control?: unknown }>)[0]!.cache_control).toBeUndefined();
    expect(req).toMatchObject({ model: "claude-haiku-4-5", temperature: 0.7, max_tokens: 800 });
  });

  it("blocked PII never reaches the model", async () => {
    const o = await owner();
    const send = vi.fn();
    const gw = createGateway({ db: testDb(), env, provider: { name: "test", send } });
    await expect(gw.prepareStream(input(o, "Mit CPR er 010190-1234"))).rejects.toMatchObject({ code: "PII_BLOCKED", status: 422, details: { kinds: ["CPR"] } });
    await expect(gw.prepareStream(input(o, "CPR 010190-1234", { piiOverride: true }))).rejects.toMatchObject({ code: "PII_BLOCKED" });
    expect(send).not.toHaveBeenCalled();
    expect(await testDb().aiCall.count({ where: { userId: o.userId, status: "BLOCKED_PII" } })).toBe(2);
  });

  it("WARN needs the user's override; with it the call goes through", async () => {
    const o = await owner();
    const gw = createGateway({ db: testDb(), env });
    await expect(gw.prepareStream(input(o, "Skriv til kim@gmail.com"))).rejects.toMatchObject({ code: "PII_WARNING", details: { kinds: ["EXTERNAL_EMAIL"] } });
    const r = await (await gw.prepareStream(input(o, "Skriv til kim@gmail.com", { piiOverride: true }))).run({});
    expect(r.text).toContain(MOCK_REPLY_PREFIX);
  });

  it("enforces the daily per-user token cap with a friendly error (429)", async () => {
    const o = await owner();
    await testDb().aiUsageDaily.create({ data: { userId: o.userId, day: usageDay(new Date()), inputTokens: 900, outputTokens: 100, callCount: 3 } });
    const send = vi.fn();
    const gw = createGateway({ db: testDb(), env: { ...env, AI_USER_DAILY_TOKEN_CAP: 1000 }, provider: { name: "test", send } });
    const err = await gw.prepareStream(input(o)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GatewayError);
    expect(err).toMatchObject({ code: "USER_CAP", status: 429 });
    expect(send).not.toHaveBeenCalled();
    expect(await testDb().aiCall.count({ where: { userId: o.userId, status: "BLOCKED_USER_CAP" } })).toBe(1);
  });

  it("rate limits sandbox chat at 10 per minute (429 with retry-after)", async () => {
    const o = await owner();
    const gw = createGateway({ db: testDb(), env });
    for (let i = 0; i < 10; i++) await gw.prepareStream(input(o));
    const err = await gw.prepareStream(input(o)).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: "RATE_LIMITED", status: 429 });
    expect((err as GatewayError).details.retryAfterSec).toBeGreaterThan(0);
  });

  it("is switched off by AI_ENABLED=0 or the AI_ENABLED feature flag", async () => {
    const o = await owner();
    await expect(createGateway({ db: testDb(), env: { ...env, AI_ENABLED: false } }).prepareStream(input(o))).rejects.toMatchObject({ code: "AI_DISABLED", status: 503 });
  });

  it("retries 429/5xx/overloaded with backoff and honours retry-after", async () => {
    const o = await owner();
    const sleep = vi.fn(async () => {});
    const { provider, requests } = scripted([
      () => Promise.reject(new ProviderError("OVERLOADED", true, 529)),
      () => Promise.reject(new ProviderError("RATE_LIMITED", true, 429, 1500)),
      () => ok("Endelig"),
    ]);
    const gw = createGateway({ db: testDb(), env, provider, sleep, random: () => 0.5 });
    const r = await (await gw.prepareStream(input(o))).run({});
    expect(r.text).toBe("Endelig");
    expect(requests).toHaveLength(3);
    expect(sleep.mock.calls).toEqual([[375], [1500]]); // backoff 500 ms ± jitter, then retry-after
  });

  it("does not retry a 400 and returns a controlled error", async () => {
    const o = await owner();
    const sleep = vi.fn(async () => {});
    const { provider, requests } = scripted([() => Promise.reject(new ProviderError("BAD_REQUEST", false, 400))]);
    const gw = createGateway({ db: testDb(), env, provider, sleep });
    await expect((await gw.prepareStream(input(o))).run({})).rejects.toMatchObject({ code: "PROVIDER" });
    expect(requests).toHaveLength(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(await testDb().aiCall.count({ where: { userId: o.userId, status: "ERROR" } })).toBe(1);
  });

  it("falls back to the fallback model once after retries fail", async () => {
    const o = await owner();
    const { provider, requests } = scripted([
      () => Promise.reject(new ProviderError("SERVER", true, 500)),
      () => Promise.reject(new ProviderError("SERVER", true, 500)),
      () => Promise.reject(new ProviderError("SERVER", true, 500)),
      (req) => ok(`fra ${req.model}`),
    ]);
    const gw = createGateway({ db: testDb(), env: { ...env, AI_MODEL_FALLBACK: "claude-sonnet-4-6" }, provider, sleep: async () => {} });
    const r = await (await gw.prepareStream(input(o))).run({});
    expect(requests.map((q) => q.model)).toEqual(["claude-haiku-4-5", "claude-haiku-4-5", "claude-haiku-4-5", "claude-sonnet-4-6"]);
    expect(r).toMatchObject({ text: "fra claude-sonnet-4-6", fallbackUsed: true, model: "claude-sonnet-4-6" });
    expect(await testDb().aiCall.count({ where: { userId: o.userId, status: "FALLBACK" } })).toBe(1);
  });

  it("aborts a hanging call after the timeout", async () => {
    const o = await owner();
    const hanging: ModelProvider = {
      name: "test",
      send: (_req, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new ProviderError("TIMEOUT", false)))),
    };
    const gw = createGateway({ db: testDb(), env: { ...env, AI_TIMEOUT_MS: 50 }, provider: hanging });
    await expect((await gw.prepareStream(input(o))).run({})).rejects.toMatchObject({ code: "TIMEOUT", status: 504 });
    expect(await testDb().aiCall.count({ where: { userId: o.userId, status: "TIMEOUT" } })).toBe(1);
  });

  it(`runs tool rounds and stops after ${MAX_TOOL_ROUNDS}`, async () => {
    const o = await owner();
    const toolUse = (): ProviderResponse => ({ content: [{ type: "tool_use", id: `t${randomUUID()}`, name: "mail_search", input: {} }], stopReason: "tool_use", usage });
    const { provider, requests } = scripted([...Array.from({ length: MAX_TOOL_ROUNDS }, () => toolUse), () => ok("Færdig")]);
    const runTool = vi.fn(async () => ({ content: "[]" }));
    const gw = createGateway({ db: testDb(), env, provider });
    const tools = [{ name: "mail_search", description: "s", input_schema: { type: "object", properties: {} } }];
    const r = await (await gw.prepareStream(input(o, "Find mails", { tools, runTool }))).run({});
    expect(runTool).toHaveBeenCalledTimes(MAX_TOOL_ROUNDS);
    expect(r).toMatchObject({ text: "Færdig", toolCallCount: MAX_TOOL_ROUNDS });
    expect(requests).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(requests[MAX_TOOL_ROUNDS]!.tool_choice).toEqual({ type: "none" });
  });

  it("the mock provider calls a connected tool for a mail question, then answers", async () => {
    const o = await owner();
    const gw = createGateway({ db: testDb(), env, provider: mockProvider() });
    const runTool = vi.fn(async () => ({ content: '[{"id":"m08"}]' }));
    const tools = [{ name: "mail_search", description: "s", input_schema: { type: "object", properties: {} } }];
    const r = await (await gw.prepareStream(input(o, "Opsummer min mail fra Peter", { tools, runTool }))).run({});
    expect(runTool).toHaveBeenCalledWith("mail_search", { query: "" });
    expect(r.toolCallCount).toBe(1);
    expect(r.text).toContain("forbundne Nordlys-data");
  });

  it("structured output: forced tool use, Zod-validated, one retry, then a controlled error", async () => {
    const { z } = await import("zod");
    const o = await owner();
    const schema = z.strictObject({ score: z.number().int().min(0).max(3) });
    const good = createGateway({ db: testDb(), env, provider: mockProvider({ structured: { score: 2 } }) });
    await expect(good.callStructured({ ...input(o), schema })).resolves.toMatchObject({ data: { score: 2 }, model: "claude-haiku-4-5", promptVersion: "v1" });

    const { provider, requests } = scripted([() => ({ content: [{ type: "tool_use", id: "x", name: "structured_output", input: { score: 9 } }], stopReason: "tool_use", usage })]);
    const bad = createGateway({ db: testDb(), env, provider });
    await expect(bad.callStructured({ ...input(o), schema })).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
    expect(requests).toHaveLength(2);
    expect(requests[0]!.tool_choice).toEqual({ type: "tool", name: "structured_output" });
  });
});
