import { beforeAll, describe, expect, it } from "vitest";
import { seedAll } from "@/server/content/seed";
import { purgePromptText } from "@/server/jobs/retention-purge-prompt-text";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  await seedAll(testDb());
});

async function fixture() {
  const user = await makeUser();
  const org = await makeOrg("PERSONAL");
  await addMember(org.id, user.id, "OWNER");
  const version = await testDb().moduleVersion.findFirstOrThrow({ where: { module: { slug: "core-prompt-01" } } });
  const attempt = await testDb().attempt.create({ data: { organizationId: org.id, userId: user.id, moduleVersionId: version.id, maxPoints: 100 } });
  const track = await testDb().track.findUniqueOrThrow({ where: { key: "CHATGPT" } });
  const session = await testDb().sandboxSession.create({
    data: { userId: user.id, organizationId: org.id, trackId: track.id, skinKey: "chatgpt", worldVersion: "1", attemptId: attempt.id, state: {}, expiresAt: new Date(Date.now() + DAY) },
  });
  return { user, org, attempt, session };
}

describe("retention.purge-prompt-text", () => {
  it("nulls prompt text and AI feedback older than 30 days, sets promptTextPurgedAt and keeps scores", async () => {
    const { attempt, session, user, org } = await fixture();
    const now = new Date();
    const old = new Date(now.getTime() - 31 * DAY);
    const fresh = new Date(now.getTime() - 29 * DAY);
    const rubricScores = [{ criterionId: "opgave", score: 2 }];
    const oldRow = await testDb().stepResult.create({
      data: { attemptId: attempt.id, stepId: "prompt-svarmail", stepType: "PROMPT_TASK", maxPoints: 35, points: 27, passed: true, promptText: "gammel prompt", aiFeedback: "{}", rubricScores, rubricVersion: "v1", modelId: "m", createdAt: old },
    });
    const freshRow = await testDb().stepResult.create({
      data: { attemptId: attempt.id, stepId: "x-fresh", stepType: "PROMPT_TASK", maxPoints: 35, points: 30, passed: true, promptText: "ny prompt", aiFeedback: "{}", createdAt: fresh },
    });
    const oldEvent = await testDb().sandboxEvent.create({ data: { sessionId: session.id, userId: user.id, organizationId: org.id, seq: 1, type: "CHAT_MESSAGE_SENT", payload: { length: 5 }, contentText: "gammel chat", createdAt: old } });
    const freshEvent = await testDb().sandboxEvent.create({ data: { sessionId: session.id, userId: user.id, organizationId: org.id, seq: 2, type: "CHAT_MESSAGE_SENT", payload: {}, contentText: "ny chat", createdAt: fresh } });

    const result = await purgePromptText(testDb(), now);
    expect(result.stepResults).toBeGreaterThanOrEqual(1);
    expect(result.sandboxEvents).toBeGreaterThanOrEqual(1);

    const text = (id: string) => testDb().stepResult.findUniqueOrThrow({ where: { id }, omit: { promptText: false, aiFeedback: false } });
    const purged = await text(oldRow.id);
    expect(purged).toMatchObject({ promptText: null, aiFeedback: null, points: 27, passed: true, rubricVersion: "v1", modelId: "m", rubricScores });
    expect(purged.promptTextPurgedAt).toEqual(now);
    expect(await text(freshRow.id)).toMatchObject({ promptText: "ny prompt", promptTextPurgedAt: null });

    const ev = (id: string) => testDb().sandboxEvent.findUniqueOrThrow({ where: { id }, omit: { contentText: false } });
    expect(await ev(oldEvent.id)).toMatchObject({ contentText: null, payload: { length: 5 } });
    expect((await ev(oldEvent.id)).contentPurgedAt).toEqual(now);
    expect(await ev(freshEvent.id)).toMatchObject({ contentText: "ny chat", contentPurgedAt: null });
  });

  it("is idempotent: a second run purges nothing new and keeps the first purge date", async () => {
    const { attempt } = await fixture();
    const now = new Date();
    const row = await testDb().stepResult.create({
      data: { attemptId: attempt.id, stepId: "prompt-svarmail", stepType: "PROMPT_TASK", maxPoints: 35, promptText: "x", createdAt: new Date(now.getTime() - 40 * DAY) },
    });
    await purgePromptText(testDb(), now);
    const second = await purgePromptText(testDb(), new Date(now.getTime() + 1000));
    expect(second.stepResults).toBe(0);
    const after = await testDb().stepResult.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.promptTextPurgedAt).toEqual(now);
  });
});
