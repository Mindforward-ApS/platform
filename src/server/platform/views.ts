import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { COURSE_SLUGS, getCourseOverview, type CourseOverview, type Owner } from "@/server/courses/service";

// Read models for the approved platform screens (Oversigt, Mine kurser, Kursusbeviser), computed from greb's real
// forløb data. Only the signed-in learner's own data in their active organization; nothing is compared with colleagues.

export type CourseStatus = "I gang" | "Ikke startet" | "Færdig";

export interface CourseLessonView {
  slug: string;
  nr: string;
  title: string;
  minutes: number;
  ready: boolean;
  done: boolean;
  /** Module number (1-based), for the course page. */
  module: number;
}
export interface CourseModuleView {
  nr: number;
  title: string;
  lessons: number;
  done: number;
  ready: boolean;
  state: "done" | "current" | "todo";
}
export interface CourseView {
  slug: string;
  title: string;
  headline: string;
  disclaimer: string;
  toolUrl: string;
  /** Level of the next lesson (e.g. "Grøn"). */
  level: string;
  levels: number;
  certificates: number;
  modules: CourseModuleView[];
  lessons: CourseLessonView[];
  minutes: number;
  done: number;
  total: number;
  /** Lessons that can be opened today (status "klar"). */
  readyTotal: number;
  p: number;
  status: CourseStatus;
  next: CourseLessonView | null;
  minutesLeft: number;
}

export function courseView(c: CourseOverview): CourseView {
  const lessons: CourseLessonView[] = [];
  const modules: CourseModuleView[] = [];
  let level = c.levels[0]?.name ?? "";
  let next: CourseLessonView | null = null;
  for (const l of c.levels) {
    for (const m of l.modules) {
      for (const x of m.lessons) {
        const lv = { slug: x.slug, nr: x.nr, title: x.title, minutes: x.minutes, ready: x.ready, done: x.completed, module: m.nr };
        lessons.push(lv);
        if (!next && x.ready && !x.completed) {
          next = lv;
          level = l.name;
        }
      }
      const done = m.lessons.filter((x) => x.completed).length;
      modules.push({ nr: m.nr, title: m.title, lessons: m.lessons.length, done, ready: m.ready, state: "todo" });
    }
  }
  const firstOpen = next?.module;
  for (const m of modules) m.state = m.done === m.lessons && m.lessons > 0 ? "done" : m.nr === firstOpen ? "current" : "todo";
  const done = lessons.filter((l) => l.done).length;
  const total = lessons.length;
  const p = total ? Math.round((done / total) * 100) : 0;
  return {
    slug: c.slug,
    title: c.toolName,
    headline: c.headline,
    disclaimer: c.disclaimer,
    toolUrl: c.toolUrl,
    level,
    levels: c.levels.length,
    certificates: c.levels.length,
    modules,
    lessons,
    minutes: lessons.reduce((s, l) => s + l.minutes, 0),
    done,
    total,
    readyTotal: lessons.filter((l) => l.ready).length,
    p,
    status: done === 0 ? "Ikke startet" : done >= total ? "Færdig" : "I gang",
    next,
    minutesLeft: lessons.filter((l) => !l.done).reduce((s, l) => s + l.minutes, 0),
  };
}

const ORDER: Record<CourseStatus, number> = { "I gang": 0, "Ikke startet": 1, Færdig: 2 };

/** All forløb (ChatGPT, Claude, Copilot) as course views, in progress first. */
export async function listCourseViews(db: PrismaClient, owner: Owner): Promise<CourseView[]> {
  const all = await Promise.all(COURSE_SLUGS.map((s) => getCourseOverview(db, owner, s)));
  return all
    .filter((c): c is CourseOverview => c !== null)
    .map(courseView)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.p - a.p);
}

