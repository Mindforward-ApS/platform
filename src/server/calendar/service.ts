import "server-only";
import type { CalendarEvent, PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_HREF, type CalendarItem } from "@/lib/calendar";
import { CALENDAR_MAX_MINUTES, spanError, type CreateEventInput, type UpdateEventInput } from "@/lib/schemas/calendar";
import type { Owner } from "@/server/courses/service";
import { toolName } from "@/server/platform/views";

// Kalender (/kalender): the learner's own planned blocks (CalendarEvent) plus read-only activity computed from
// forløb lesson completions and øvemiljø sessions. Every query is scoped to the owner (userId + organizationId).

const MAX_ROWS = 500;
const MAX_MS = CALENDAR_MAX_MINUTES * 60_000;

export interface Range {
  from: Date;
  to: Date;
}

export function eventItem(e: Pick<CalendarEvent, "id" | "title" | "type" | "startsAt" | "endsAt" | "href">): CalendarItem {
  return { id: e.id, title: e.title, type: e.type, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt.toISOString(), href: e.href, done: false };
}

/** A completed lesson: a block of the lesson's minutes ending when it was completed. */
export function lessonBlock(c: { id: string; completedAt: Date; lesson: { slug: string; title: string; minutes: number }; course: { slug: string } }): CalendarItem {
  const start = new Date(c.completedAt.getTime() - Math.max(1, c.lesson.minutes) * 60_000);
  return { id: `lesson-${c.id}`, title: c.lesson.title, type: "LESSON", startsAt: start.toISOString(), endsAt: c.completedAt.toISOString(), href: `/forloeb/${c.course.slug}/${c.lesson.slug}`, done: true };
}

/** An øvemiljø session from start to its last activity (capped at 12 h; sessions can stay open for days). */
export function practiceBlock(s: { id: string; createdAt: Date; lastActivityAt: Date; track: { displayName: string } }): CalendarItem {
  const end = new Date(Math.min(Math.max(s.lastActivityAt.getTime(), s.createdAt.getTime()), s.createdAt.getTime() + MAX_MS));
  return { id: `practice-${s.id}`, title: `Øvemiljø: ${toolName(s.track.displayName)}`, type: "PRACTICE", startsAt: s.createdAt.toISOString(), endsAt: end.toISOString(), href: "/sandkasse", done: true };
}

const overlaps = (i: CalendarItem, r: Range) => new Date(i.startsAt) < r.to && new Date(i.endsAt) > r.from;

/** Everything on the owner's calendar that overlaps the range, oldest first. */
export async function listCalendar(db: PrismaClient, owner: Owner, range: Range): Promise<CalendarItem[]> {
  const where = { userId: owner.userId, organizationId: owner.organizationId };
  const [events, lessons, sessions] = await Promise.all([
    db.calendarEvent.findMany({
      where: { ...where, startsAt: { lt: range.to, gt: new Date(range.from.getTime() - MAX_MS) }, endsAt: { gt: range.from } },
      select: { id: true, title: true, type: true, startsAt: true, endsAt: true, href: true },
      orderBy: { startsAt: "asc" },
      take: MAX_ROWS,
    }),
    db.courseLessonCompletion.findMany({
      where: { ...where, completedAt: { gt: range.from, lt: new Date(range.to.getTime() + MAX_MS) } },
      select: { id: true, completedAt: true, lesson: { select: { slug: true, title: true, minutes: true } }, course: { select: { slug: true } } },
      orderBy: { completedAt: "asc" },
      take: MAX_ROWS,
    }),
    db.sandboxSession.findMany({
      // Free practice only; sessions bound to a module attempt are tasks, not øvemiljø time.
      where: { ...where, attemptId: null, createdAt: { lt: range.to }, lastActivityAt: { gte: range.from } },
      select: { id: true, createdAt: true, lastActivityAt: true, track: { select: { displayName: true } } },
      orderBy: { createdAt: "asc" },
      take: MAX_ROWS,
    }),
  ]);
  return [...events.map(eventItem), ...lessons.map(lessonBlock), ...sessions.map(practiceBlock)]
    .filter((i) => overlaps(i, range))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function createEvent(db: PrismaClient, owner: Owner, input: CreateEventInput): Promise<CalendarItem> {
  const row = await db.calendarEvent.create({
    data: {
      userId: owner.userId,
      organizationId: owner.organizationId,
      title: input.title,
      type: input.type,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      href: input.href === undefined ? DEFAULT_HREF[input.type] : input.href,
    },
  });
  return eventItem(row);
}

export type UpdateResult = { ok: true; item: CalendarItem } | { ok: false; error: "NOT_FOUND" | "INVALID" };

/** Move, resize, rename or retype one of the owner's own events. Another user's id is NOT_FOUND. */
export async function updateEvent(db: PrismaClient, owner: Owner, input: UpdateEventInput): Promise<UpdateResult> {
  const where = { id: input.id, userId: owner.userId, organizationId: owner.organizationId };
  const row = await db.calendarEvent.findFirst({ where });
  if (!row) return { ok: false, error: "NOT_FOUND" };
  const next = {
    title: input.title ?? row.title,
    type: input.type ?? row.type,
    startsAt: input.startsAt ?? row.startsAt,
    endsAt: input.endsAt ?? row.endsAt,
  };
  if (spanError(next.startsAt, next.endsAt)) return { ok: false, error: "INVALID" };
  const { count } = await db.calendarEvent.updateMany({ where, data: next });
  if (count === 0) return { ok: false, error: "NOT_FOUND" };
  return { ok: true, item: eventItem({ ...row, ...next }) };
}

/** Deletes one of the owner's own events; false when it is not theirs or already gone. */
export async function deleteEvent(db: PrismaClient, owner: Owner, id: string): Promise<boolean> {
  const { count } = await db.calendarEvent.deleteMany({ where: { id, userId: owner.userId, organizationId: owner.organizationId } });
  return count > 0;
}
