import { beforeAll, describe, expect, it, vi } from "vitest";
import { createGateway, type GatewayEnv } from "@/server/ai/gateway";
import { MOCK_REPLY_PREFIX } from "@/server/ai/client";
import { seedTracks } from "@/server/content/seed";
import { prepareChat } from "@/server/sandbox/chat";
import { applyIntent, IntentError } from "@/server/sandbox/intents";
import { initialState } from "@/server/sandbox/reducer";
import { appendEvents, expireIdleSessions, getOrCreateFreePlaySession, loadChatTurns, loadOwnSession, resetSession, SandboxError, sessionState } from "@/server/sandbox/service";
import { loadSkin } from "@/server/sandbox/skin";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const env: GatewayEnv = {
  AI_ENABLED: true, AI_MOCK: true, ANTHROPIC_API_KEY: undefined, AI_MODEL_DEFAULT: "claude-haiku-4-5", AI_MODEL_FALLBACK: undefined,
  AI_MODEL_GRADER: undefined, SUPPORT_MODEL: undefined, AI_TIMEOUT_MS: 5000, AI_USER_DAILY_TOKEN_CAP: 60000, AI_GLOBAL_MONTHLY_BUDGET_DKK: 5000, AI_USD_DKK_RATE: 6.9,
};

async function owner() {
  const user = await makeUser();
  const org = await makeOrg("PERSONAL");
  await addMember(org.id, user.id, "OWNER");
  return { userId: user.id, organizationId: org.id };
}

// contentText is globally omitted (prompt-text privacy, docs/02 § 7); these assertions read it on purpose.
const events = (sessionId: string) => testDb().sandboxEvent.findMany({ where: { sessionId }, orderBy: { seq: "asc" }, omit: { contentText: false } });

beforeAll(async () => {
  await seedTracks(testDb());
});

describe("sandbox session service (docs/04 § 2, § 12)", () => {
  it("creates one free-play session per user+track with SESSION_STARTED at seq 1", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    expect(s).toMatchObject({ skinKey: "chatgpt", worldVersion: "1", nextSeq: 2, status: "ACTIVE", attemptId: null });
    expect(sessionState(s)).toEqual(initialState());
    const again = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    expect(again.id).toBe(s.id);
    const ev = await events(s.id);
    expect(ev.map((e) => [e.seq, e.type, e.actor])).toEqual([[1, "SESSION_STARTED", "SYSTEM"]]);
    expect(ev[0]!.payload).toEqual({ trackKey: "CHATGPT", skinKey: "chatgpt", worldVersion: "1" });
  });

  it("switches skin via Track.skinKey data only (two tracks, then a data change)", async () => {
    const o = await owner();
    const chat = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const copilot = await getOrCreateFreePlaySession(testDb(), o, "COPILOT");
    expect([chat.skinKey, copilot.skinKey]).toEqual(["chatgpt", "copilot"]);
    expect(loadSkin(chat.skinKey).shell).toBe("SIDEBAR_CHAT");
    expect(loadSkin(copilot.skinKey).shell).toBe("APP_RAIL_SIDE_PANEL");

    await testDb().track.update({ where: { key: "CHATGPT" }, data: { skinKey: "claude" } });
    try {
      const switched = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
      expect(switched.id).not.toBe(chat.id);
      expect(switched.skinKey).toBe("claude");
      expect(loadSkin(switched.skinKey).shell).toBe("SIDEBAR_CHAT_WORKPANE");
      expect((await testDb().sandboxSession.findUniqueOrThrow({ where: { id: chat.id } })).status).toBe("CLOSED");
    } finally {
      await testDb().track.update({ where: { key: "CHATGPT" }, data: { skinKey: "chatgpt" } });
    }
  });

  it("parallel first visits create exactly one session", async () => {
    const o = await owner();
    const sessions = await Promise.all(Array.from({ length: 4 }, () => getOrCreateFreePlaySession(testDb(), o, "CLAUDE")));
    expect(new Set(sessions.map((s) => s.id)).size).toBe(1);
    expect(await testDb().sandboxSession.count({ where: { userId: o.userId } })).toBe(1);
  });

  it("rejects inactive tracks", async () => {
    await expect(getOrCreateFreePlaySession(testDb(), await owner(), "GEMINI")).rejects.toMatchObject({ code: "TRACK_NOT_FOUND" });
  });

  it("assigns gap-free seqs in a transaction, also under concurrency", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const open = (mailId: string) => ({ event: { type: "MAIL_OPENED" as const, actor: "USER" as const, payload: { mailId } } });
    await Promise.all(["m01", "m02", "m03", "m04", "m05"].map((m) => appendEvents(testDb(), o, s.id, [open(m)])));
    const ev = await events(s.id);
    expect(ev.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ev.filter((e) => e.type === "MAIL_OPENED").map((e) => e.target).sort()).toEqual(["mail.m01", "mail.m02", "mail.m03", "mail.m04", "mail.m05"]);
    expect((await testDb().sandboxSession.findUniqueOrThrow({ where: { id: s.id } })).nextSeq).toBe(7);
  });

  it("enforces ownership: other users and other orgs cannot load or append", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const stranger = await owner();
    await expect(loadOwnSession(testDb(), stranger, s.id)).rejects.toMatchObject({ code: "SESSION_NOT_FOUND", status: 404 });
    await expect(loadOwnSession(testDb(), { userId: o.userId, organizationId: stranger.organizationId }, s.id)).rejects.toBeInstanceOf(SandboxError);
    await expect(appendEvents(testDb(), stranger, s.id, [{ event: { type: "MAIL_OPENED", actor: "USER", payload: { mailId: "m01" } } }])).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" });
  });

  it("reset restores the seed state and keeps old events as evidence", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    await appendEvents(testDb(), o, s.id, [{ event: { type: "CONNECTOR_PERMISSION_GRANTED", actor: "USER", payload: { connectorId: "mail", scopes: ["mail.read"] } } }]);
    const { state } = await resetSession(testDb(), o, s.id);
    expect(state).toEqual(initialState());
    expect((await events(s.id)).map((e) => e.type)).toEqual(["SESSION_STARTED", "CONNECTOR_PERMISSION_GRANTED", "SESSION_RESET"]);
  });

  it("expires sessions after 7 days of inactivity", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    await testDb().sandboxSession.update({ where: { id: s.id }, data: { lastActivityAt: new Date(Date.now() - 8 * 86400_000) } });
    await expect(loadOwnSession(testDb(), o, s.id)).rejects.toMatchObject({ code: "SESSION_EXPIRED", status: 410 });
    const fresh = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    expect(fresh.id).not.toBe(s.id);
    await testDb().sandboxSession.update({ where: { id: fresh.id }, data: { lastActivityAt: new Date(Date.now() - 8 * 86400_000) } });
    expect(await expireIdleSessions(testDb(), new Date(), o.userId)).toBe(1);
  });
});

