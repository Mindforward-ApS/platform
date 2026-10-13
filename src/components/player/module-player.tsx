"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { PlayerActionResult, PlayerState } from "@/server/modules/player-types";
import { HintPanel, StepBody, type StepActions } from "./steps";

const t = getMessages().player;

export interface PlayerServerActions {
  start: (slug: string) => Promise<PlayerActionResult>;
  answer: (attemptId: string, stepId: string, answer: unknown) => Promise<PlayerActionResult>;
  hint: (attemptId: string, stepId: string, level: number) => Promise<PlayerActionResult>;
  checkClick: (attemptId: string, stepId: string) => Promise<PlayerActionResult>;
  skipClick: (attemptId: string, stepId: string) => Promise<PlayerActionResult>;
  finish: (attemptId: string) => Promise<PlayerActionResult>;
}

/** Where to resume: the READ/DEMO steps leading up to the first unanswered step (or the last step when all are done). */
function firstOpenIndex(state: PlayerState): number {
  let i = state.steps.findIndex((s) => s.status === "open");
  if (i === -1) return state.steps.length - 1;
  while (i > 0 && (state.steps[i - 1]?.type === "READ" || state.steps[i - 1]?.type === "DEMO")) i--;
  return i;
}

const NOTICES = {
  PII_REJECTED: t.prompt.piiRejected,
  GRADING_ERROR: t.prompt.gradingError,
  NOT_IMPROVED: t.prompt.notImproved,
  CLICK_NOT_YET: t.click.notYet,
  CLICK_UNAVAILABLE: t.click.unavailable,
} as const;

function errorText(code: string): string {
  return (t.errors as Record<string, string>)[code] ?? t.errors.generic;
}

export function ModulePlayer({ initial, actions }: { initial: PlayerState; actions: PlayerServerActions }) {
  const [state, setState] = useState(initial);
  const [index, setIndex] = useState(() => firstOpenIndex(initial));
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Move focus to the step heading on navigation (not on first load).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    heading.current?.focus();
  }, [index, state.status]);

  const run = (action: () => Promise<PlayerActionResult>) =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        const r = await action();
        if (r.ok) {
          setState(r.state);
          setMessage(r.notice ? { tone: r.notice === "NOT_IMPROVED" ? "info" : "error", text: NOTICES[r.notice] } : null);
        } else {
          setMessage({ tone: "error", text: errorText(r.error) });
        }
        resolve();
      });
    });

  const id = state.attemptId;
  const stepActions: StepActions = {
    answer: (stepId, answer) => () => actions.answer(id, stepId, answer),
    checkClick: (stepId) => () => actions.checkClick(id, stepId),
    skipClick: (stepId) => () => actions.skipClick(id, stepId),
  };

  if (state.status === "COMPLETED" && state.result) {
    const r = state.result;
    return (
      <section aria-labelledby="result-title" className="flex flex-col gap-4" data-testid="module-result">
        <h2 id="result-title" ref={heading} tabIndex={-1} className="text-xl font-semibold">
          {t.result.title}: {r.passed ? t.result.passed : t.result.notPassed}
        </h2>
        <p aria-live="polite">{format(t.result.scoreLine, { pct: r.scorePct, threshold: r.passThresholdPct })}</p>
        {r.mustPassFailed.length > 0 && (
          <Notice tone="error">
            {t.result.mustPassFailed} {r.mustPassFailed.map((m) => m.title).join(", ")}
          </Notice>
        )}
        <h3 className="font-semibold">{t.result.perStep}</h3>
        <ul className="flex flex-col gap-2">
          {r.steps.map((s) => (
            <li key={s.stepId} className="rounded-md border border-border p-2">
              <span className="font-semibold">{s.title}</span> — {s.passed ? t.status.passed : t.status.notPassed} · {format(t.result.stepPoints, { points: s.points, max: s.maxPoints })}
            </li>
          ))}
        </ul>
        {state.steps
          .filter((s) => s.type === "PROMPT_TASK" && s.criteria)
          .map((s) =>
            s.type === "PROMPT_TASK" ? (
              <section key={s.id} className="flex flex-col gap-2">
                <h3 className="font-semibold">
                  {s.title}: {t.prompt.criteria}
                </h3>
                <ul className="flex flex-col gap-1" data-testid="result-criteria">
                  {s.criteria?.map((c) => (
                    <li key={c.id}>
                      {c.label}
                      {c.score !== undefined && <> — {t.prompt.score[c.score]}</>}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        <p className="text-sm text-muted">{t.result.bestCounts}</p>
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await actions.start(state.module.slug);
                if (res.ok) setIndex(firstOpenIndex(res.state));
                return res;
              })
            }
          >
            {t.result.retry}
          </Button>
          <a className="rounded-md border border-border px-4 py-2" href="/moduler">
            {t.result.toModules}
          </a>
        </div>
      </section>
    );
  }

  const step = state.steps[index];
  if (!step) return null;
  const readOnly = state.status !== "IN_PROGRESS";
  const isLast = index === state.steps.length - 1;
  // Learners may not skip past a graded step they have not answered yet (server enforces order too).
  const canGoNext = step.status !== "open";

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t.nav.stepList}>
        <p className="text-sm text-muted">{format(t.nav.progress, { current: index + 1, total: state.steps.length })}</p>
      </nav>
      <section aria-labelledby="step-title" className="flex flex-col gap-3" data-testid={`step-${step.id}`}>
        <h2 id="step-title" ref={heading} tabIndex={-1} className="text-xl font-semibold">
          {step.title}
        </h2>
        {step.points > 0 && (
          <p className="text-sm text-muted">
            {format(t.nav.points, { points: step.points })}
            {step.mustPass && ` · ${t.nav.mustPass}`}
          </p>
        )}
        <StepBody key={step.id} step={step} run={run} pending={pending} actions={stepActions} readOnly={readOnly} />
        <div aria-live="polite">{message && <Notice tone={message.tone}>{message.text}</Notice>}</div>
        <HintPanel step={step} run={run} pending={pending} take={(level) => () => actions.hint(id, step.id, level)} readOnly={readOnly} />
      </section>
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={index === 0}
          onClick={() => {
            setMessage(null);
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          {t.nav.previous}
        </Button>
        {!isLast && (
          <Button
            type="button"
            disabled={!canGoNext}
            onClick={() => {
              setMessage(null);
              setIndex((i) => i + 1);
            }}
          >
            {step.type === "READ" || step.type === "DEMO" ? t.read.continue : t.nav.next}
          </Button>
        )}
        {isLast && (
          <Button type="button" disabled={!state.canFinish || pending} onClick={() => run(() => actions.finish(id))}>
            {t.nav.finish}
          </Button>
        )}
      </div>
      {isLast && !state.canFinish && <p className="text-sm text-muted">{t.nav.finishHint}</p>}
    </div>
  );
}
