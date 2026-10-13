import type { PlacementQuestion, PlacementTest } from "@/lib/schemas/placement";

/** All questions answered correctly. */
export function correctAnswers(test: PlacementTest): Record<string, string> {
  return Object.fromEntries(test.questions.map((q) => [q.id, q.correct]));
}

/** Answer each question right or wrong by a predicate (indexInArea counts from 0 within the question's area). */
export function answersFromPattern(test: PlacementTest, right: (q: PlacementQuestion, indexInArea: number) => boolean): Record<string, string> {
  const seen = new Map<string, number>();
  return Object.fromEntries(
    test.questions.map((q) => {
      const indexInArea = seen.get(q.area) ?? 0;
      seen.set(q.area, indexInArea + 1);
      const wrong = q.options.find((o) => o.id !== q.correct)?.id ?? "z";
      return [q.id, right(q, indexInArea) ? q.correct : wrong];
    }),
  );
}