describe("user intents (POST /actions)", () => {
  it("rejects server-only event types and unknown references", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    await expect(applyIntent(testDb(), o, s, { event: { type: "TOOL_CALL_EXECUTED", payload: {} } })).rejects.toMatchObject({ code: "FORBIDDEN_TYPE" });
    await expect(applyIntent(testDb(), o, s, { event: { type: "MAIL_OPENED", payload: { mailId: "m99" } } })).rejects.toMatchObject({ code: "UNKNOWN_REFERENCE" });
    await expect(applyIntent(testDb(), o, s, { event: { type: "MAIL_OPENED", payload: { mailId: "m01", note: "x" } } })).rejects.toMatchObject({ code: "INVALID_EVENT" });
  });

  it("stores draft text only in contentText, with a server-computed length", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const text = "Kære Hanne, beklager forsinkelserne.";
    await applyIntent(testDb(), o, s, {
      event: { type: "MAIL_DRAFT_SAVED", payload: { draftId: "draft-abc123", replyToId: "m02", recipientIds: ["k01"], externalRecipientCount: 1, hasAttachment: false, charCount: 1 } },
      contentText: text,
    });
    const row = await testDb().sandboxEvent.findFirstOrThrow({ where: { sessionId: s.id, type: "MAIL_DRAFT_SAVED" }, omit: { contentText: false } });
    expect(row.contentText).toBe(text);
    expect(row.payload).toMatchObject({ charCount: text.length });
    expect(JSON.stringify(row.payload)).not.toContain("Hanne");
  });

  it("blocks PII in free text (PII_BLOCKED event, nothing stored) and requires override for WARN", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const draft = { type: "MAIL_DRAFT_SAVED" as const, payload: { draftId: "draft-pii001", recipientIds: [], externalRecipientCount: 0, hasAttachment: false, charCount: 0 } };
    await expect(applyIntent(testDb(), o, s, { event: draft, contentText: "CPR 010190-1234" })).rejects.toMatchObject({ code: "PII_BLOCKED", kinds: ["CPR"] });
    await expect(applyIntent(testDb(), o, s, { event: draft, contentText: "ring 22 33 44 55" })).rejects.toBeInstanceOf(IntentError);
    await applyIntent(testDb(), o, s, { event: draft, contentText: "ring 22 33 44 55", piiOverride: true });
    const types = (await events(s.id)).map((e) => e.type);
    expect(types).toEqual(["SESSION_STARTED", "PII_BLOCKED", "MAIL_DRAFT_SAVED"]);
  });
});

