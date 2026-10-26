import { describe, expect, it } from "vitest";
import { seedCourses } from "@/server/courses/seed";
import { answerLesson, getCourseOverview, getLesson, getMemberCourseProgress } from "@/server/courses/service";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";

// Forløb against the integration database: idempotent seed, overview order, quiz answers and per-course progress.

async function counts() {
  const db = testDb();
  const where = { slug: { startsWith: "" } };
  return {
    courses: await db.course.count({ where }),
    levels: await db.courseLevel.count({ where }),
    modules: await db.courseModule.count({ where }),
    lessons: await db.courseLesson.count({ where }),
    tests: await db.courseTest.count({ where }),
  };
}

async function learner() {
  const org = await makeOrg("PERSONAL");
  const user = await makeUser();
  await addMember(org.id, user.id, "OWNER");
  return { userId: user.id, organizationId: org.id };
}

describe("forløb", () => {
  it("seed can run twice without errors or duplicates", async () => {
    const first = await seedCourses(testDb());
    const after1 = await counts();
    const second = await seedCourses(testDb());
    const after2 = await counts();
    expect(first).toEqual(second);
    expect(first).toEqual({ courses: 3, levels: 12, modules: 58, lessons: 229, tests: 12 });
    expect(after2).toEqual(after1);
    expect(after2).toEqual({ courses: 3, levels: 12, modules: 58, lessons: 229, tests: 12 });
  });

  it("shows levels, modules and lessons in JSON order with module 1 open and the rest locked", async () => {
    await seedCourses(testDb());
    const owner = await learner();
    const chatgpt = await getCourseOverview(testDb(), owner, "chatgpt");
    expect(chatgpt?.levels.map((l) => l.slug)).toEqual(["chatgpt-n1", "chatgpt-n2", "chatgpt-n3", "chatgpt-n4"]);
    const modules = chatgpt?.levels.flatMap((l) => l.modules) ?? [];
    expect(modules.map((m) => m.nr)).toEqual(Array.from({ length: 19 }, (_, i) => i + 1));
    expect(modules[0].lessons.map((l) => l.nr)).toEqual(["1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7"]);
    expect(modules[0].lessons.every((l) => l.ready)).toBe(true);
    expect(modules.slice(1).every((m) => !m.ready && m.lessons.every((l) => !l.ready))).toBe(true);
    expect(chatgpt?.levels.every((l) => !l.test.ready)).toBe(true);
    const computerHistory = modules.flatMap((m) => m.lessons).find((l) => l.slug === "chatgpt-l15-05");
    expect(computerHistory?.badges).toEqual(["Pro, Business og Enterprise, kun Mac", "Begrænset i EU"]);
  });

  it("never sends the right answer to the page and locks lessons that are not ready", async () => {
    await seedCourses(testDb());
    const owner = await learner();
    const open = await getLesson(testDb(), owner, "claude", "claude-l01-03");
    expect(open.kind).toBe("ok");
    if (open.kind !== "ok") return;
    expect(JSON.stringify(open.view)).not.toContain("correctIndex");
    expect(open.view.position).toBe(3);
    expect(open.view.total).toBe(6);
    expect(open.view.prevSlug).toBe("claude-l01-02");
    expect(open.view.nextSlug).toBe("claude-l01-04");
    expect((await getLesson(testDb(), owner, "claude", "claude-l02-01")).kind).toBe("locked");
    expect((await getLesson(testDb(), owner, "chatgpt", "claude-l01-01")).kind).toBe("missing");
    expect(await answerLesson(testDb(), owner, "claude-l02-01", 0)).toEqual({ ok: false, error: "LOCKED" });
  });

  it("marks a lesson completed only on the right answer, allows retries and keeps courses apart", async () => {
    await seedCourses(testDb());
    const owner = await learner();
    // chatgpt-l01-01: correctIndex 1
    expect(await answerLesson(testDb(), owner, "chatgpt-l01-01", 0)).toEqual({ ok: true, correct: false });
    let overview = await getCourseOverview(testDb(), owner, "chatgpt");
    expect(overview?.levels[0].modules[0].lessons[0].completed).toBe(false);
    expect(await answerLesson(testDb(), owner, "chatgpt-l01-01", 1)).toEqual({ ok: true, correct: true });
    expect(await answerLesson(testDb(), owner, "chatgpt-l01-01", 1)).toEqual({ ok: true, correct: true }); // idempotent
    overview = await getCourseOverview(testDb(), owner, "chatgpt");
    expect(overview?.levels[0].modules[0].lessons.filter((l) => l.completed)).toHaveLength(1);

    const claude = await getCourseOverview(testDb(), owner, "claude");
    const copilot = await getCourseOverview(testDb(), owner, "copilot");
    expect(claude?.levels.flatMap((l) => l.modules).flatMap((m) => m.lessons).some((l) => l.completed)).toBe(false);
    expect(copilot?.levels.flatMap((l) => l.modules).flatMap((m) => m.lessons).some((l) => l.completed)).toBe(false);

    // Another org of the same user does not see it (org-scoped progress).
    const otherOrg = await makeOrg("PERSONAL");
    await addMember(otherOrg.id, owner.userId, "OWNER");
    const other = await getCourseOverview(testDb(), { userId: owner.userId, organizationId: otherOrg.id }, "chatgpt");
    expect(other?.levels[0].modules[0].lessons[0].completed).toBe(false);

    const admin = await getMemberCourseProgress(testDb(), owner);
    expect(admin.map((c) => [c.courseSlug, c.modules.map((m) => `${m.nr}:${m.completed}/${m.total}`)])).toEqual([
      ["chatgpt", ["1:1/7"]],
      ["claude", ["1:0/6"]],
      ["copilot", ["1:0/6"]],
    ]);
  });
});
