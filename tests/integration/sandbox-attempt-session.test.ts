import { beforeAll, describe, expect, it } from "vitest";
import type { Gateway } from "@/server/ai/gateway";
import { seedAll } from "@/server/content/seed";
import { checkClickTask, startAttempt, type Actor, type AttemptDeps } from "@/server/modules/attempts";
import { createSandboxClickTaskEvaluator, type EvaluatePredicate } from "@/server/modules/click-task";
import { mockGradeWithModel } from "@/server/scoring/prompt-task-grader";
import { evaluatePredicate } from "@/server/sandbox/assertions";
import { getOrCreateAttemptSession, verifySessionStep } from "@/server/sandbox/attempt-session";
import { prepareChat } from "@/server/sandbox/chat";
import { applyIntent } from "@/server/sandbox/intents";
import { getOrCreateFreePlaySession } from "@/server/sandbox/service";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Opgavevisning: the attempt-bound sandbox session, step tagging and the real CLICK_TASK evaluator end to end
// (docs/01 § 4.1.7, docs/04 § 2 + § 12, docs/05 § 2–3).

const SLUG = "core-prompt-01";
const STEP = "ny-samtale"; // CLICK_TASK, scene "chat-basic"
const PLAYABLE = { allowUnpublished: true };

const deps: AttemptDeps = {
  grader: { detectPii: () => ({ found: false }), gradeWithModel: mockGradeWithModel },
  evaluateClickTask: createSandboxClickTaskEvaluator(testDb(), evaluatePredicate as unknown as EvaluatePredicate),
};

async function learner(): Promise<Actor> {
  const user = await makeUser();
  const org = await makeOrg("PERSONAL");
  await addMember(org.id, user.id, "OWNER");
  return { userId: user.id, organizationId: org.id };
}

async function started() {
  const actor = await learner();
  const { attemptId } = await startAttempt(testDb(), actor, SLUG, PLAYABLE);
  return { actor, attemptId };
}

const events = (sessionId: string) => testDb().sandboxEvent.findMany({ where: { sessionId }, orderBy: { seq: "asc" } });

/** The learner's clicks for the step: "Ny chat", then attach "Tone of voice Nordlys" (f11) — as the UI sends them. */
async function solve(actor: Actor, attemptId: string, opts: { tagged?: boolean } = {}) {
  const stepId = opts.tagged === false ? undefined : STEP;
  let session = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
  const intent = async (type: string, payload: Record<string, unknown>, target?: string) => {
    await applyIntent(testDb(), actor, session, { event: { type: type as never, ...(target ? { target } : {}), ...(stepId ? { stepId } : {}), payload } });
    session = await testDb().sandboxSession.findUniqueOrThrow({ where: { id: session.id } });
  };
  await intent("UI_CLICKED", { region: "nav", control: "new-chat" }, "nav.new-chat");
  await intent("CHAT_CONVERSATION_STARTED", { conversationId: "conv-task0001" });
  await intent("CHAT_FILE_ATTACHED", { conversationId: "conv-task0001", fileId: "f11" });
  return session;
}

beforeAll(async () => {
  await seedAll(testDb());
});

