import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { addDays, addMonths, cph, cphToUtc, dowOf, loadRange, monthGrid, weekStartOf } from "@/lib/calendar";
import { createEventInput, deleteEventInput, rangeInput, spanError, updateEventInput } from "@/lib/schemas/calendar";
import { deleteEvent, lessonBlock, listCalendar, practiceBlock, updateEvent } from "@/server/calendar/service";

// Kalender: date model (Europe/Copenhagen), strict action input, computed activity and owner scoping.

const owner = { userId: "user-a", organizationId: "org-a" };
const ID = "ckx1y2z3a0000abcd1234efgh";

describe("Copenhagen date model", () => {
  it("converts wall-clock time to UTC in winter and summer", () => {
    expect(cphToUtc("2026-11-17", 9 * 60).toISOString()).toBe("2026-11-17T08:00:00.000Z");
    expect(cphToUtc("2026-07-01", 9 * 60).toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(cph(new Date("2026-11-17T08:00:00Z"))).toEqual({ day: "2026-11-17", min: 540 });
    expect(cph(new Date("2026-11-16T23:30:00Z"))).toEqual({ day: "2026-11-17", min: 30 });
  });

  it("handles the DST switches and minutes past midnight", () => {
    expect(cphToUtc("2026-03-29", 4 * 60).toISOString()).toBe("2026-03-29T02:00:00.000Z"); // after spring forward
    expect(cphToUtc("2026-10-25", 4 * 60).toISOString()).toBe("2026-10-25T03:00:00.000Z"); // after fall back
    expect(cphToUtc("2026-11-17", 1440).toISOString()).toBe("2026-11-17T23:00:00.000Z");
    for (const day of ["2026-03-29", "2026-10-25", "2026-12-31"]) {
      for (const min of [0, 75, 600, 1425]) {
        const back = cph(cphToUtc(day, min));
        if (!(day === "2026-03-29" && min >= 120 && min < 180)) expect(back).toEqual({ day, min });
      }
    }
  });

  it("does day, week and month arithmetic", () => {
    expect(dowOf("2026-11-17")).toBe(1); // Tuesday
    expect(weekStartOf("2026-11-17")).toBe("2026-11-16");
    expect(weekStartOf("2026-11-16")).toBe("2026-11-16");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(monthGrid("2026-11-17")).toEqual({ start: "2026-10-26", weeks: 6 }); // 1 Nov 2026 is a Sunday
    expect(monthGrid("2026-10-05")).toEqual({ start: "2026-09-28", weeks: 5 });
    expect(monthGrid("2027-02-10")).toEqual({ start: "2027-02-01", weeks: 5 }); // four weeks, padded to five
  });

  it("loads six weeks from the month grid's Monday, within the allowed range", () => {
    const r = loadRange("2026-11-17");
    expect(r.from.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-12-06T23:00:00.000Z");
    expect(rangeInput.safeParse({ from: r.from.toISOString(), to: r.to.toISOString() }).success).toBe(true);
  });
});

describe("action input", () => {
  const base = { title: "Prompts til tekst", type: "LESSON", startsAt: "2026-11-17T08:00:00.000Z", endsAt: "2026-11-17T08:30:00.000Z" };

  it("accepts a valid event and trims the title", () => {
    const r = createEventInput.parse({ ...base, title: "  Prompts  ", href: "/forloeb/chatgpt/x" });
    expect(r.title).toBe("Prompts");
    expect(r.startsAt).toBeInstanceOf(Date);
  });

  it("rejects unknown fields (strict)", () => {
    expect(createEventInput.safeParse({ ...base, userId: "someone-else" }).success).toBe(false);
    expect(updateEventInput.safeParse({ id: ID, title: "x", organizationId: "org-b" }).success).toBe(false);
    expect(deleteEventInput.safeParse({ id: ID, userId: "x" }).success).toBe(false);
    expect(rangeInput.safeParse({ from: base.startsAt, to: base.endsAt, all: true }).success).toBe(false);
  });

  it("enforces title length, type, end after start and max 12 hours", () => {
    expect(createEventInput.safeParse({ ...base, title: "" }).success).toBe(false);
    expect(createEventInput.safeParse({ ...base, title: "x".repeat(121) }).success).toBe(false);
    expect(createEventInput.safeParse({ ...base, type: "PARTY" }).success).toBe(false);
    expect(createEventInput.safeParse({ ...base, endsAt: base.startsAt }).success).toBe(false);
    expect(createEventInput.safeParse({ ...base, endsAt: "2026-11-17T20:00:00.000Z" }).success).toBe(true); // exactly 12 h
    expect(createEventInput.safeParse({ ...base, endsAt: "2026-11-17T20:15:00.000Z" }).success).toBe(false);
    expect(spanError(new Date(0), new Date(-1))).toBe("ENDS_BEFORE_START");
  });

  it("accepts only internal paths as href", () => {
    for (const href of ["https://evil.example", "//evil.example", "javascript:alert(1)", "/a b"]) {
      expect(createEventInput.safeParse({ ...base, href }).success, href).toBe(false);
    }
    expect(createEventInput.safeParse({ ...base, href: null }).success).toBe(true);
  });

  it("needs at least one change on update and checks a full span", () => {
    expect(updateEventInput.safeParse({ id: ID }).success).toBe(false);
    expect(updateEventInput.safeParse({ id: ID, endsAt: base.endsAt }).success).toBe(true);
    expect(updateEventInput.safeParse({ id: ID, startsAt: base.endsAt, endsAt: base.startsAt }).success).toBe(false);
    expect(updateEventInput.safeParse({ id: "../x", title: "x" }).success).toBe(false);
  });

  it("limits a range to 62 days", () => {
    expect(rangeInput.safeParse({ from: "2026-01-01T00:00:00Z", to: "2026-03-05T00:00:00Z" }).success).toBe(false);
    expect(rangeInput.safeParse({ from: "2026-01-02T00:00:00Z", to: "2026-01-01T00:00:00Z" }).success).toBe(false);
  });
});

describe("computed activity", () => {
  it("a completed lesson ends at completedAt and lasts the lesson's minutes", () => {
    const b = lessonBlock({ id: "c1", completedAt: new Date("2026-11-17T09:00:00Z"), lesson: { slug: "chatgpt-l01-01", title: "Din første prompt", minutes: 6 }, course: { slug: "chatgpt" } });
    expect(b).toMatchObject({ type: "LESSON", title: "Din første prompt", startsAt: "2026-11-17T08:54:00.000Z", endsAt: "2026-11-17T09:00:00.000Z", href: "/forloeb/chatgpt/chatgpt-l01-01", done: true });
  });

  it("an øvemiljø session runs to its last activity, capped at 12 hours", () => {
    const start = new Date("2026-11-17T09:00:00Z");
    const s = practiceBlock({ id: "s1", createdAt: start, lastActivityAt: new Date("2026-11-17T09:40:00Z"), track: { displayName: "Microsoft 365 Copilot" } });
    expect(s).toMatchObject({ type: "PRACTICE", title: "Øvemiljø: Copilot", endsAt: "2026-11-17T09:40:00.000Z", href: "/sandkasse", done: true });
    const long = practiceBlock({ id: "s2", createdAt: start, lastActivityAt: new Date("2026-11-20T09:00:00Z"), track: { displayName: "ChatGPT" } });
    expect(long.endsAt).toBe("2026-11-17T21:00:00.000Z");
  });
});

describe("owner scoping", () => {
  function fakeDb(row: unknown = null) {
    const calls: Record<string, unknown[]> = {};
    const rec = (name: string, value: unknown) => vi.fn(async (args: unknown) => ((calls[name] ??= []).push(args), value));
    const db = {
      calendarEvent: { findMany: rec("events", []), findFirst: rec("findFirst", row), updateMany: rec("updateMany", { count: 1 }), deleteMany: rec("deleteMany", { count: 0 }) },
      courseLessonCompletion: { findMany: rec("lessons", []) },
      sandboxSession: { findMany: rec("sessions", []) },
    };
    return { db: db as unknown as PrismaClient, calls };
  }
  const whereOf = (args: unknown) => (args as { where: Record<string, unknown> }).where;

  it("lists only the owner's rows in the active org", async () => {
    const { db, calls } = fakeDb();
    await listCalendar(db, owner, { from: new Date("2026-11-16T00:00:00Z"), to: new Date("2026-11-23T00:00:00Z") });
    for (const k of ["events", "lessons", "sessions"]) expect(whereOf(calls[k][0])).toMatchObject(owner);
    expect(whereOf(calls.sessions[0])).toMatchObject({ attemptId: null });
  });

  it("filters computed activity to the range", async () => {
    const { db } = fakeDb();
    (db.courseLessonCompletion.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      { id: "in", completedAt: new Date("2026-11-17T10:00:00Z"), lesson: { slug: "a", title: "A", minutes: 5 }, course: { slug: "chatgpt" } },
      { id: "out", completedAt: new Date("2026-11-23T05:00:00Z"), lesson: { slug: "b", title: "B", minutes: 5 }, course: { slug: "chatgpt" } },
    ]);
    const items = await listCalendar(db, owner, { from: new Date("2026-11-16T00:00:00Z"), to: new Date("2026-11-23T00:00:00Z") });
    expect(items.map((i) => i.id)).toEqual(["lesson-in"]);
  });

  it("update and delete look the event up by id AND owner; someone else's id is not found", async () => {
    const { db, calls } = fakeDb(null);
    expect(await updateEvent(db, owner, { id: ID, title: "x" })).toEqual({ ok: false, error: "NOT_FOUND" });
    expect(whereOf(calls.findFirst[0])).toEqual({ id: ID, ...owner });
    expect(calls.updateMany).toBeUndefined();
    expect(await deleteEvent(db, owner, ID)).toBe(false);
    expect(whereOf(calls.deleteMany[0])).toEqual({ id: ID, ...owner });
  });

  it("checks a resize against the stored start (max 12 hours)", async () => {
    const row = { id: ID, ...owner, title: "A", type: "LESSON", startsAt: new Date("2026-11-17T08:00:00Z"), endsAt: new Date("2026-11-17T09:00:00Z"), href: null };
    const { db, calls } = fakeDb(row);
    expect(await updateEvent(db, owner, { id: ID, endsAt: new Date("2026-11-17T21:00:00Z") })).toEqual({ ok: false, error: "INVALID" });
    const ok = await updateEvent(db, owner, { id: ID, endsAt: new Date("2026-11-17T10:00:00Z") });
    expect(ok).toMatchObject({ ok: true, item: { endsAt: "2026-11-17T10:00:00.000Z", startsAt: "2026-11-17T08:00:00.000Z" } });
    expect(whereOf(calls.updateMany[0])).toEqual({ id: ID, ...owner });
  });
});
