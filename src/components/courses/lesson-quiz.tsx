"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { shuffledOrder } from "@/lib/course-quiz";
import { getMessages } from "@/lib/i18n";

// "Tjek dig selv": three options, shuffled on the client after the first render (no hydration mismatch) and kept in
// that order after a wrong answer. The server checks the answer; the client never knows which option is right.

type Answer = (chosenIndex: number) => Promise<{ ok: true; correct: boolean } | { ok: false; error: string }>;

const subscribe = () => () => {};

export function LessonQuiz({ question, options, initiallyCompleted, answer }: { question: string; options: string[]; initiallyCompleted: boolean; answer: Answer }) {
  const t = getMessages().courses.lesson;
  // Shuffled once per mount; only rendered once hydrated, so server and first client render agree.
  const [order] = useState(() => shuffledOrder(options.length));
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | "error" | null>(null);
  const [pending, start] = useTransition();
  const solved = result === "correct";

  const choose = (jsonIndex: number) => {
    if (pending || solved) return;
    setPicked(jsonIndex);
    setResult(null);
    start(async () => {
      const r = await answer(jsonIndex);
      setResult(!r.ok ? "error" : r.correct ? "correct" : "wrong");
    });
  };

  return (
    <fieldset className="flex flex-col gap-3" data-testid="lesson-quiz">
      <legend className="mb-3 text-body font-medium text-ink">{question}</legend>
      {initiallyCompleted && !solved && <p className="text-body-sm text-ink-muted">{t.completedNote}</p>}
      <ul className="flex min-h-[9.5rem] flex-col gap-2">
        {hydrated &&
          order.map((jsonIndex) => {
            const isPicked = picked === jsonIndex;
            const state = isPicked && result === "correct" ? "correct" : isPicked && result === "wrong" ? "wrong" : null;
            return (
              <li key={jsonIndex}>
                <button
                  type="button"
                  onClick={() => choose(jsonIndex)}
                  disabled={pending || solved}
                  aria-pressed={isPicked}
                  data-testid="quiz-option"
                  className={cx(
                    "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-body transition-colors duration-[120ms] app:rounded-2xl",
                    state === "correct" && "border-success bg-success-soft text-ink",
                    state === "wrong" && "border-danger bg-danger-soft text-ink",
                    state === null && "border-line-strong bg-surface text-ink hover:bg-sunken",
                    (pending || solved) && state === null && "text-ink-muted",
                  )}
                >
                  <span className="flex-1">{options[jsonIndex]}</span>
                  {state === "correct" && <Icon name="check" size={18} className="text-success" />}
                  {state === "wrong" && <Icon name="x" size={18} className="text-danger" />}
                </button>
              </li>
            );
          })}
      </ul>
      <p role="status" aria-live="polite" className={cx("min-h-6 text-body-sm font-medium", result === "correct" ? "text-success" : result === "wrong" ? "text-danger" : "text-ink-muted")} data-testid="quiz-feedback">
        {result === "correct" ? t.correct : result === "wrong" ? t.wrong : result === "error" ? t.answerError : ""}
      </p>
    </fieldset>
  );
}
