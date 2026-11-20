import "server-only";
import type { CourseContentStatus, PrismaClient } from "@/generated/prisma/client";
import { isCorrectAnswer } from "@/lib/course-quiz";
import { lessonContentSchema, type LessonContent } from "@/lib/schemas/course";

// Forløb (ChatGPT, Claude, Copilot): read models for the overview and lesson pages, and lesson completion.
// Progress is per user, per organization (the active membership, like Assignment) and per course.

export interface Owner {
  userId: string;
  organizationId: string;
}

export const COURSE_SLUGS = ["chatgpt", "claude", "copilot"] as const;
export type CourseSlug = (typeof COURSE_SLUGS)[number];
export const isCourseSlug = (s: string): s is CourseSlug => (COURSE_SLUGS as readonly string[]).includes(s);

const ready = (s: CourseContentStatus) => s === "READY";

export interface OverviewLesson {
  slug: string;
  nr: string;
  title: string;
  minutes: number;
  badges: string[];
  ready: boolean;
  completed: boolean;
}
export interface OverviewModule {
  slug: string;
  nr: number;
  title: string;
  description: string;
  ready: boolean;
  lessons: OverviewLesson[];
}
export interface OverviewLevel {
  slug: string;
  nr: number;
  name: string;
  title: string;
  outcome: string;
  modules: OverviewModule[];
  test: { slug: string; title: string; description: string; minutes: number; passPercent: number; ready: boolean };
}
export interface CourseOverview {
  slug: string;
  toolName: string;
  toolUrl: string;
  headline: string;
  disclaimer: string;
  levels: OverviewLevel[];
}

export async function listCourses(db: PrismaClient) {
  return db.course.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, toolName: true } });
}

export async function getCourseOverview(db: PrismaClient, owner: Owner, slug: string): Promise<CourseOverview | null> {
  const course = await db.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      toolName: true,
      toolUrl: true,
      headline: true,
      disclaimer: true,
      levels: {
        orderBy: { sortOrder: "asc" },
        select: {
          slug: true,
          nr: true,
          name: true,
          title: true,
          outcome: true,
          test: { select: { slug: true, title: true, description: true, minutes: true, passPercent: true, status: true } },
          modules: {
            orderBy: { sortOrder: "asc" },
            select: {
              slug: true,
              nr: true,
              title: true,
              description: true,
              status: true,
              lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, nr: true, title: true, minutes: true, badges: true, status: true } },
            },
          },
        },
      },
    },
  });
  if (!course) return null;
  const done = await completedLessonIds(db, owner, course.id);
  return {
    slug: course.slug,
    toolName: course.toolName,
    toolUrl: course.toolUrl,
    headline: course.headline,
    disclaimer: course.disclaimer,
    levels: course.levels.flatMap((l) =>
      l.test
        ? [
            {
              slug: l.slug,
              nr: l.nr,
              name: l.name,
              title: l.title,
              outcome: l.outcome,
              test: { slug: l.test.slug, title: l.test.title, description: l.test.description, minutes: l.test.minutes, passPercent: l.test.passPercent, ready: ready(l.test.status) },
              modules: l.modules.map((m) => ({
                slug: m.slug,
                nr: m.nr,
                title: m.title,
                description: m.description,
                ready: ready(m.status),
                lessons: m.lessons.map((x) => ({
                  slug: x.slug,
                  nr: x.nr,
                  title: x.title,
                  minutes: x.minutes,
                  badges: x.badges,
                  // A lesson opens only when both it and its module are ready.
                  ready: ready(x.status) && ready(m.status),
                  completed: done.has(x.id),
                })),
              })),
            },
          ]
        : [],
    ),
  };
}

async function completedLessonIds(db: PrismaClient, owner: Owner, courseId: string): Promise<Set<string>> {
  const rows = await db.courseLessonCompletion.findMany({
    where: { organizationId: owner.organizationId, userId: owner.userId, courseId },
    select: { lessonId: true },
  });
  return new Set(rows.map((r) => r.lessonId));
}

export interface LessonView {
  course: { slug: string; toolName: string; toolUrl: string; disclaimer: string };
  module: { slug: string; nr: number; title: string };
  lesson: { slug: string; nr: string; title: string; minutes: number; badges: string[]; completed: boolean };
  /** Without the quiz answer: the client never receives `correctIndex`. */
  content: { know: string[]; tryIt: LessonContent["tryIt"]; quiz: { question: string; options: string[] } };
  position: number;
  total: number;
  prevSlug: string | null;
  nextSlug: string | null;
}

export type LessonLookup = { kind: "ok"; view: LessonView } | { kind: "locked"; title: string; courseSlug: string } | { kind: "missing" };