const DAY = 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Minutes of forløb lessons completed per day, newest day last (days = window length). */
export async function learningMinutesByDay(db: PrismaClient, owner: Owner, days: number, now = new Date()) {
  const start = new Date(now.getTime() - (days * 2 - 1) * DAY);
  start.setUTCHours(0, 0, 0, 0);
  const rows = await db.courseLessonCompletion.findMany({
    where: { organizationId: owner.organizationId, userId: owner.userId, completedAt: { gte: start } },
    select: { completedAt: true, lesson: { select: { minutes: true } } },
  });
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(dayKey(r.completedAt), (byDay.get(dayKey(r.completedAt)) ?? 0) + r.lesson.minutes);
  const series = (offset: number) =>
    Array.from({ length: days }, (_, i) => {
      const d = new Date(now.getTime() - (offset + days - 1 - i) * DAY);
      return { date: d, minutes: byDay.get(dayKey(d)) ?? 0 };
    });
  return { current: series(0), previous: series(days) };
}

/** Days with learning activity (lesson completions or finished module attempts): this week's Mon–Sun and the streak. */
export async function activityStreak(db: PrismaClient, owner: Owner, now = new Date()) {
  const since = new Date(now.getTime() - 60 * DAY);
  const [lessons, attempts] = await Promise.all([
    db.courseLessonCompletion.findMany({ where: { organizationId: owner.organizationId, userId: owner.userId, completedAt: { gte: since } }, select: { completedAt: true } }),
    db.attempt.findMany({ where: { organizationId: owner.organizationId, userId: owner.userId, completedAt: { gte: since } }, select: { completedAt: true } }),
  ]);
  const active = new Set([...lessons.map((l) => dayKey(l.completedAt)), ...attempts.flatMap((a) => (a.completedAt ? [dayKey(a.completedAt)] : []))]);
  let streak = 0;
  // Today counts if active; otherwise the streak may still run up to yesterday.
  for (let i = active.has(dayKey(now)) ? 0 : 1; i < 60 && active.has(dayKey(new Date(now.getTime() - i * DAY))); i++) streak++;
  const mondayOffset = (now.getUTCDay() + 6) % 7;
  const week = Array.from({ length: 7 }, (_, i) => active.has(dayKey(new Date(now.getTime() - (mondayOffset - i) * DAY))));
  return { streak, week };
}

export interface LatestFeedback {
  moduleSlug: string;
  title: string;
  scorePct: number;
  completedAt: Date;
  passedSteps: number;
  hintSteps: number;
  failedSteps: number;
}

/** The learner's latest finished module attempt (own data only): score and step counts, never prompt text. */
export async function latestFeedback(db: PrismaClient, owner: Owner): Promise<LatestFeedback | null> {
  const a = await db.attempt.findFirst({
    where: { organizationId: owner.organizationId, userId: owner.userId, completedAt: { not: null }, scorePct: { not: null } },
    orderBy: { completedAt: "desc" },
    select: {
      scorePct: true,
      completedAt: true,
      moduleVersion: { select: { title: true, module: { select: { slug: true } } } },
      stepResults: { select: { passed: true, hintLevelUsed: true } },
    },
  });
  if (!a || !a.completedAt || a.scorePct === null) return null;
  return {
    moduleSlug: a.moduleVersion.module.slug,
    title: a.moduleVersion.title,
    scorePct: Math.round(Number(a.scorePct)),
    completedAt: a.completedAt,
    passedSteps: a.stepResults.filter((s) => s.passed).length,
    hintSteps: a.stepResults.filter((s) => s.hintLevelUsed > 0).length,
    failedSteps: a.stepResults.filter((s) => !s.passed).length,
  };
}

// ── Oversigt: the learner's own practice time and today's activity (Marco 2026-11-17: no more example data) ──

/** Gaps between two sandbox events longer than this count as a break, not practice. */
const IDLE_MS = 5 * 60 * 1000;
/** Tool name as shown in the platform ("Copilot", not "Microsoft 365 Copilot"). */
export const toolName = (displayName: string) => displayName.replace(/^Microsoft 365 /, "");
const startOfWeek = (now: Date) => {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY);
};

