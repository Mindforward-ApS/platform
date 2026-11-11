import { describe, expect, it } from "vitest";
import type { CourseOverview } from "@/server/courses/service";
import { courseView } from "@/server/platform/views";
import { teamState } from "@/server/platform/team";

// Read models behind the approved platform screens (Oversigt, Mine kurser, Mit hold).

function lesson(slug: string, ready: boolean, completed: boolean, minutes = 5) {
  return { slug, nr: slug, title: `Lektion ${slug}`, minutes, badges: [], ready, completed };
}

function overview(modules: { nr: number; ready: boolean; lessons: ReturnType<typeof lesson>[] }[]): CourseOverview {
  return {
    slug: "chatgpt",
    toolName: "ChatGPT",
    toolUrl: "https://chatgpt.com",
    headline: "Lær ChatGPT",
    disclaimer: "Øvemiljø.",
    levels: [
      {
        slug: "chatgpt-l1",
        nr: 1,
        name: "Grøn",
        title: "Kom trygt i gang",
        outcome: "",
        test: { slug: "t1", title: "Test", description: "", minutes: 10, passPercent: 80, ready: false },
        modules: modules.map((m) => ({ slug: `m${m.nr}`, nr: m.nr, title: `Modul ${m.nr}`, description: "", ready: m.ready, lessons: m.lessons })),
      },
    ],
  };
}

describe("courseView", () => {
  it("counts progress over all lessons and picks the first open, unfinished lesson as next", () => {
    const v = courseView(
      overview([
        { nr: 1, ready: true, lessons: [lesson("a", true, true), lesson("b", true, false), lesson("c", true, false)] },
        { nr: 2, ready: false, lessons: [lesson("d", false, false), lesson("e", false, false)] },
      ]),
    );
    expect(v.done).toBe(1);
    expect(v.total).toBe(5);
    expect(v.readyTotal).toBe(3);
    expect(v.p).toBe(20);
    expect(v.status).toBe("I gang");
    expect(v.next?.slug).toBe("b");
    expect(v.level).toBe("Grøn");
    expect(v.modules.map((m) => m.state)).toEqual(["current", "todo"]);
    expect(v.minutesLeft).toBe(20);
  });

  it("is 'Ikke startet' with nothing done and 'Færdig' only when every lesson is done", () => {
    expect(courseView(overview([{ nr: 1, ready: true, lessons: [lesson("a", true, false)] }])).status).toBe("Ikke startet");
    const done = courseView(overview([{ nr: 1, ready: true, lessons: [lesson("a", true, true), lesson("b", true, true)] }]));
    expect(done.status).toBe("Færdig");
    expect(done.next).toBeNull();
    expect(done.modules[0]?.state).toBe("done");
  });

  it("never offers a lesson that is not ready as next", () => {
    const v = courseView(overview([{ nr: 1, ready: false, lessons: [lesson("a", false, false)] }]));
    expect(v.next).toBeNull();
  });
});

describe("teamState", () => {
  it("maps admin status, forløb progress and last activity to the Mit hold states", () => {
    expect(teamState("CERTIFIED", 10, 1, 0)).toBe("done");
    expect(teamState("IN_PROGRESS", 100, 19, 2)).toBe("done");
    expect(teamState("NOT_STARTED", 0, 0, null)).toBe("new");
    expect(teamState("NOT_STARTED", 5, 1, 1)).toBe("active");
    expect(teamState("IN_PROGRESS", 40, 7, 3)).toBe("active");
    expect(teamState("IN_PROGRESS", 40, 7, 4)).toBe("idle");
    expect(teamState("IN_PROGRESS", 0, 0, null)).toBe("idle");
  });
});