export async function getLesson(db: PrismaClient, owner: Owner, courseSlug: string, lessonSlug: string): Promise<LessonLookup> {
  const lesson = await db.courseLesson.findUnique({
    where: { slug: lessonSlug },
    select: {
      id: true,
      slug: true,
      nr: true,
      title: true,
      minutes: true,
      badges: true,
      status: true,
      content: true,
      module: {
        select: {
          slug: true,
          nr: true,
          title: true,
          status: true,
          lessons: { orderBy: { sortOrder: "asc" }, select: { slug: true, status: true } },
          level: { select: { course: { select: { id: true, slug: true, toolName: true, toolUrl: true, disclaimer: true } } } },
        },
      },
    },
  });
  const course = lesson?.module.level.course;
  if (!lesson || !course || course.slug !== courseSlug) return { kind: "missing" };
  const parsed = lessonContentSchema.safeParse(lesson.content);
  if (!ready(lesson.status) || !ready(lesson.module.status) || !parsed.success) return { kind: "locked", title: lesson.title, courseSlug };

  const siblings = lesson.module.lessons;
  const i = siblings.findIndex((s) => s.slug === lesson.slug);
  const openable = (k: number) => (k >= 0 && k < siblings.length && ready(siblings[k].status) ? siblings[k].slug : null);
  const completed = await db.courseLessonCompletion.findUnique({
    where: { organizationId_userId_lessonId: { organizationId: owner.organizationId, userId: owner.userId, lessonId: lesson.id } },
    select: { id: true },
  });
  return {
    kind: "ok",
    view: {
      course: { slug: course.slug, toolName: course.toolName, toolUrl: course.toolUrl, disclaimer: course.disclaimer },
      module: { slug: lesson.module.slug, nr: lesson.module.nr, title: lesson.module.title },
      lesson: { slug: lesson.slug, nr: lesson.nr, title: lesson.title, minutes: lesson.minutes, badges: lesson.badges, completed: Boolean(completed) },
      content: { know: parsed.data.know, tryIt: parsed.data.tryIt, quiz: { question: parsed.data.quiz.question, options: parsed.data.quiz.options } },
      position: i + 1,
      total: siblings.length,
      prevSlug: openable(i - 1),
      nextSlug: openable(i + 1),
    },
  };
}

export type AnswerResult = { ok: true; correct: boolean } | { ok: false; error: "NOT_FOUND" | "LOCKED" };

/** Check the learner's answer (JSON option index). A correct answer marks the lesson completed (idempotent). */
export async function answerLesson(db: PrismaClient, owner: Owner, lessonSlug: string, chosenIndex: number): Promise<AnswerResult> {
  const lesson = await db.courseLesson.findUnique({
    where: { slug: lessonSlug },
    select: { id: true, status: true, content: true, module: { select: { status: true, level: { select: { courseId: true } } } } },
  });
  if (!lesson) return { ok: false, error: "NOT_FOUND" };
  const parsed = lessonContentSchema.safeParse(lesson.content);
  if (!ready(lesson.status) || !ready(lesson.module.status) || !parsed.success) return { ok: false, error: "LOCKED" };
  const correct = isCorrectAnswer(parsed.data.quiz, chosenIndex);
  if (correct) {
    await db.courseLessonCompletion.upsert({
      where: { organizationId_userId_lessonId: { organizationId: owner.organizationId, userId: owner.userId, lessonId: lesson.id } },
      create: { organizationId: owner.organizationId, userId: owner.userId, lessonId: lesson.id, courseId: lesson.module.level.courseId },
      update: {},
    });
  }
  return { ok: true, correct };
}

export interface ModuleCompletion {
  courseSlug: string;
  disclaimer: string;
  module: { nr: number; title: string };
  completed: number;
  total: number;
  missing: { slug: string; nr: string; title: string }[];
}

export async function getModuleCompletion(db: PrismaClient, owner: Owner, courseSlug: string, moduleSlug: string): Promise<ModuleCompletion | null> {
  const mod = await db.courseModule.findUnique({
    where: { slug: moduleSlug },
    select: {
      nr: true,
      title: true,
      status: true,
      lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, nr: true, title: true } },
      level: { select: { course: { select: { id: true, slug: true, disclaimer: true } } } },
    },
  });
  if (!mod || mod.level.course.slug !== courseSlug || !ready(mod.status)) return null;
  const done = await completedLessonIds(db, owner, mod.level.course.id);
  const missing = mod.lessons.filter((l) => !done.has(l.id)).map(({ slug, nr, title }) => ({ slug, nr, title }));
  return { courseSlug, disclaimer: mod.level.course.disclaimer, module: { nr: mod.nr, title: mod.title }, completed: mod.lessons.length - missing.length, total: mod.lessons.length, missing };
}

export interface MemberCourseProgress {
  courseSlug: string;
  toolName: string;
  modules: { nr: number; title: string; completed: number; total: number }[];
}

/** Admin view: per course, progress in the modules that are open (today: module 1). Org-scoped; no answers stored. */
export async function getMemberCourseProgress(db: PrismaClient, owner: Owner): Promise<MemberCourseProgress[]> {
  const [courses, done] = await Promise.all([
    db.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        toolName: true,
        levels: { orderBy: { sortOrder: "asc" }, select: { modules: { where: { status: "READY" }, orderBy: { sortOrder: "asc" }, select: { nr: true, title: true, lessons: { select: { id: true } } } } } },
      },
    }),
    db.courseLessonCompletion.findMany({ where: { organizationId: owner.organizationId, userId: owner.userId }, select: { lessonId: true } }),
  ]);
  const doneIds = new Set(done.map((d) => d.lessonId));
  return courses.map((c) => ({
    courseSlug: c.slug,
    toolName: c.toolName,
    modules: c.levels.flatMap((l) => l.modules).map((m) => ({ nr: m.nr, title: m.title, completed: m.lessons.filter((x) => doneIds.has(x.id)).length, total: m.lessons.length })),
  }));
}
