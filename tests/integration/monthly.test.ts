import { describe, expect, it } from "vitest";
import { assignCycleBatch, composeCycles, syncMonthlyProgress } from "@/server/modules/monthly-cycle";
import { copenhagenInstant, monthRange, parseMonthKey, previousMonthKey } from "@/server/modules/monthly-clock";
import { sendMonthlyReminders } from "@/server/modules/monthly-reminders";
import type { EmailTransport, OutgoingEmail } from "@/server/email/transports";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";
import { ensureTrack, makeEntitledOrg, makeLearner, makeModule, makeSubscription, uniqueMonth } from "./monthly-fixtures";

function captureTransport() {
  const sent: OutgoingEmail[] = [];
  const transport: EmailTransport = { name: "capture", send: async (m) => (sent.push(m), { providerId: null }) };
  return { sent, transport };
}
const sendOpts = (transport: EmailTransport) => ({ transport, enforceAllowlist: false });
const dayIn = (month: string, day: number) => {
  const { year, month: m } = parseMonthKey(month);
  return copenhagenInstant(year, m, day, 8);
};

async function setup(opts: { minutes?: number[] } = {}) {
  const track = await ensureTrack("CHATGPT");
  const month = uniqueMonth();
  const inPrev = new Date(monthRange(previousMonthKey(month)).start.getTime() + 3 * 86_400_000);
  const news = [];
  for (const [i, minutes] of (opts.minutes ?? [4, 4]).entries()) news.push(await makeModule(track.id, { minutes, publishedAt: inPrev, sortOrder: i }));
  return { track, month, news };
}

describe("monthly.compose-cycles + monthly.assign-users", () => {
  it("composes one cycle per active track with last month's NEWS, idempotently", async () => {
    const { track, month, news } = await setup();
    const otherMonth = await makeModule(track.id, { publishedAt: monthRange(month).start }); // published IN the cycle month → next cycle
    const first = await composeCycles(testDb(), { month });
    const cycle = first.find((c) => c.trackId === track.id);
    expect(cycle?.created).toBe(true);
    expect(cycle?.moduleIds).toEqual(news.map((n) => n.id));
    expect(cycle?.moduleIds).not.toContain(otherMonth.id);

    const again = await composeCycles(testDb(), { month });
    expect(again.find((c) => c.trackId === track.id)).toMatchObject({ cycleId: cycle?.cycleId, created: false });
    expect(await testDb().monthlyCycle.count({ where: { month, trackId: track.id } })).toBe(1);
  });

  it("assigns entitled learners (≤ 15 min) once, skips FREE orgs and deactivated seats", async () => {
    const { track, month, news } = await setup({ minutes: [6, 6, 6] });
    const org = await makeEntitledOrg();
    const learner = await makeLearner(org.id, track.id);
    const gone = await makeLearner(org.id, track.id);
    await testDb().membership.updateMany({ where: { userId: gone.id, organizationId: org.id }, data: { deactivatedAt: new Date() } });
    const freeOrg = await makeOrg("PERSONAL");
    const freeUser = await makeLearner(freeOrg.id, track.id);
    const pastDueOrg = await makeOrg("BUSINESS");
    await makeSubscription(pastDueOrg.id, "CANCELED");
    const lapsedUser = await makeLearner(pastDueOrg.id, track.id);

    // A refresher candidate: a module the learner passed long ago.
    const old = await makeModule(track.id, { type: "CORE", minutes: 3, publishedAt: new Date("2026-01-01T00:00:00Z") });
    await testDb().assignment.create({ data: { organizationId: org.id, userId: learner.id, moduleId: old.id, source: "PLACEMENT", status: "PASSED", passedAt: new Date("2026-02-01T00:00:00Z") } });

    const [cycle] = (await composeCycles(testDb(), { month })).filter((c) => c.trackId === track.id);
    if (!cycle) throw new Error("no cycle");
    const run = async () => {
      let cursor: string | null = null;
      do cursor = (await assignCycleBatch(testDb(), { cycleId: cycle.cycleId, cursor, batchSize: 50 })).nextCursor;
      while (cursor);
    };
    await run();
    await run(); // idempotent

    const mine = await testDb().monthlyAssignment.findMany({ where: { cycleId: cycle.cycleId, userId: { in: [learner.id, gone.id, freeUser.id, lapsedUser.id] } } });
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ userId: learner.id, organizationId: org.id, refresherModuleId: old.id, moduleIds: [news[0]?.id, news[1]?.id], estimatedMinutes: 15, status: "PENDING" });
    // NEWS modules show up in the learner's list as MONTHLY assignments (once).
    expect(await testDb().assignment.count({ where: { userId: learner.id, organizationId: org.id, source: "MONTHLY" } })).toBe(2);
  });

  it("marks the package COMPLETED when the NEWS are passed and the refresher is retaken", async () => {
    const { track, month, news } = await setup({ minutes: [4] });
    const org = await makeEntitledOrg();
    const learner = await makeLearner(org.id, track.id);
    const old = await makeModule(track.id, { type: "CORE", minutes: 3 });
    await testDb().assignment.create({ data: { organizationId: org.id, userId: learner.id, moduleId: old.id, source: "PLACEMENT", status: "PASSED", passedAt: new Date("2026-02-01T00:00:00Z") } });
    const [cycle] = (await composeCycles(testDb(), { month })).filter((c) => c.trackId === track.id);
    await assignCycleBatch(testDb(), { cycleId: cycle?.cycleId ?? "", batchSize: 1000 });
    const actor = { userId: learner.id, organizationId: org.id };

    await testDb().assignment.updateMany({ where: { ...actor, moduleId: news[0]?.id }, data: { status: "PASSED", passedAt: new Date() } });
    await syncMonthlyProgress(testDb(), actor);
    expect((await testDb().monthlyAssignment.findFirstOrThrow({ where: actor })).status).toBe("IN_PROGRESS");

    await testDb().attempt.create({ data: { ...actor, moduleVersionId: old.versionId, status: "COMPLETED", maxPoints: 10, completedAt: new Date() } });
    expect(await syncMonthlyProgress(testDb(), actor)).toBe(1);
    expect(await testDb().monthlyAssignment.findFirstOrThrow({ where: actor })).toMatchObject({ status: "COMPLETED" });
  });
});