describe("sandbox chat with AI_MOCK", () => {
  const gw = () => createGateway({ db: testDb(), env });

  it("emits CHAT_CONVERSATION_STARTED → CHAT_MESSAGE_SENT → CHAT_RESPONSE_RECEIVED; text only in contentText", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const chat = await prepareChat(testDb(), gw(), o, s, { message: "Hvem er du?", attachmentFileIds: ["f01"], piiOverride: false });
    const deltas: string[] = [];
    const result = await chat.run({ onText: (d) => deltas.push(d) });
    expect(result.text).toContain(MOCK_REPLY_PREFIX);
    const ev = await events(s.id);
    expect(ev.map((e) => e.type)).toEqual(["SESSION_STARTED", "CHAT_CONVERSATION_STARTED", "CHAT_MESSAGE_SENT", "CHAT_RESPONSE_RECEIVED"]);
    const [, , sent, received] = ev;
    expect(sent!.payload).toEqual({ conversationId: chat.conversationId, charCount: 11, attachmentFileIds: ["f01"], piiWarningOverridden: false });
    expect(sent!.contentText).toBe("Hvem er du?");
    expect(received!.payload).toMatchObject({ conversationId: chat.conversationId, toolCallCount: 0, stopReason: "end_turn" });
    expect(received!.contentText).toBe(result.text);
    expect(JSON.stringify(ev.map((e) => e.payload))).not.toContain("Hvem er du");
    const state = sessionState(await testDb().sandboxSession.findUniqueOrThrow({ where: { id: s.id } }));
    expect(state.chat.active).toEqual({ id: chat.conversationId, attachments: ["f01"], messageCount: 2 });

    // follow-up in the same conversation uses the stored history
    const next = await prepareChat(testDb(), gw(), o, await loadOwnSession(testDb(), o, s.id), { message: "Og nu?", conversationId: chat.conversationId, attachmentFileIds: [], piiOverride: false });
    await next.run({ onText: () => {} });
    expect((await loadChatTurns(testDb(), o, s.id, { conversationId: chat.conversationId })).map((t) => t.role)).toEqual(["user", "assistant", "user", "assistant"]);
  });

  it("runs model tools only for connected scopes and records TOOL_CALL_EXECUTED without values", async () => {
    const o = await owner();
    let s = await getOrCreateFreePlaySession(testDb(), o, "COPILOT");
    await appendEvents(testDb(), o, s.id, [{ event: { type: "CONNECTOR_PERMISSION_GRANTED", actor: "USER", payload: { connectorId: "mail", scopes: ["mail.read"] } } }]);
    s = await loadOwnSession(testDb(), o, s.id);
    const onTool = vi.fn();
    const chat = await prepareChat(testDb(), gw(), o, s, { message: "Find min mail om returneringer", attachmentFileIds: [], piiOverride: false });
    await chat.run({ onText: () => {}, onTool });
    const tool = await testDb().sandboxEvent.findFirstOrThrow({ where: { sessionId: s.id, type: "TOOL_CALL_EXECUTED" } });
    expect(tool.actor).toBe("MODEL");
    expect(tool.payload).toMatchObject({ tool: "mail_search", connectorId: "mail", filtersUsed: ["query"], requiredConfirmation: false, confirmed: null });
    expect(onTool).toHaveBeenCalledWith(expect.objectContaining({ tool: "mail_search" }));
  });

  it("a blocked message never reaches the model and only PII_BLOCKED is stored", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const send = vi.fn();
    const blocked = createGateway({ db: testDb(), env, provider: { name: "test", send } });
    await expect(prepareChat(testDb(), blocked, o, s, { message: "Mit kort er 4111 1111 1111 1111", attachmentFileIds: [], piiOverride: false })).rejects.toMatchObject({ code: "PII_BLOCKED" });
    expect(send).not.toHaveBeenCalled();
    const ev = await events(s.id);
    expect(ev.map((e) => e.type)).toEqual(["SESSION_STARTED", "PII_BLOCKED"]);
    expect(ev[1]!.payload).toEqual({ surface: "chat", kinds: ["CARD"] });
    expect(ev.every((e) => e.contentText === null)).toBe(true);
  });

  it("a confirmed WARN is recorded as PII_WARNING_SHOWN { overridden: true }", async () => {
    const o = await owner();
    const s = await getOrCreateFreePlaySession(testDb(), o, "CHATGPT");
    const chat = await prepareChat(testDb(), gw(), o, s, { message: "Skriv til ida@havtorn.dk", attachmentFileIds: [], piiOverride: true });
    await chat.run({ onText: () => {} });
    const warn = await testDb().sandboxEvent.findFirstOrThrow({ where: { sessionId: s.id, type: "PII_WARNING_SHOWN" } });
    expect(warn.payload).toEqual({ surface: "chat", kinds: ["EXTERNAL_EMAIL"], overridden: true });
    const sent = await testDb().sandboxEvent.findFirstOrThrow({ where: { sessionId: s.id, type: "CHAT_MESSAGE_SENT" }, omit: { contentText: false } });
    expect(sent.payload).toMatchObject({ piiWarningOverridden: true });
  });
});