export interface PracticeTime {
  /** Minutes this week per tool, only tools with time. */
  tools: { key: "CHATGPT" | "COPILOT" | "CLAUDE" | "GEMINI"; name: string; minutes: number }[];
  total: number;
  /** Change against last week in %, null when there was no practice last week. */
  changePct: number | null;
}

/** Active minutes in the øvemiljø this week (Monday to now) per tool, from the learner's own sandbox events. */
export async function practiceTime(db: PrismaClient, owner: Owner, now = new Date()): Promise<PracticeTime> {
  const week = startOfWeek(now);
  const lastWeek = new Date(week.getTime() - 7 * DAY);
  const events = await db.sandboxEvent.findMany({
    where: { organizationId: owner.organizationId, userId: owner.userId, createdAt: { gte: lastWeek, lte: now } },
    select: { sessionId: true, createdAt: true, session: { select: { track: { select: { key: true, displayName: true } } } } },
    orderBy: [{ sessionId: "asc" }, { createdAt: "asc" }],
  });
  const thisWeek = new Map<string, { name: string; ms: number }>();
  let prevMs = 0;
  for (let i = 1; i < events.length; i++) {
    const a = events[i - 1], b = events[i];
    if (a.sessionId !== b.sessionId) continue;
    const gap = Math.min(b.createdAt.getTime() - a.createdAt.getTime(), IDLE_MS);
    if (b.createdAt >= week) {
      const t = b.session.track;
      const cur = thisWeek.get(t.key) ?? { name: t.displayName, ms: 0 };
      cur.ms += gap;
      thisWeek.set(t.key, cur);
    } else prevMs += gap;
  }
  const order = ["CHATGPT", "COPILOT", "CLAUDE", "GEMINI"] as const;
  const tools = order.flatMap((key) => {
    const t = thisWeek.get(key);
    const minutes = t ? Math.round(t.ms / 60_000) : 0;
    return minutes > 0 ? [{ key, name: toolName(t!.name), minutes }] : [];
  });
  const total = tools.reduce((n, t) => n + t.minutes, 0);
  const prev = Math.round(prevMs / 60_000);
  return { tools, total, changePct: prev > 0 ? Math.round(((total - prev) / prev) * 100) : null };
}

export interface TodayItem {
  title: string;
  start: Date;
  end: Date;
  href: string;
  kind: "practice" | "task";
}

/** What the learner did today: øvemiljø sessions and module tasks, with their real start and end time. */
export async function todayActivity(db: PrismaClient, owner: Owner, now = new Date()): Promise<TodayItem[]> {
  const since = new Date(now.getTime() - DAY);
  const cphDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Copenhagen" }).format(d);
  const [sessions, attempts] = await Promise.all([
    db.sandboxSession.findMany({
      where: { organizationId: owner.organizationId, userId: owner.userId, lastActivityAt: { gte: since }, attemptId: null },
      select: { id: true, createdAt: true, lastActivityAt: true, track: { select: { displayName: true, key: true } } },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
    db.attempt.findMany({
      where: { organizationId: owner.organizationId, userId: owner.userId, startedAt: { gte: since } },
      select: { startedAt: true, completedAt: true, updatedAt: true, moduleVersion: { select: { title: true, module: { select: { slug: true } } } } },
      orderBy: { startedAt: "asc" },
      take: 6,
    }),
  ]);
  const items: TodayItem[] = [
    ...sessions.map((s) => ({ title: `Øvemiljø: ${toolName(s.track.displayName)}`, start: s.createdAt, end: s.lastActivityAt, href: "/sandkasse", kind: "practice" as const })),
    ...attempts.map((a) => ({ title: a.moduleVersion.title, start: a.startedAt, end: a.completedAt ?? a.updatedAt, href: `/modul/${a.moduleVersion.module.slug}`, kind: "task" as const })),
  ];
  return items.filter((i) => cphDay(i.end) === cphDay(now)).sort((a, b) => a.start.getTime() - b.start.getTime()).slice(0, 4);
}
