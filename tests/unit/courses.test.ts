import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCorrectAnswer, shuffledOrder } from "@/lib/course-quiz";
import { courseTotals, formatDuration, formatTotalDuration, levelLessonCount, levelMinutes } from "@/lib/course-stats";
import { daCourses } from "@/lib/i18n/da-courses";
import { courseFileSchema } from "@/lib/schemas/course";

// Forløb: the content file, the computed figures from the acceptance criteria, and the quiz rules.

const file = courseFileSchema.parse(JSON.parse(readFileSync("content/forloeb/forloeb.json", "utf8")));
const track = (id: string) => {
  const t = file.tracks.find((x) => x.id === id);
  if (!t) throw new Error(id);
  return t;
};

describe("content/forloeb/forloeb.json", () => {
  it("has ChatGPT, Claude and Copilot in that order", () => {
    expect(file.tracks.map((t) => t.id)).toEqual(["chatgpt", "claude", "copilot"]);
  });

  it("uses unique ids everywhere (stable upsert keys)", () => {
    const ids = file.tracks.flatMap((t) => [t.id, ...t.levels.flatMap((l) => [l.id, l.test.id, ...l.modules.flatMap((m) => [m.id, ...m.lessons.map((x) => x.id)])])]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("opens exactly module 1 in each course, with text, exercise and check question in every lesson", () => {
    for (const t of file.tracks) {
      const modules = t.levels.flatMap((l) => l.modules);
      expect(modules.filter((m) => m.status === "klar").map((m) => m.nr)).toEqual([1]);
      for (const x of modules[0].lessons) {
        expect(x.status).toBe("klar");
        expect(x.content?.know.length).toBeGreaterThan(0);
        expect(x.content?.quiz.options).toHaveLength(3);
      }
      for (const m of modules.slice(1)) expect(m.lessons.every((x) => x.status === "kommer-snart" && !x.content)).toBe(true);
      expect(t.levels.every((l) => l.test.status === "kommer-snart" && l.test.passPercent === 80)).toBe(true);
    }
  });

  it("module 1 has 7 lessons in ChatGPT, 6 in Claude and 6 in Copilot", () => {
    expect(track("chatgpt").levels[0].modules[0].lessons).toHaveLength(7);
    expect(track("claude").levels[0].modules[0].lessons).toHaveLength(6);
    expect(track("copilot").levels[0].modules[0].lessons).toHaveLength(6);
  });

  it("covers all three kinds of 'Prøv selv'", () => {
    const where = new Set(file.tracks.flatMap((t) => t.levels[0].modules[0].lessons.map((x) => x.content?.tryIt.where)));
    expect([...where].sort()).toEqual(["oevemiljoe", "offline", "tool"]);
  });
});

describe("computed figures (acceptance criteria)", () => {
  const cases = [
    { id: "chatgpt", modules: 19, lessons: 72, levels: ["1 t 45 min", "1 t 30 min", "1 t 25 min", "2 t 20 min"], total: "ca. 7 t" },
    { id: "claude", modules: 20, lessons: 81, levels: ["1 t 45 min", "1 t 35 min", "2 t 5 min", "2 t 20 min"], total: "ca. 8 t" },
    { id: "copilot", modules: 19, lessons: 76, levels: ["1 t 40 min", "1 t 45 min", "1 t 40 min", "2 t 15 min"], total: "ca. 7 t" },
  ];
  for (const c of cases) {
    it(`${c.id}: 4 levels, ${c.modules} modules, ${c.lessons} lessons, 4 tests, ${c.total}`, () => {
      const t = track(c.id);
      const totals = courseTotals(t.levels);
      expect(t.levels).toHaveLength(4);
      expect(totals.modules).toBe(c.modules);
      expect(totals.lessons).toBe(c.lessons);
      expect(totals.certificates).toBe(4);
      expect(t.levels.map((l) => formatDuration(levelMinutes(l)))).toEqual(c.levels);
      expect(formatTotalDuration(totals.minutes)).toBe(c.total);
      expect(t.levels.reduce((s, l) => s + levelLessonCount(l), 0)).toBe(c.lessons);
    });
  }

  it("formats durations the Danish way", () => {
    expect(formatDuration(35)).toBe("35 min");
    expect(formatDuration(105)).toBe("1 t 45 min");
    expect(formatDuration(120)).toBe("2 t");
    expect(formatTotalDuration(465)).toBe("ca. 8 t");
    expect(formatTotalDuration(440)).toBe("ca. 7 t");
  });
});

describe("check questions", () => {
  const quiz = { options: ["a", "b", "c"], correctIndex: 1 };
  it("accepts only the right option (JSON order)", () => {
    expect(isCorrectAnswer(quiz, 1)).toBe(true);
    expect(isCorrectAnswer(quiz, 0)).toBe(false);
    expect(isCorrectAnswer(quiz, 2)).toBe(false);
    expect(isCorrectAnswer(quiz, 7)).toBe(false);
    expect(isCorrectAnswer(quiz, 1.5)).toBe(false);
  });

  it("shuffles to a permutation of all options", () => {
    for (let i = 0; i < 50; i++) expect([...shuffledOrder(3)].sort()).toEqual([0, 1, 2]);
    // Deterministic with an injected random source.
    expect(shuffledOrder(3, () => 0)).toEqual([1, 2, 0]);
  });
});

describe("UI text rules", () => {
  const strings = JSON.stringify(daCourses);
  it("has no exclamation marks and no emoji", () => {
    expect(strings).not.toMatch(/!/);
    expect(strings).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it("uses the required wording", () => {
    expect(daCourses.lesson.correct).toBe("Rigtigt");
    expect(daCourses.lesson.wrong).toBe("Ikke helt. Prøv igen.");
    expect(daCourses.done.title).toBe("Modul {nr} er gennemført");
    expect(daCourses.comingSoon).toBe("Kommer snart");
    expect(daCourses.lesson.openSandbox).toBe("Åbn øvemiljø");
  });
});
