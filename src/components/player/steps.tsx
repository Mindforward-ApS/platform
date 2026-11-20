"use client";

import dynamic from "next/dynamic";
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { Badge, Button, cx, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { OpenSandboxResult, PlayerActionResult, PlayerStep } from "@/server/modules/player-types";
import { ChoiceCard, ContextPanel, MarkRow, num, PassBadge, ScoreBar, type ChoiceState } from "./kit";
import { Markdown } from "./markdown";

// Step renderers for all 7 step types (docs/05 § 2, WCAG § 9). Pure UI: every decision is made on the server.

const t = getMessages().player;
type Run = (action: () => Promise<PlayerActionResult>) => Promise<void>;
type Of<T extends PlayerStep["type"]> = Extract<PlayerStep, { type: T }>;

export interface StepActions {
  answer: (stepId: string, answer: unknown) => () => Promise<PlayerActionResult>;
  checkClick: (stepId: string) => () => Promise<PlayerActionResult>;
  skipClick: (stepId: string) => () => Promise<PlayerActionResult>;
  openSandbox: (stepId: string) => Promise<OpenSandboxResult>;
}

interface Props<T extends PlayerStep["type"]> {
  step: Of<T>;
  run: Run;
  pending: boolean;
  actions: StepActions;
  readOnly: boolean;
  /** Server notice for this step (PII, grading error …); each step decides where it sits. */
  notice?: ReactNode;
  /** Go to the next step (PROMPT_TASK result footer). Undefined on the last step. */
  onNext?: () => void;
}

/** Compact graded outcome under an answered step: badge with icon + points in mono. */
function ResultLine({ step }: { step: PlayerStep }) {
  if (!step.result || step.result.gradingStatus !== "GRADED") return null;
  const r = step.result;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface px-4 py-3" data-testid={`step-result-${step.id}`}>
      <PassBadge passed={r.passed}>{r.passed ? t.status.passed : t.status.notPassed}</PassBadge>
      <span className="font-mono text-mono text-ink-muted tabular-nums">{format(t.status.points, { points: num(r.points), max: num(r.maxPoints) })}</span>
    </div>
  );
}

function Explanation({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <Notice tone="info" title={t.quiz.explanation}>
      {text}
    </Notice>
  );
}

function SubmitRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function Read({ step }: Props<"READ">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-body-lg text-ink">
        <Markdown text={step.body} />
      </div>
      {step.image && (
        <figure className="overflow-hidden rounded-lg border border-line bg-surface">
          {/* Module images are local content assets with required alt text. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={step.image.src} alt={step.image.alt} className="block h-auto w-full" />
        </figure>
      )}
    </div>
  );
}

function Demo({ step }: Props<"DEMO">) {
  // Static frames with text (also the prefers-reduced-motion version, docs/05 § 2).
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-lg text-ink">{t.demo.intro}</p>
      <ol className="overflow-hidden rounded-lg border border-line bg-surface">
        {step.frames.map((f, i) => (
          <li key={i} className="flex gap-4 border-line px-5 py-4 not-first:border-t">
            <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-sunken font-mono text-mono text-ink-muted ring-1 ring-line ring-inset">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="sr-only">{format(t.demo.frame, { n: i + 1, total: step.frames.length })}</p>
              <p className="flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
                <Badge tone="neutral">{t.demo.action[f.action]}</Badge>
                <span className="font-medium text-ink">{f.target}</span>
              </p>
              {f.text && <p className="rounded-sm border border-line bg-sunken px-3 py-2 text-body text-ink">{f.text}</p>}
              <p className="text-body text-ink">{f.caption}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Opgavevisning (docs/01 § 4.1.7 + L4): the sandbox is desktop-first (≥ 1024 px, docs/01 § 6) and only loaded there.
const DESKTOP_QUERY = "(min-width: 1024px)";
const subscribeDesktop = (onChange: () => void) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const isDesktop = () => window.matchMedia(DESKTOP_QUERY).matches;

const SandboxApp = dynamic(() => import("@/components/sandbox/sandbox-app").then((m) => m.SandboxApp), {
  ssr: false,
  loading: () => <SandboxStatus text={t.click.sandboxLoading} />,
});

function SandboxStatus({ text, tone = "muted" }: { text: string; tone?: "muted" | "error" }) {
  return (
    <div className="flex h-[min(44rem,calc(100dvh-8rem))] min-h-[520px] flex-col items-center justify-center gap-3 rounded-xl border border-line bg-sunken px-6 text-center" role="status">
      <span className="grid size-10 place-items-center rounded-md border border-line bg-surface text-ink-muted">
        <Icon name="sandbox" size={20} />
      </span>
      <p className={cx("max-w-sm text-body-sm", tone === "error" ? "text-ink" : "text-ink-muted")}>{text}</p>
    </div>
  );
}

/** The attempt-bound sandbox for this step, opened through the player's server action (session + props server-side). */
function StepSandbox({ stepId, open }: { stepId: string; open: StepActions["openSandbox"] }) {
  const desktop = useSyncExternalStore(subscribeDesktop, isDesktop, () => false);
  const [result, setResult] = useState<OpenSandboxResult | null>(null);
  const load = useEffectEvent(() => open(stepId));

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    load().then(
      (r) => !cancelled && setResult(r),
      () => !cancelled && setResult({ ok: false, error: "generic" }),
    );
    return () => {
      cancelled = true;
    };
  }, [desktop, stepId]);

  if (!desktop) return null;
  if (!result) return <SandboxStatus text={t.click.sandboxLoading} />;
  if (!result.ok) return <SandboxStatus text={t.click.sandboxError} tone="error" />;
  return <SandboxApp key={result.sandbox.sessionId} {...result.sandbox} stepId={stepId} variant="task" />;
}

function ClickTask({ step, run, pending, actions, readOnly, notice }: Props<"CLICK_TASK">) {
  const open = step.status === "open" && !readOnly;
  const skipped = (step.result?.answer as { skipped?: boolean } | null)?.skipped === true;
  return (
    <div className={cx("flex flex-col gap-6", open && "lg:grid lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:items-start lg:gap-8")}>
      <div className={cx("flex flex-col gap-6", open && "lg:sticky lg:top-6")} aria-label={open ? t.click.taskLabel : undefined} role={open ? "region" : undefined}>
        <p className="text-body-lg text-ink">{step.instruction}</p>
        {open && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line-strong bg-sunken px-6 py-10 text-center lg:hidden" data-testid="sandbox-desktop-only">
            <span className="grid size-10 place-items-center rounded-md border border-line bg-surface text-ink-muted">
              <Icon name="sandbox" size={20} />
            </span>
            <p className="text-label text-ink">{t.click.desktopTitle}</p>
            <p className="max-w-sm text-body-sm text-ink-muted">{t.click.desktopBody}</p>
          </div>
        )}
        {notice}
        {open && (
          <SubmitRow>
            {/* "Tjek" needs the sandbox, which only opens on desktop; skipping works everywhere. */}
            <span className="hidden lg:contents">
              <Button type="button" disabled={pending} onClick={() => run(actions.checkClick(step.id))}>
                {t.click.check}
              </Button>
            </span>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => run(actions.skipClick(step.id))}>
              {t.click.skip}
            </Button>
          </SubmitRow>
        )}
        {step.successMessage && (
          <Notice tone="success" title={t.click.passed}>
            {step.successMessage}
          </Notice>
        )}
        {skipped && <Notice tone="info">{t.click.skipped}</Notice>}
        <ResultLine step={step} />
      </div>
      {open && (
        <section aria-label={t.click.sandboxLabel} className="mf-sandbox hidden min-w-0 lg:block" data-testid="step-sandbox">
          <StepSandbox stepId={step.id} open={actions.openSandbox} />
        </section>
      )}
    </div>
  );
}

const CRITERION = {
  2: { mark: "ok", word: t.prompt.score[2] },
  1: { mark: "partial", word: t.prompt.score[1] },
  0: { mark: "miss", word: t.prompt.score[0] },
} as const;