describe("getOrCreateAttemptSession", () => {
  it("creates one session bound to the attempt, module version and step scene, and reuses it", async () => {
    const { actor, attemptId } = await started();
    const attempt = await testDb().attempt.findUniqueOrThrow({ where: { id: attemptId } });
    const s = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    expect(s).toMatchObject({ attemptId, moduleVersionId: attempt.moduleVersionId, sceneId: "chat-basic", status: "ACTIVE", userId: actor.userId, organizationId: actor.organizationId, nextSeq: 2 });
    const [first] = await events(s.id);
    expect(first).toMatchObject({ seq: 1, type: "SESSION_STARTED", actor: "SYSTEM", stepId: STEP });
    expect(first!.payload).toMatchObject({ moduleSlug: SLUG, sceneId: "chat-basic" });

    expect((await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP)).id).toBe(s.id);
    // The free-play session is separate (attemptId null).
    const free = await getOrCreateFreePlaySession(testDb(), actor, "CHATGPT");
    expect(free.id).not.toBe(s.id);
    expect(free.attemptId).toBeNull();
  });

  it("parallel step openings create exactly one session", async () => {
    const { actor, attemptId } = await started();
    const sessions = await Promise.all(Array.from({ length: 4 }, () => getOrCreateAttemptSession(testDb(), actor, attemptId, STEP)));
    expect(new Set(sessions.map((s) => s.id)).size).toBe(1);
    expect(await testDb().sandboxSession.count({ where: { attemptId } })).toBe(1);
  });

  it("uses the learner's own track when the module runs on it, else the module's first active track", async () => {
    const a = await started();
    expect((await getOrCreateAttemptSession(testDb(), a.actor, a.attemptId, STEP)).skinKey).toBe("chatgpt");

    const b = await started();
    const claude = await testDb().track.findUniqueOrThrow({ where: { key: "CLAUDE" } });
    await testDb().trackEnrollment.create({ data: { organizationId: b.actor.organizationId, userId: b.actor.userId, trackId: claude.id } });
    const s = await getOrCreateAttemptSession(testDb(), b.actor, b.attemptId, STEP);
    expect(s).toMatchObject({ trackId: claude.id, skinKey: "claude" });
  });

  it("is owner-checked: other users, other orgs and closed attempts are refused", async () => {
    const { actor, attemptId } = await started();
    const stranger = await learner();
    await expect(getOrCreateAttemptSession(testDb(), stranger, attemptId, STEP)).rejects.toMatchObject({ code: "ATTEMPT_NOT_FOUND", status: 404 });
    // Same user, but acting in another organization.
    const otherOrg = await makeOrg("BUSINESS");
    await addMember(otherOrg.id, actor.userId, "LEARNER");
    await expect(getOrCreateAttemptSession(testDb(), { userId: actor.userId, organizationId: otherOrg.id }, attemptId, STEP)).rejects.toMatchObject({ code: "ATTEMPT_NOT_FOUND" });
    expect(await testDb().sandboxSession.count({ where: { attemptId } })).toBe(0);

    await testDb().attempt.update({ where: { id: attemptId }, data: { status: "COMPLETED" } });
    await expect(getOrCreateAttemptSession(testDb(), actor, attemptId, STEP)).rejects.toMatchObject({ code: "ATTEMPT_CLOSED", status: 409 });
  });

  it("only opens for sandbox steps of the attempt's module", async () => {
    const { actor, attemptId } = await started();
    await expect(getOrCreateAttemptSession(testDb(), actor, attemptId, "bedste-prompt")).rejects.toMatchObject({ code: "INVALID_STEP", status: 400 }); // QUIZ
    await expect(getOrCreateAttemptSession(testDb(), actor, attemptId, "findes-ikke")).rejects.toMatchObject({ code: "INVALID_STEP" });
  });

  it("entering a step with another scene appends SESSION_RESET{MODULE_START}", async () => {
    const { actor, attemptId } = await started();
    const s = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    await testDb().sandboxSession.update({ where: { id: s.id }, data: { sceneId: "mail-basic" } }); // as if a previous step had another scene
    const again = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    expect(again).toMatchObject({ id: s.id, sceneId: "chat-basic" });
    const reset = (await events(s.id)).filter((e) => e.type === "SESSION_RESET");
    expect(reset).toHaveLength(1);
    expect(reset[0]).toMatchObject({ actor: "SYSTEM", stepId: STEP, payload: { reason: "MODULE_START" } });
    // Same scene again: no further reset.
    await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    expect((await events(s.id)).filter((e) => e.type === "SESSION_RESET")).toHaveLength(1);
  });
});

