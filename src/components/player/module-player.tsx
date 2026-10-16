"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/icons";
import { Badge, Button, cx, Kbd, Notice, StepSegments } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { OpenSandboxResult, PlayerActionResult, PlayerState } from "@/server/modules/player-types";
import { num, PlayerHeader } from "./kit";
import { ModuleResult } from "./module-result";
import { HintPanel, StepBody, type StepActions } from "./steps";

const t = getMessages().player;

export interface PlayerServerActions {
  start: (slug: string) => Promise<PlayerActionResult>;
  answer: (attemptId: string, stepId: string, answer: unknown) => Promise<PlayerActionResult>;
  hint: (attemptId: string, stepId: string, level: number) => Promise<PlayerActionResult>;
  checkClick: (attemptId: string, stepId: string) => Promise<PlayerActionResult>;
  skipClick: (attemptId: string, stepId: string) => Promise<PlayerActionResult>;
  openSandbox: (attemptId: string, stepId: string) => Promise<OpenSandboxResult>;
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
  GRADING_PENDING: getMessages().support.grading.pending,
  NOT_IMPROVED: t.prompt.notImproved,
  CLICK_NOT_YET: t.click.notYet,
  CLICK_UNAVAILABLE: t.click.unavailable,
} as const;

function errorText(code: string): string {
  return (t.errors as Record<string, string>)[code] ?? t.errors.generic;
}

/** True when the keyboard event comes from a control that uses arrow keys itself. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function ModulePlayer({ initial, actions }: { initial: PlayerState; actions: PlayerServerActions }) {
  const [state, setState] = useState(initial);
  const [index, setIndex] = useState(() => firstOpenIndex(initial));
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    // Move focus to the step heading on navigation (not on first load), and start the new step at the top.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
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

  const total = state.steps.length;
  const step = state.steps[index];
  const completed = state.status === "COMPLETED" && Boolean(state.result);
  const canGoNext = step ? step.status !== "open" : false;
  const isLast = index === total - 1;

  const goTo = (i: number) => {
    setMessage(null);
    setIndex(Math.max(0, Math.min(total - 1, i)));
  };

  // ← / → move between steps when focus is not in a field (radio groups and text keep their own arrow keys).
  useEffect(() => {
    if (completed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || isTyping(e.target)) return;
      if (e.key === "ArrowLeft" && index > 0) {
        setMessage(null);
        setIndex(index - 1);
      }
      if (e.key === "ArrowRight" && !isLast && canGoNext) {
        setMessage(null);
        setIndex(index + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [completed, index, isLast, canGoNext]);

  if (completed && state.result) {
    return (
      <ModuleResult
        state={state}
        result={state.result}
        heading={heading}
        message={message}
        pending={pending}
        onRetry={() =>
          run(async () => {
            const res = await actions.start(state.module.slug);
            if (res.ok) setIndex(firstOpenIndex(res.state));
            return res;
          })
        }
      />
    );
  }

  if (!step) return null;
  const id = state.attemptId;
  const stepActions: StepActions = {
    answer: (stepId, answer) => () => actions.answer(id, stepId, answer),
    checkClick: (stepId) => () => actions.checkClick(id, stepId),
    skipClick: (stepId) => () => actions.skipClick(id, stepId),
    openSandbox: (stepId) => actions.openSandbox(id, stepId),
  };
  const readOnly = state.status !== "IN_PROGRESS";
  const minutesLeft = Math.max(1, Math.ceil((state.module.minutes * (total - index)) / Math.max(1, total)));
  // The prompt result card carries its own "Næste trin"; the bar then steps down so there is one primary action.
  const resultCarriesNext = step.type === "PROMPT_TASK" && step.result?.gradingStatus === "GRADED" && !isLast;
  const notice = message ? <Notice tone={message.tone}>{message.text}</Notice> : undefined;
  // Opgavevisning: an open CLICK_TASK puts the task panel next to the sandbox, so the column widens on desktop.
  const taskView = step.type === "CLICK_TASK" && step.status === "open" && !readOnly;

  return (
    <div className="flex flex-1 flex-col">
      <div className={cx("mx-auto flex w-full max-w-read flex-1 flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-12 lg:pt-6", taskView && "lg:max-w-app")}>
        <header className="flex flex-col gap-6 rounded-card border border-line bg-surface p-5 sm:px-7 sm:py-6">
          <PlayerHeader title={state.module.title} />
          <nav aria-label={t.nav.stepList} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-overline uppercase">
                <span className="text-accent">{format(t.nav.progress, { current: index + 1, total })}</span>
                <span className="text-ink-muted"> · {t.nav.stepType[step.type]}</span>
              </p>
              <p className="font-mono text-mono text-ink-muted tabular-nums">{isLast ? t.nav.lastStep : format(t.nav.minutesLeft, { minutes: num(minutesLeft) })}</p>
            </div>
            <StepSegments current={index + 1} total={total} label={format(t.nav.progress, { current: index + 1, total })} />
          </nav>
        </header>

        <section aria-labelledby="step-title" className="flex flex-col gap-8" data-testid={`step-${step.id}`}>
          <div className="flex flex-col gap-3">
            <h2 id="step-title" ref={heading} tabIndex={-1} className="text-title-1 text-ink focus-visible:outline-none">
              {step.title}
            </h2>
            {step.points > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  <span className="font-mono tabular-nums">{format(t.nav.points, { points: num(step.points) })}</span>
                </Badge>
                {step.mustPass && (
                  <Badge tone="accent" icon="shield">
                    {t.nav.mustPass}
                  </Badge>
                )}
                {step.status !== "open" && step.type !== "READ" && step.type !== "DEMO" && (
                  <Badge tone="neutral" icon="check">
                    {t.nav.done}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <StepBody
            key={step.id}
            step={step}
            run={run}
            pending={pending}
            actions={stepActions}
            readOnly={readOnly}
            notice={notice}
            onNext={!isLast && canGoNext ? () => goTo(index + 1) : undefined}
          />
          <HintPanel step={step} run={run} pending={pending} take={(level) => () => actions.hint(id, step.id, level)} readOnly={readOnly} />
        </section>
        {isLast && !state.canFinish && (
          <p className="flex items-center gap-2 text-body-sm text-ink-muted">
            <Icon name="info" />
            {t.nav.finishHint}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm lg:rounded-br-panel">
        <div className="mx-auto flex h-16 w-full max-w-read items-center justify-between gap-3 px-4 sm:px-6">
          <Button type="button" variant="ghost" icon="arrowLeft" disabled={index === 0} className={index === 0 ? "invisible" : ""} onClick={() => goTo(index - 1)}>
            {t.nav.previous}
          </Button>
          <p className="hidden items-center gap-1.5 text-caption text-ink-subtle md:flex" aria-hidden="true">
            {t.nav.keyboard} <Kbd>←</Kbd> <Kbd>→</Kbd>
          </p>
          {!isLast ? (
            <Button type="button" variant={resultCarriesNext ? "secondary" : "primary"} trailingIcon="arrowRight" disabled={!canGoNext} onClick={() => goTo(index + 1)}>
              {step.type === "READ" || step.type === "DEMO" ? t.read.continue : t.nav.next}
            </Button>
          ) : (
            <Button type="button" trailingIcon="arrowRight" disabled={!state.canFinish || pending} onClick={() => run(() => actions.finish(id))}>
              {t.nav.finish}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
