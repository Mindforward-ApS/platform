import { afterAll, describe, expect, it } from "vitest";
import { createEventInput } from "@/lib/schemas/calendar";
import { createEvent, deleteEvent, listCalendar, updateEvent } from "@/server/calendar/service";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Kalender: create / update / delete only ever touch the owner's own events in their active org.

const users: string[] = [];
const orgs: string[] = [];
async function learner(orgId?: string) {
  const org = orgId ? { id: orgId } : await makeOrg("BUSINESS");
  const user = await makeUser();
  await addMember(org.id, user.id, "LEARNER");
  users.push(user.id);
  if (!orgId) orgs.push(org.id);
  return { userId: user.id, organizationId: org.id };
}
const input = (over: Record<string, unknown> = {}) =>
  createEventInput.parse({ title: "Prompts til tekst", type: "LESSON", startsAt: "2026-11-17T08:00:00.000Z", endsAt: "2026-11-17T08:30:00.000Z", ...over });
const week = { from: new Date("2026-11-16T00:00:00Z"), to: new Date("2026-11-23T00:00:00Z") };

afterAll(async () => {
  // Rows are random-id test data; remove them (cascades the calendar events).
  await testDb().user.deleteMany({ where: { id: { in: users } } });
  await testDb().organization.deleteMany({ where: { id: { in: orgs } } });
});

describe("calendar events", () => {
  it("creates, moves, resizes, renames and deletes the owner's own event", async () => {
    const me = await learner();
    const ev = await createEvent(testDb(), me, input());
    expect(ev).toMatchObject({ title: "Prompts til tekst", type: "LESSON", href: "/forloeb", done: false });
    expect((await listCalendar(testDb(), me, week)).map((i) => i.id)).toEqual([ev.id]);

    const moved = await updateEvent(testDb(), me, { id: ev.id, startsAt: new Date("2026-11-18T10:00:00Z"), endsAt: new Date("2026-11-18T10:30:00Z") });
    expect(moved).toMatchObject({ ok: true, item: { startsAt: "2026-11-18T10:00:00.000Z" } });
    expect(await updateEvent(testDb(), me, { id: ev.id, endsAt: new Date("2026-11-18T11:15:00Z") })).toMatchObject({ ok: true });
    expect(await updateEvent(testDb(), me, { id: ev.id, endsAt: new Date("2026-11-18T23:00:00Z") })).toEqual({ ok: false, error: "INVALID" });
    expect(await updateEvent(testDb(), me, { id: ev.id, title: "Ny titel" })).toMatchObject({ ok: true, item: { title: "Ny titel" } });

    const row = await testDb().calendarEvent.findUniqueOrThrow({ where: { id: ev.id } });
    expect(row).toMatchObject({ title: "Ny titel", startsAt: new Date("2026-11-18T10:00:00Z"), endsAt: new Date("2026-11-18T11:15:00Z") });
    expect(await deleteEvent(testDb(), me, ev.id)).toBe(true);
    expect(await testDb().calendarEvent.count({ where: { id: ev.id } })).toBe(0);
  });

  it("another user — in the same org or another org — cannot see, change or delete it", async () => {
    const me = await learner();
    const colleague = await learner(me.organizationId);
    const stranger = await learner();
    const ev = await createEvent(testDb(), me, input());

    for (const other of [colleague, stranger]) {
      expect(await listCalendar(testDb(), other, week)).toEqual([]);
      expect(await updateEvent(testDb(), other, { id: ev.id, title: "Hacked" })).toEqual({ ok: false, error: "NOT_FOUND" });
      expect(await deleteEvent(testDb(), other, ev.id)).toBe(false);
    }
    // The same user acting in another org does not reach it either.
    expect(await deleteEvent(testDb(), { userId: me.userId, organizationId: stranger.organizationId }, ev.id)).toBe(false);

    const row = await testDb().calendarEvent.findUniqueOrThrow({ where: { id: ev.id } });
    expect(row.title).toBe("Prompts til tekst");
  });

  it("is erased with the member's data in that org", async () => {
    const { eraseMemberFromOrg } = await import("@/server/orgs/members");
    const org = await makeOrg("BUSINESS");
    orgs.push(org.id);
    const owner = await makeUser();
    users.push(owner.id);
    await addMember(org.id, owner.id, "OWNER");
    const me = await learner(org.id);
    await createEvent(testDb(), me, input());
    const m = await testDb().membership.findFirstOrThrow({ where: { organizationId: org.id, userId: me.userId } });
    await eraseMemberFromOrg(testDb(), { organizationId: org.id, actorUserId: owner.id }, m.id);
    expect(await testDb().calendarEvent.count({ where: me })).toBe(0);
  });
});