function PromptTask({ step, run, pending, actions, readOnly, notice, onNext }: Props<"PROMPT_TASK">) {
  const [text, setText] = useState(step.lastSubmission ?? "");
  const field = useRef<HTMLTextAreaElement>(null);
  const canSubmit = step.status !== "closed" && !readOnly;
  const nearLimit = text.length >= Math.floor(step.maxChars * 0.9);
  const counterId = `${step.id}-counter`;
  const graded = step.result?.gradingStatus === "GRADED" ? step.result : undefined;
  const left = graded ? graded.submissionsLeft : step.maxSubmissions;
  const pct = graded ? Math.round((graded.points / Math.max(1, graded.maxPoints)) * 100) : 0;
  const submit = () => {
    if (pending || text.trim().length === 0) return;
    void run(actions.answer(step.id, { text }));
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-lg text-ink">{step.instruction}</p>
      <ContextPanel title={t.prompt.scenario} icon="file">
        <p>{step.scenario}</p>
        {step.attachments.length > 0 && (
          <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
            <p className="text-caption text-ink-muted">{t.prompt.attachments}</p>
            <ul className="flex flex-wrap gap-2">
              {step.attachments.map((a) => (
                <li key={a} className="inline-flex h-8 items-center gap-2 rounded-sm border border-line bg-sunken px-2.5 text-body-sm text-ink">
                  <Icon name="file" size={14} className="text-ink-muted" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ContextPanel>

      {canSubmit && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor={`${step.id}-text`} className="text-label text-ink">
            {t.prompt.label}
          </label>
          {notice}
          <div className="overflow-hidden rounded-lg border border-line-strong bg-surface shadow-xs transition-[border-color,box-shadow] duration-[120ms] focus-within:border-accent focus-within:shadow-ring">
            <textarea
              ref={field}
              id={`${step.id}-text`}
              className="block min-h-40 w-full resize-y bg-transparent px-4 pt-4 pb-2 text-body leading-[26px] text-ink placeholder:text-ink-subtle focus-visible:outline-none read-only:text-ink-muted"
              value={text}
              maxLength={step.maxChars}
              readOnly={pending}
              aria-describedby={counterId}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line py-2.5 pr-3 pl-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span aria-hidden="true" className="font-mono text-mono text-ink-muted tabular-nums">
                  {format(t.prompt.counterShort, { count: num(text.length), max: num(step.maxChars) })}
                </span>
                <span id={counterId} className="sr-only">
                  {format(t.prompt.counter, { count: num(text.length), max: num(step.maxChars) })}
                </span>
                <span className="inline-flex items-center gap-1.5 text-caption text-ink-muted">
                  <Icon name="lock" size={14} />
                  {t.prompt.privacy}
                </span>
              </div>
              {/* Once a result is shown, "Næste trin" is the primary action; sending again steps down to secondary. */}
              <Button type="submit" variant={graded ? "secondary" : "primary"} disabled={pending || text.trim().length === 0}>
                {pending ? t.prompt.submitting : t.prompt.submit}
              </Button>
            </div>
          </div>
          {/* Announced once the learner reaches 90 % of the limit (docs/05 § 9). */}
          <p className="sr-only" aria-live="polite">
            {nearLimit ? format(t.prompt.counterNearLimit, { count: num(text.length), max: num(step.maxChars) }) : ""}
          </p>
          {left !== undefined && left > 0 && <p className="text-body-sm text-ink-muted">{format(t.prompt.submissionsLeft, { left })}</p>}
        </form>
      )}
      {!canSubmit && notice}

      {graded && (
        <section aria-labelledby={`${step.id}-criteria`} className="overflow-hidden rounded-lg border border-line bg-surface" data-testid="prompt-feedback">
          <div className="flex flex-col gap-5 border-b border-line p-6 sm:flex-row sm:items-center sm:gap-8">
            <p className="flex items-baseline text-ink tabular-nums">
              <span className="text-display">{pct}</span>
              <span className="ml-1 text-title-2 font-medium text-ink-muted">%</span>
            </p>
            <div className="flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-2" data-testid={`step-result-${step.id}`}>
                <PassBadge passed={graded.passed}>{graded.passed ? t.prompt.passedStep : t.prompt.notPassedStep}</PassBadge>
                <span className="font-mono text-mono text-ink-muted tabular-nums">{format(t.status.points, { points: num(graded.points), max: num(graded.maxPoints) })}</span>
              </div>
              <h3 id={`${step.id}-criteria`} className="text-title-3 text-ink">
                {t.prompt.criteria}
              </h3>
              <ScoreBar pct={pct} passed={graded.passed} label={format(t.status.points, { points: num(graded.points), max: num(graded.maxPoints) })} />
            </div>
          </div>
          {(graded.blockedMessage || (graded.warnings ?? []).length > 0) && (
            <div className="flex flex-col gap-3 border-b border-line px-6 py-4">
              {graded.blockedMessage && (
                <Notice tone="danger" title={t.prompt.blocked}>
                  {graded.blockedMessage}
                </Notice>
              )}
              {(graded.warnings ?? []).length > 0 && (
                <Notice tone="hint" title={t.prompt.warnings}>
                  <ul className="flex list-disc flex-col gap-1 pl-5">
                    {graded.warnings?.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </Notice>
              )}
            </div>
          )}
          {step.criteria && (
            <ul className="divide-y divide-line px-6 py-1" data-testid="rubric-criteria">
              {step.criteria.map((c) => {
                const look = c.score !== undefined ? CRITERION[c.score] : undefined;
                return (
                  <MarkRow
                    key={c.id}
                    mark={look?.mark ?? "none"}
                    title={c.label}
                    reason={c.feedback}
                    word={look?.word}
                    points={c.score !== undefined ? format(t.status.pointsShort, { points: c.score, max: 2 }) : "–"}
                  />
                );
              })}
            </ul>
          )}
          {graded.overallFeedback && <p className="border-t border-line px-6 py-4 text-body text-ink">{graded.overallFeedback}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-sunken px-6 py-4">
            <p className="text-body-sm text-ink-muted">{step.status !== "closed" && left ? format(t.prompt.submissionsLeft, { left }) : graded.passed ? t.result.bestCounts : t.prompt.noneLeft}</p>
            <div className="flex flex-wrap gap-3">
              {canSubmit && (
                <Button
                  type="button"
                  variant={graded.passed ? "secondary" : "primary"}
                  onClick={() => {
                    field.current?.focus();
                    field.current?.scrollIntoView({ block: "center", behavior: "smooth" });
                  }}
                >
                  {t.prompt.retry}
                </Button>
              )}
              {onNext && (
                <Button type="button" variant={!graded.passed && canSubmit ? "secondary" : "primary"} trailingIcon="arrowRight" onClick={onNext}>
                  {t.nav.nextStep}
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {step.exampleSolution && (
        <ContextPanel title={t.prompt.exampleSolution} icon="bulb" tone="sunken">
          <p className="whitespace-pre-line">{step.exampleSolution}</p>
        </ContextPanel>
      )}
    </div>
  );
}

function Quiz({ step, run, pending, actions, readOnly }: Props<"QUIZ">) {
  const own = (step.result?.answer as { optionIds?: string[] } | null)?.optionIds ?? [];
  const [selected, setSelected] = useState<string[]>(own);
  const answered = step.status !== "open";
  const toggle = (id: string) => setSelected((cur) => (step.multiSelect ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
  const stateOf = (o: (typeof step.options)[number]): ChoiceState => {
    if (!answered) return selected.includes(o.id) ? "selected" : "idle";
    if (o.correct) return "correct";
    return own.includes(o.id) ? "wrong" : "muted";
  };
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void run(actions.answer(step.id, { optionIds: selected }));
      }}
    >
      <fieldset className="flex flex-col gap-4" disabled={answered || readOnly}>
        <legend className="mb-4 flex flex-col gap-1">
          <span className="text-body-lg text-ink">{step.question}</span>
          <span className="text-body-sm text-ink-muted">{step.multiSelect ? t.quiz.chooseMany : t.quiz.chooseOne}</span>
        </legend>
        <ul className="flex flex-col gap-3">
          {step.options.map((o) => {
            const mine = own.includes(o.id);
            return (
              <ChoiceCard
                key={o.id}
                type={step.multiSelect ? "checkbox" : "radio"}
                name={step.id}
                value={o.id}
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
                state={stateOf(o)}
                badges={
                  answered && (o.correct || mine) ? (
                    <>
                      {o.correct && (
                        <Badge tone="success" icon="check">
                          {t.quiz.correct}
                        </Badge>
                      )}
                      {mine && !o.correct && (
                        <Badge tone="danger" icon="x">
                          {t.quiz.wrong}
                        </Badge>
                      )}
                      {mine && <Badge tone="neutral">{t.quiz.yourChoice}</Badge>}
                    </>
                  ) : undefined
                }
                feedback={answered ? o.feedback : undefined}
              >
                {o.text}
              </ChoiceCard>
            );
          })}
        </ul>
      </fieldset>
      {!answered && !readOnly && (
        <SubmitRow>
          <Button type="submit" disabled={pending || selected.length === 0}>
            {t.quiz.submit}
          </Button>
        </SubmitRow>
      )}
      <ResultLine step={step} />
      <Explanation text={step.explanation} />
    </form>
  );
}

function SpotError({ step, run, pending, actions, readOnly }: Props<"SPOT_ERROR">) {
  const own = (step.result?.answer as { segmentIds?: string[] } | null)?.segmentIds ?? [];
  const [marked, setMarked] = useState<string[]>(own);
  const answered = step.status !== "open";
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body-lg text-ink">{step.instruction}</p>
      <div className="grid gap-4">
        <ContextPanel title={t.spot.question} icon="chat" tone="sunken">
          <p>{step.userPrompt}</p>
        </ContextPanel>
        <ContextPanel title={t.spot.facts} icon="file">
          <Markdown text={step.referenceFacts} />
        </ContextPanel>
      </div>
      <section className="flex flex-col gap-3" aria-labelledby={`${step.id}-answer`}>
        <h3 id={`${step.id}-answer`} className="text-title-3 text-ink">
          {t.spot.answer}
        </h3>
        <ul className="flex flex-col gap-2">
          {step.segments.map((s) => {
            const on = marked.includes(s.id);
            const errorLabel = s.isError ? `${t.spot.isError}${s.errorType ? ` · ${t.spot.errorType[s.errorType as keyof typeof t.spot.errorType] ?? s.errorType}` : ""}` : t.spot.notError;
            return (
              <li key={s.id} className="flex flex-col gap-2">
                <button
                  type="button"
                  aria-pressed={on}
                  disabled={answered || readOnly}
                  onClick={() => setMarked((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}
                  className={cx(
                    "flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-body text-ink transition-[border-color,background-color,box-shadow] duration-[120ms] ease-out disabled:cursor-default",
                    on ? "border-hint bg-hint-soft" : "border-line bg-surface enabled:hover:border-line-strong enabled:hover:shadow-xs",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cx("mt-0.5 grid size-5 shrink-0 place-items-center rounded-xs border", on ? "border-rav bg-rav text-on-rav" : "border-line-strong bg-surface")}
                  >
                    {on && <Icon name="check" size={14} strokeWidth={2.25} />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    {/* Text marker in addition to styling (WCAG 1.4.1). */}
                    {on && <span className="text-caption text-hint">{t.spot.marked}</span>}
                    <span>{s.text}</span>
                  </span>
                </button>
                {answered && (
                  <div className="flex flex-col gap-1 pl-12 text-body-sm">
                    <span className="flex flex-wrap gap-2">
                      {s.isError ? (
                        <Badge tone={own.includes(s.id) ? "success" : "danger"} icon={own.includes(s.id) ? "check" : "x"}>
                          {own.includes(s.id) ? t.spot.found : t.spot.missed}
                        </Badge>
                      ) : own.includes(s.id) ? (
                        <Badge tone="danger" icon="x">
                          {t.quiz.wrong}
                        </Badge>
                      ) : null}
                      <Badge tone={s.isError ? "hint" : "neutral"}>{errorLabel}</Badge>
                    </span>
                    {s.explanation && <span className="text-ink-muted">{s.explanation}</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {!answered && !readOnly && (
        <SubmitRow>
          <Button type="button" disabled={pending} onClick={() => run(actions.answer(step.id, { segmentIds: marked }))}>
            {t.spot.submit}
          </Button>
        </SubmitRow>
      )}
      <ResultLine step={step} />
    </div>
  );
}

const VERDICT = {
  CORRECT: { state: "correct", tone: "success", icon: "check" },
  PARTIAL: { state: "partial", tone: "hint", icon: "dash" },
  WRONG: { state: "wrong", tone: "danger", icon: "x" },
} as const;

function Judgment({ step, run, pending, actions, readOnly }: Props<"JUDGMENT">) {
  const own = (step.result?.answer as { optionId?: string } | null)?.optionId;
  const [selected, setSelected] = useState<string | undefined>(own);
  const answered = step.status !== "open";
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected) void run(actions.answer(step.id, { optionId: selected }));
      }}
    >
      <ContextPanel title={t.judgment.category[step.category as keyof typeof t.judgment.category] ?? step.category} icon="shield">
        <p className="text-body-lg">{step.scenario}</p>
      </ContextPanel>
      <fieldset className="flex flex-col gap-4" disabled={answered || readOnly}>
        <legend className="mb-4 text-body-lg text-ink">{step.question}</legend>
        <ul className="flex flex-col gap-3">
          {step.options.map((o) => {
            const v = answered && o.verdict ? VERDICT[o.verdict] : undefined;
            const mine = own === o.id;
            const state: ChoiceState = !answered ? (selected === o.id ? "selected" : "idle") : v && (mine || o.verdict === "CORRECT") ? v.state : "muted";
            return (
              <ChoiceCard
                key={o.id}
                type="radio"
                name={step.id}
                value={o.id}
                checked={selected === o.id}
                onChange={() => setSelected(o.id)}
                state={state}
                badges={
                  v && o.verdict ? (
                    <>
                      <Badge tone={v.tone} icon={v.icon}>
                        {t.judgment.verdict[o.verdict]}
                      </Badge>
                      {mine && <Badge tone="neutral">{t.quiz.yourChoice}</Badge>}
                    </>
                  ) : undefined
                }
                feedback={answered ? o.feedback : undefined}
              >
                {o.text}
              </ChoiceCard>
            );
          })}
        </ul>
      </fieldset>
      {!answered && !readOnly && (
        <SubmitRow>
          <Button type="submit" disabled={pending || !selected}>
            {t.judgment.submit}
          </Button>
        </SubmitRow>
      )}
      <ResultLine step={step} />
      <Explanation text={step.explanation} />
    </form>
  );
}

export function StepBody(props: Omit<Props<PlayerStep["type"]>, "step"> & { step: PlayerStep }) {
  const { step } = props;
  const withNotice = (node: ReactNode) => (
    <>
      {node}
      {props.notice}
    </>
  );
  switch (step.type) {
    case "READ":
      return withNotice(<Read {...props} step={step} />);
    case "DEMO":
      return withNotice(<Demo {...props} step={step} />);
    case "CLICK_TASK":
      return <ClickTask {...props} step={step} />;
    case "PROMPT_TASK":
      return <PromptTask {...props} step={step} />;
    case "QUIZ":
      return withNotice(<Quiz {...props} step={step} />);
    case "SPOT_ERROR":
      return withNotice(<SpotError {...props} step={step} />);
    case "JUDGMENT":
      return withNotice(<Judgment {...props} step={step} />);
  }
}

const HINT_META = { 1: t.hints.metaNone, 2: t.hints.metaHalf, 3: t.hints.metaAll } as const;

export function HintPanel({ step, run, pending, take, readOnly }: { step: PlayerStep; run: Run; pending: boolean; take: (level: number) => () => Promise<PlayerActionResult>; readOnly: boolean }) {
  if (step.hintCount === 0) return null;
  const next = step.hintLevelUsed + 1;
  const canTake = !readOnly && step.status !== "closed" && next <= 3;
  const cost = next === 1 ? t.hints.costNone : next === 2 ? t.hints.costHalf : t.hints.costAll;
  if (step.hints.length === 0 && !canTake) return null;
  return (
    <aside aria-labelledby={`${step.id}-hints`} className="flex flex-col gap-3 border-t border-line pt-6">
      <h3 id={`${step.id}-hints`} className="flex items-center gap-2 text-label text-ink">
        <Icon name="bulb" className="text-ink-muted" />
        {t.hints.title}
      </h3>
      <div aria-live="polite" className="flex flex-col gap-2">
        {step.hints.map((h) => (
          <Notice key={h.level} tone="hint" title={format(t.hints.level, { level: h.level })} meta={HINT_META[h.level]}>
            {h.text}
          </Notice>
        ))}
      </div>
      {canTake && (
        <div className="flex flex-col items-start gap-2">
          <Button type="button" variant="secondary" size="sm" icon="bulb" disabled={pending} onClick={() => run(take(next))}>
            {next === 3 ? t.hints.solution : format(t.hints.take, { level: next })}
          </Button>
          <p className="text-body-sm text-ink-muted">{cost}</p>
        </div>
      )}
    </aside>
  );
}
