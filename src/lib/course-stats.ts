// Pure figures for the forløb overview, computed from data (never hardcoded):
// lesson = its minutes; module = sum of its lessons; level = its modules + its test; total = all levels.

export interface StatLesson {
  minutes: number;
}
export interface StatModule {
  lessons: StatLesson[];
}
export interface StatLevel {
  modules: StatModule[];
  test: { minutes: number };
}

export const moduleMinutes = (m: StatModule) => m.lessons.reduce((s, l) => s + l.minutes, 0);
export const levelMinutes = (l: StatLevel) => l.modules.reduce((s, m) => s + moduleMinutes(m), 0) + l.test.minutes;
export const levelLessonCount = (l: StatLevel) => l.modules.reduce((s, m) => s + m.lessons.length, 0);

export function courseTotals(levels: StatLevel[]) {
  return {
    modules: levels.reduce((s, l) => s + l.modules.length, 0),
    lessons: levels.reduce((s, l) => s + levelLessonCount(l), 0),
    // One certificate per level test.
    certificates: levels.length,
    minutes: levels.reduce((s, l) => s + levelMinutes(l), 0),
  };
}

/** "35 min", "1 t 45 min", "2 t". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}

/** Total course time, rounded to the nearest whole hour: "ca. 7 t". */
export function formatTotalDuration(minutes: number): string {
  return `ca. ${Math.round(minutes / 60)} t`;
}