describe("step ids on sandbox events are validated server-side", () => {
  it("rejects a step id on a free-play session and a non-sandbox step id on an attempt session", async () => {
    const { actor, attemptId } = await started();
    const free = await getOrCreateFreePlaySession(testDb(), actor, "CHATGPT");
    await expect(applyIntent(testDb(), actor, free, { event: { type: "MAIL_OPENED", stepId: STEP, payload: { mailId: "m01" } } })).rejects.toMatchObject({ code: "INVALID_STEP" });
    const s = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    await expect(applyIntent(testDb(), actor, s, { event: { type: "MAIL_OPENED", stepId: "bedste-prompt", payload: { mailId: "m01" } } })).rejects.toMatchObject({ code: "INVALID_STEP" });
    await expect(verifySessionStep(testDb(), actor, s, "findes-ikke")).rejects.toMatchObject({ code: "INVALID_STEP" });
    expect(await verifySessionStep(testDb(), actor, s, undefined)).toBeUndefined();
    expect((await events(s.id)).map((e) => e.type)).toEqual(["SESSION_STARTED"]);

    await applyIntent(testDb(), actor, s, { event: { type: "MAIL_OPENED", stepId: STEP, payload: { mailId: "m01" } } });
    expect((await events(s.id)).at(-1)).toMatchObject({ type: "MAIL_OPENED", stepId: STEP });
  });

  it("chat refuses an invalid step id before any model call", async () => {
    const { actor, attemptId } = await started();
    const s = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    const noGateway = {} as Gateway; // never reached
    await expect(prepareChat(testDb(), noGateway, actor, s, { message: "Hej", attachmentFileIds: [], piiOverride: false, stepId: "maa-du" })).rejects.toMatchObject({ code: "INVALID_STEP" });
    const free = await getOrCreateFreePlaySession(testDb(), actor, "CHATGPT");
    await expect(prepareChat(testDb(), noGateway, actor, free, { message: "Hej", attachmentFileIds: [], piiOverride: false, stepId: STEP })).rejects.toMatchObject({ code: "INVALID_STEP" });
  });
});

describe("CLICK_TASK with the real evaluator", () => {
  it("returns NOT_YET until the right events are tagged with the step, then passes", async () => {
    const { actor, attemptId } = await started();
    const s = await getOrCreateAttemptSession(testDb(), actor, attemptId, STEP);
    expect(await checkClickTask(testDb(), deps, actor, attemptId, STEP)).toEqual({ notice: "CLICK_NOT_YET" });

    await applyIntent(testDb(), actor, s, { event: { type: "UI_CLICKED", target: "nav.new-chat", stepId: STEP, payload: { region: "nav", control: "new-chat" } } });
    expect(await checkClickTask(testDb(), deps, actor, attemptId, STEP)).toEqual({ notice: "CLICK_NOT_YET" });

    await solve(actor, attemptId);
    expect(await checkClickTask(testDb(), deps, actor, attemptId, STEP)).toEqual({});
    const attached = await testDb().sandboxEvent.findFirstOrThrow({ where: { sessionId: s.id, type: "CHAT_FILE_ATTACHED" } });
    const r = await testDb().stepResult.findUniqueOrThrow({ where: { attemptId_stepId: { attemptId, stepId: STEP } } });
    expect(r).toMatchObject({ passed: true, points: 10, matchedSandboxEventId: attached.id });
  });

  it("untagged events (no step id) never count", async () => {
    const { actor, attemptId } = await started();
    await solve(actor, attemptId, { tagged: false });
    expect(await checkClickTask(testDb(), deps, actor, attemptId, STEP)).toEqual({ notice: "CLICK_NOT_YET" });
  });

  it("'Nulstil' inside the task is SESSION_RESET{STEP_RETRY}; only events after it count", async () => {
    const { actor, attemptId } = await started();
    const solved = await solve(actor, attemptId);
    await applyIntent(testDb(), actor, solved, { event: { type: "SESSION_RESET", stepId: STEP, payload: { reason: "USER" } } });
    const reset = (await events(solved.id)).at(-1);
    expect(reset).toMatchObject({ type: "SESSION_RESET", actor: "SYSTEM", stepId: STEP, payload: { reason: "STEP_RETRY" } });
    expect(await checkClickTask(testDb(), deps, actor, attemptId, STEP)).toEqual({ notice: "CLICK_NOT_YET" });

    await solve(actor, attemptId);
    expect(await checkClickTask(testDb(), deps, actor, attemptId, STEP)).toEqual({});
  });

});
