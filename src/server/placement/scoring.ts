import { placementConfig } from "@/lib/config/placement";
import type { AreaId, PlacementAnswers, PlacementTest } from "@/lib/schemas/placement";

// Pure scoring of a placement test (no I/O): per-area scores → area state + overall level 1–3 + 3 recommendations.
// Rules: content/curriculum.md "Niveautest → plan"; thresholds in src/lib/config/placement.ts.

export type AreaState = "SECURE" | "PARTIAL" | "UNCERTAIN";
export type Level = 1 | 2 | 3;

export interface AreaScore {
  id: AreaId;
  label: string;
  correct: number;
  total: number;
  pct: number;
  state: AreaState;
  /** 1 = usikker, 2 = delvis, 3 = sikker. */
  level: Level;
}

export interface Recommendation {
  areaId: AreaId;
  text: string;
  moduleId: string | null;
}

export interface PlacementScore {
  areas: AreaScore[];
  correct: number;
  total: number;
  /** 0–100, two decimals. */
  scorePct: number;
  level: Level;
  recommendations: Recommendation[];
}

type ScoringRules = Pick<typeof placementConfig, "uncertainBelowPct" | "level2MinPct" | "level3MinPct" | "recommendationCount">;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function areaStateOf(correct: number, total: number, rules: ScoringRules = placementConfig): AreaState {
  if (total > 0 && correct === total) return "SECURE";
  const pct = total === 0 ? 0 : (correct / total) * 100;
  return pct < rules.uncertainBelowPct ? "UNCERTAIN" : "PARTIAL";
}

const LEVEL_OF_STATE: Record<AreaState, Level> = { UNCERTAIN: 1, PARTIAL: 2, SECURE: 3 };

export function scorePlacement(test: PlacementTest, answers: PlacementAnswers, rules: ScoringRules = placementConfig): PlacementScore {
  const areas: AreaScore[] = test.areas.map((area) => {
    const questions = test.questions.filter((q) => q.area === area.id);
    const correct = questions.filter((q) => answers.questions[q.id] === q.correct).length;
    const state = areaStateOf(correct, questions.length, rules);
    return {
      id: area.id,
      label: area.label,
      correct,
      total: questions.length,
      pct: questions.length === 0 ? 0 : round2((correct / questions.length) * 100),
      state,
      level: LEVEL_OF_STATE[state],
    };
  });

  const correct = areas.reduce((n, a) => n + a.correct, 0);
  const total = areas.reduce((n, a) => n + a.total, 0);
  const scorePct = total === 0 ? 0 : round2((correct / total) * 100);
  const level: Level = scorePct >= rules.level3MinPct ? 3 : scorePct >= rules.level2MinPct ? 2 : 1;

  // Weakest areas first (stable: test order breaks ties). Weak areas get "improve", secure ones "next".
  const ranked = areas.map((a, index) => ({ a, index })).sort((x, y) => x.a.pct - y.a.pct || x.index - y.index);
  const recommendations = ranked.slice(0, rules.recommendationCount).map(({ a }) => {
    const def = test.areas.find((d) => d.id === a.id);
    return { areaId: a.id, text: (a.state === "SECURE" ? def?.advice.next : def?.advice.improve) ?? "", moduleId: def?.moduleIds[0] ?? null };
  });

  return { areas, correct, total, scorePct, level, recommendations };
}
