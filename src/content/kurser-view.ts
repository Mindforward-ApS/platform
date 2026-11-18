// Course view data for /kurser (version B "Overblik", made live 2026-11-03) and the course-page proposals.
// Lessons are grouped into modules here, so every version shows the same course → module → lesson structure.
// All demo data until the real Mindforward modules exist.
import { courses, type Course } from "@/content/academy";
import { lessonsFor, progress, saved, type Lesson } from "@/content/platform";

export const VARIANTS = ["a", "b", "c"] as const;
export type Variant = (typeof VARIANTS)[number];

// Module names and how many lessons each one holds (sums match lessonTitles in platform.ts).
const moduleDefs: Record<string, [string, number][]> = {
  "ai-paa-arbejdet": [["Kom i gang", 3], ["Få gode svar", 2], ["AI i din hverdag", 3], ["Sikkert og selvstændigt", 2], ["Afslutning", 2]],
  "gode-prompts": [["Grundmetoden", 3], ["Bedre samtaler", 2], ["Prompts til opgaver", 3], ["Afslutning", 1]],
  "mails-og-tilbud": [["Mails", 4], ["Tilbud", 3], ["Genbrug og tone", 2], ["Afslutning", 1]],
  "moeder-og-referater": [["Før og under mødet", 2], ["Referatet", 3], ["Regler", 1], ["Afslutning", 1]],
  "excel-med-ai": [["Formler", 2], ["Rens og saml data", 3], ["Overblik", 4], ["Tid og format", 2], ["Copilot og kontrol", 2], ["Afslutning", 1]],
  "data-og-gdpr": [["Grundbegreber", 2], ["Regler i virksomheden", 2], ["Del sikkert", 3], ["Afslutning", 1]],
  "research-med-ai": [["Find kilder", 3], ["Opsummer og tjek", 3], ["Brug fundene", 2], ["Afslutning", 1]],
  "led-et-ai-team": [["Udgangspunkt", 3], ["Kom i gang", 2], ["Hverdag og effekt", 3], ["Tryghed", 2], ["Afslutning", 1]],
};

// Photo covers where we have one; the rest use CourseThumb. Placeholders until Marco sends one photo per course.
export const covers: Record<string, string> = {
  "ai-paa-arbejdet": "/img/kurser/team.jpg",
  "gode-prompts": "/img/kurser/whiteboard.jpg",
  "excel-med-ai": "/img/kurser/feedback.jpg",
  "mails-og-tilbud": "/img/kurser/telefon.jpg",
};

export type ModLesson = Lesson & { score?: number };
export type Module = { n: number; title: string; lessons: ModLesson[]; done: number; minutes: number; state: "done" | "current" | "todo" };
export type Status = "I gang" | "Ikke startet" | "Færdig";
export type CourseView = Course & {
  p: number; status: Status; saved: boolean; lessonsList: ModLesson[]; modules: Module[];
  done: number; total: number; next?: ModLesson; nextModule?: Module; tasks: number; tasksDone: number; avgScore: number | null; minutesLeft: number;
};

export function view(c: Course): CourseView {
  const ls: ModLesson[] = lessonsFor(c).map((l) => ({ ...l, score: l.task && l.done ? 72 + ((l.n * 7 + c.hue) % 24) : undefined }));
  let i = 0;
  const firstOpen = ls.find((l) => !l.done)?.n ?? Infinity;
  const modules: Module[] = (moduleDefs[c.slug] ?? [["Lektioner", ls.length]]).map(([title, count], m) => {
    const lessons = ls.slice(i, i + count);
    i += count;
    const done = lessons.filter((l) => l.done).length;
    const state = done === lessons.length ? "done" : lessons.some((l) => l.n === firstOpen) ? "current" : "todo";
    return { n: m + 1, title, lessons, done, minutes: lessons.reduce((s, l) => s + l.minutes, 0), state };
  });
  const p = progress[c.slug] ?? 0;
  const scored = ls.filter((l) => l.score !== undefined);
  return {
    ...c, p, status: p >= 100 ? "Færdig" : p > 0 ? "I gang" : "Ikke startet", saved: saved.has(c.slug),
    lessonsList: ls, modules, done: ls.filter((l) => l.done).length, total: ls.length,
    next: ls.find((l) => !l.done), nextModule: modules.find((m) => m.state === "current"),
    tasks: ls.filter((l) => l.task).length, tasksDone: scored.length,
    avgScore: scored.length ? Math.round(scored.reduce((s, l) => s + (l.score ?? 0), 0) / scored.length) : null,
    minutesLeft: ls.filter((l) => !l.done).reduce((s, l) => s + l.minutes, 0),
  };
}

export const all = courses.map(view);
export const bySlug = new Map(all.map((c) => [c.slug, c]));
export const order: Record<Status, number> = { "I gang": 0, "Ikke startet": 1, "Færdig": 2 };
export const sorted = [...all].sort((a, b) => order[a.status] - order[b.status] || b.p - a.p);

export const O = "#e2643f";
export const GREEN = "#5cbf8f";
export const card = "relative min-w-0 rounded-[16px] bg-white";
export const pill = "inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#f3eeeb] px-3 text-[11.5px] font-medium text-heading hover:bg-[#ebe4e0]";
export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} t ${m % 60 ? `${m % 60} m` : ""}`.trim() : `${m} min`);