describe("monthly.reminders", () => {
  async function assigned() {
    const { track, month } = await setup({ minutes: [4] });
    const org = await makeEntitledOrg();
    const active = await makeLearner(org.id, track.id);
    const optedOut = await makeLearner(org.id, track.id, { remindersEnabled: false });
    const done = await makeLearner(org.id, track.id);
    const [cycle] = (await composeCycles(testDb(), { month })).filter((c) => c.trackId === track.id);
    await assignCycleBatch(testDb(), { cycleId: cycle?.cycleId ?? "", batchSize: 1000 });
    await testDb().monthlyAssignment.updateMany({ where: { userId: done.id }, data: { status: "COMPLETED", completedAt: new Date() } });
    return { month, active, optedOut, done, org };
  }

  it("sends day 1/14/25 only to non-completed learners who did not opt out — idempotently", async () => {
    const { month, active, optedOut, done } = await assigned();
    const { sent: all, transport } = captureTransport();
    // Other test learners on the same track also got this month's package — only look at ours.
    const mine = () => all.filter((m) => [active.email, optedOut.email, done.email].includes(m.to));

    const day1 = await sendMonthlyReminders(testDb(), { now: dayIn(month, 1), send: sendOpts(transport), batchSize: 1000 });
    expect(day1.day).toBe(1);
    expect(mine().map((m) => m.to)).toEqual([active.email]);
    expect(mine()[0]?.template).toBe("monthly-training-d1");
    expect(mine()[0]?.text).toContain("/moduler");
    expect(mine().some((m) => m.to === optedOut.email || m.to === done.email)).toBe(false);

    // Same day again (cron retry): nothing new.
    await sendMonthlyReminders(testDb(), { now: dayIn(month, 1), send: sendOpts(transport), batchSize: 1000 });
    expect(mine()).toHaveLength(1);
    // Other days: nothing.
    expect((await sendMonthlyReminders(testDb(), { now: dayIn(month, 2), send: sendOpts(transport) })).day).toBeNull();
    expect(mine()).toHaveLength(1);

    await sendMonthlyReminders(testDb(), { now: dayIn(month, 14), send: sendOpts(transport), batchSize: 1000 });
    await sendMonthlyReminders(testDb(), { now: dayIn(month, 14), send: sendOpts(transport), batchSize: 1000 });
    expect(mine().map((m) => m.template)).toEqual(["monthly-training-d1", "monthly-training-d14"]);

    const ma = await testDb().monthlyAssignment.findFirstOrThrow({ where: { userId: active.id } });
    expect(ma.reminderDay1SentAt).not.toBeNull();
    expect(ma.reminderDay14SentAt).not.toBeNull();
    expect(await testDb().emailMessage.count({ where: { idempotencyKey: { in: [`reminder:${ma.id}:1`, `reminder:${ma.id}:14`] } } })).toBe(2);
  });

  it("stops once the package is completed or the learner switches reminders off", async () => {
    const { month, active, done } = await assigned();
    const { sent, transport } = captureTransport();
    await testDb().user.update({ where: { id: active.id }, data: { trainingRemindersEnabled: false } });
    await sendMonthlyReminders(testDb(), { now: dayIn(month, 25), send: sendOpts(transport), batchSize: 1000 });
    expect(sent.filter((m) => m.to === active.email || m.to === done.email)).toHaveLength(0);
  });

  it("does not remind a learner whose org lost the monthly entitlement", async () => {
    const { track, month } = await setup({ minutes: [4] });
    const org = await makeOrg("BUSINESS");
    const sub = await makeSubscription(org.id, "ACTIVE");
    const user = await makeUser();
    await addMember(org.id, user.id, "LEARNER");
    await testDb().trackEnrollment.create({ data: { organizationId: org.id, userId: user.id, trackId: track.id } });
    const [cycle] = (await composeCycles(testDb(), { month })).filter((c) => c.trackId === track.id);
    await assignCycleBatch(testDb(), { cycleId: cycle?.cycleId ?? "", batchSize: 1000 });
    await testDb().subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", endedAt: new Date("2020-01-01T00:00:00Z") } });
    const { sent, transport } = captureTransport();
    await sendMonthlyReminders(testDb(), { now: dayIn(month, 14), send: sendOpts(transport), batchSize: 1000 });
    expect(sent.filter((m) => m.to === user.email)).toHaveLength(0);
  });
});
