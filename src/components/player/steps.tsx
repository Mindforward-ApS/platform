"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { PlayerActionResult, PlayerStep } from "@/server/modules/player-types";
import { Markdown } from "./markdown";

// Step renderers for all 7 step types (docs/05 § 2, WCAG § 9). Pure UI: every decision is made on the server.

const t = getMessages().player;
type Run = (action: () => Promise<PlayerActionResult>) => Promise<void>;
type Of<T extends PlayerStep["type"]> = Extract<PlayerStep, { type: T }>;

export interface StepActions {
  answer: (stepId: string, answer: unknown) => () => Promise<PlayerActionResult>;
  checkClick: (stepId: string) => () => Promise<PlayerActionResult>;
  skipClick: (stepId: string) => () => Promise<PlayerActionResult>;
}

interface Props<T extends PlayerStep["type"]> {
  step: Of<T>;
  run: Run;
  pending: boolean;
  actions: StepActions;
  readOnly: boolean;
}

function ResultLine({ step }: { step: PlayerStep }) {
  if (!step.result || step.result.gradingStatus !== "GRADED") return null;
  return (
    <p className="font-semibold" data-testid={`step-result-${step.id}`}>
      {step.result.passed ? t.status.passed : t.status.notPassed} · {format(t.status.points, { points: step.result.points, max: step.result.maxPoints })}
    </p>
  );
}

function Read({ step }: Props<"READ">) {
  return (
    <>
      <Markdown text={step.body} />
      {step.image && (
        // Module images are local content assets with required alt text.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={step.image.src} alt={step.image.alt} className="max-w-full rounded-md" />
      )}
    </>
  );
}

function Demo({ step }: Props<"DEMO">) {
  // Static frames with text (also the prefers-reduced-motion version, docs/05 § 2).
  return (
    <>
      <p>{t.demo.intro}</p>
      <ol className="flex flex-col gap-2">
        {step.frames.map((f, i) => (
          <li key={i} className="rounded-md border border-border p-3">
            <p className="text-sm text-muted">{format(t.demo.frame, { n: i + 1, total: step.frames.length })}</p>
            <p>
              {t.demo.action[f.action]}: <code>{f.target}</code>
            </p>
            {f.text && <p className="font-mono">{f.text}</p>}
            <p>{f.caption}</p>
          </li>
        ))}
      </ol>
    </>
  );
}

function ClickTask({ step, run, pending, actions, readOnly }: Props<"CLICK_TASK">) {
  const open = step.status === "open" && !readOnly;
  const skipped = (step.result?.answer as { skipped?: boolean } | null)?.skipped === true;
  return (
    <>
      <p>{step.instruction}</p>
      <div className="rounded-md border border-dashed border-border bg-surface p-4 text-sm" data-testid="sandbox-placeholder">
        {t.click.sandboxPlaceholder}
      </div>
      {open && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => run(actions.checkClick(step.id))}>
            {t.click.check}
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => run(actions.skipClick(step.id))}>
            {t.click.skip}
          </Button>
        </div>
      )}
      {step.successMessage && <p>{step.successMessage}</p>}
      {skipped && <p>{t.click.skipped}</p>}
      <ResultLine step={step} />
    </>
  );
}

function PromptTask({ step, run, pending, actions, readOnly }: Props<"PROMPT_TASK">) {
  const [text, setText] = useState(step.lastSubmission ?? "");
  const canSubmit = step.status !== "closed" && !readOnly;
  const nearLimit = text.length >= Math.floor(step.maxChars * 0.9);
  const counterId = `${step.id}-counter`;
  return (
    <>
      <p>{step.instruction}</p>
      <section aria-labelledby={`${step.id}-scenario`} className="rounded-md bg-surface p-3">
        <h3 id={`${step.id}-scenario`} className="font-semibold">
          {t.prompt.scenario}
        </h3>
        <p>{step.scenario}</p>
        {step.attachments.length > 0 && (
          <p className="text-sm text-muted">
            {t.prompt.attachments}: {step.attachments.join(", ")}
          </p>
        )}
      </section>
      {canSubmit && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(actions.answer(step.id, { text }));
          }}
        >
          <label htmlFor={`${step.id}-text`} className="font-semibold">
            {t.prompt.label}
          </label>
          <textarea
            id={`${step.id}-text`}
            className="min-h-40 rounded-md border border-border bg-bg p-3"
            value={text}
            maxLength={step.maxChars}
            aria-describedby={counterId}
            onChange={(e) => setText(e.target.value)}
          />
          <p id={counterId} className="text-sm text-muted">
            {format(t.prompt.counter, { count: text.length, max: step.maxChars })}
          </p>
          {/* Announced once the learner reaches 90 % of the limit (docs/05 § 9). */}
          <p className="sr-only" aria-live="polite">
            {nearLimit ? format(t.prompt.counterNearLimit, { count: text.length, max: step.maxChars }) : ""}
          </p>
          <div>
            <Button type="submit" disabled={pending || text.trim().length === 0}>
              {pending ? t.prompt.submitting : t.prompt.submit}
            </Button>
          </div>
        </form>
      )}
      {step.result?.gradingStatus === "GRADED" && (
        <section aria-labelledby={`${step.id}-criteria`} className="flex flex-col gap-2" data-testid="prompt-feedback">
          <ResultLine step={step} />
          {step.result.blockedMessage && (
            <p>
              <strong>{t.prompt.blocked}:</strong> {step.result.blockedMessage}
            </p>
          )}
          {(step.result.warnings ?? []).length > 0 && (
            <div>
              <strong>{t.prompt.warnings}:</strong>
              <ul className="list-disc pl-6">
                {step.result.warnings?.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {step.criteria && (
            <>
              <h3 id={`${step.id}-criteria`} className="font-semibold">
                {t.prompt.criteria}
              </h3>
              <ul className="flex flex-col gap-2" data-testid="rubric-criteria">
                {step.criteria.map((c) => (
                  <li key={c.id} className="rounded-md border border-border p-2">
                    <span className="font-semibold">{c.label}</span>
                    {c.score !== undefined && <span> — {t.prompt.score[c.score]}</span>}
                    {c.feedback && <p className="text-sm">{c.feedback}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
          {step.result.overallFeedback && <p>{step.result.overallFeedback}</p>}
          <p className="text-sm text-muted">
            {step.result.submissionsLeft && step.status !== "closed" ? format(t.prompt.submissionsLeft, { left: step.result.submissionsLeft }) : step.result.passed ? "" : t.prompt.noneLeft}
          </p>
        </section>
      )}
      {step.exampleSolution && (
        <section className="rounded-md bg-surface p-3">
          <h3 className="font-semibold">{t.prompt.exampleSolution}</h3>
          <p>{step.exampleSolution}</p>
        </section>
      )}
    </>
  );
}

function Quiz({ step, run, pending, actions, readOnly }: Props<"QUIZ">) {
  const own = (step.result?.answer as { optionIds?: string[] } | null)?.optionIds ?? [];
  const [selected, setSelected] = useState<string[]>(own);
  const answered = step.status !== "open";
  const toggle = (id: string) => setSelected((cur) => (step.multiSelect ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id]));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void run(actions.answer(step.id, { optionIds: selected }));
      }}
    >
      <fieldset className="flex flex-col gap-2" disabled={answered || readOnly}>
        <legend className="mb-2">
          {step.question} <span className="text-sm text-muted">({step.multiSelect ? t.quiz.chooseMany : t.quiz.chooseOne})</span>
        </legend>
        {step.options.map((o) => (
          <div key={o.id} className="rounded-md border border-border p-2">
            <label className="flex min-h-6 items-start gap-2">
              <input
                type={step.multiSelect ? "checkbox" : "radio"}
                name={step.id}
                value={o.id}
                className="mt-1 size-5"
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
              />
              <span>{o.text}</span>
            </label>
            {answered && (
              <p className="pl-7 text-sm">
                {o.correct ? <strong>{t.quiz.correct}. </strong> : null}
                {own.includes(o.id) ? <em>{t.quiz.yourChoice}. </em> : null}
                {o.feedback}
              </p>
            )}
          </div>
        ))}
      </fieldset>
      {!answered && !readOnly && (
        <div>
          <Button type="submit" disabled={pending || selected.length === 0}>
            {t.quiz.submit}
          </Button>
        </div>
      )}
      {step.explanation && (
        <p>
          <strong>{t.quiz.explanation}:</strong> {step.explanation}
        </p>
      )}
      <ResultLine step={step} />
    </form>
  );
}

function SpotError({ step, run, pending, actions, readOnly }: Props<"SPOT_ERROR">) {
  const own = (step.result?.answer as { segmentIds?: string[] } | null)?.segmentIds ?? [];
  const [marked, setMarked] = useState<string[]>(own);
  const answered = step.status !== "open";
  return (
    <div className="flex flex-col gap-3">
      <p>{step.instruction}</p>
      <section className="rounded-md bg-surface p-3">
        <h3 className="font-semibold">{t.spot.question}</h3>
        <p>{step.userPrompt}</p>
      </section>
      <section className="rounded-md bg-surface p-3">
        <h3 className="font-semibold">{t.spot.facts}</h3>
        <Markdown text={step.referenceFacts} />
      </section>
      <h3 className="font-semibold">{t.spot.answer}</h3>
      <ul className="flex flex-col gap-2">
        {step.segments.map((s) => {
          const on = marked.includes(s.id);
          return (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={on}
                disabled={answered || readOnly}
                onClick={() => setMarked((cur) => (cur.includes(s.id) ? cur.filter((x) => x !== s.id) : [...cur, s.id]))}
                className={`min-h-6 w-full rounded-md border p-2 text-left ${on ? "border-fg bg-surface font-semibold" : "border-border"}`}
              >
                {/* Text marker in addition to styling (WCAG 1.4.1). */}
                {on && <span>[{t.spot.marked}] </span>}
                {s.text}
              </button>
              {answered && (
                <p className="text-sm">
                  <strong>{s.isError ? `${t.spot.isError}${s.errorType ? ` (${t.spot.errorType[s.errorType as keyof typeof t.spot.errorType]})` : ""}` : t.spot.notError}.</strong> {s.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {!answered && !readOnly && (
        <div>
          <Button type="button" disabled={pending} onClick={() => run(actions.answer(step.id, { segmentIds: marked }))}>
            {t.spot.submit}
          </Button>
        </div>
      )}
      <ResultLine step={step} />
    </div>
  );
}

function Judgment({ step, run, pending, actions, readOnly }: Props<"JUDGMENT">) {
  const own = (step.result?.answer as { optionId?: string } | null)?.optionId;
  const [selected, setSelected] = useState<string | undefined>(own);
  const answered = step.status !== "open";
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (selected) void run(actions.answer(step.id, { optionId: selected }));
      }}
    >
      <p className="text-sm text-muted">{t.judgment.category[step.category as keyof typeof t.judgment.category]}</p>
      <p>{step.scenario}</p>
      <fieldset className="flex flex-col gap-2" disabled={answered || readOnly}>
        <legend className="mb-2">{step.question}</legend>
        {step.options.map((o) => (
          <div key={o.id} className="rounded-md border border-border p-2">
            <label className="flex min-h-6 items-start gap-2">
              <input type="radio" name={step.id} value={o.id} className="mt-1 size-5" checked={selected === o.id} onChange={() => setSelected(o.id)} />
              <span>{o.text}</span>
            </label>
            {answered && o.verdict && (
              <p className="pl-7 text-sm">
                <strong>{t.judgment.verdict[o.verdict]}. </strong>
                {own === o.id ? <em>{t.quiz.yourChoice}. </em> : null}
                {o.feedback}
              </p>
            )}
          </div>
        ))}
      </fieldset>
      {!answered && !readOnly && (
        <div>
          <Button type="submit" disabled={pending || !selected}>
            {t.judgment.submit}
          </Button>
        </div>
      )}
      {step.explanation && (
        <p>
          <strong>{t.quiz.explanation}:</strong> {step.explanation}
        </p>
      )}
      <ResultLine step={step} />
    </form>
  );
}

export function StepBody(props: { step: PlayerStep; run: Run; pending: boolean; actions: StepActions; readOnly: boolean }) {
  const { step } = props;
  switch (step.type) {
    case "READ":
      return <Read {...props} step={step} />;
    case "DEMO":
      return <Demo {...props} step={step} />;
    case "CLICK_TASK":
      return <ClickTask {...props} step={step} />;
    case "PROMPT_TASK":
      return <PromptTask {...props} step={step} />;
    case "QUIZ":
      return <Quiz {...props} step={step} />;
    case "SPOT_ERROR":
      return <SpotError {...props} step={step} />;
    case "JUDGMENT":
      return <Judgment {...props} step={step} />;
  }
}

export function HintPanel({ step, run, pending, take, readOnly }: { step: PlayerStep; run: Run; pending: boolean; take: (level: number) => () => Promise<PlayerActionResult>; readOnly: boolean }) {
  if (step.hintCount === 0) return null;
  const next = step.hintLevelUsed + 1;
  const canTake = !readOnly && step.status !== "closed" && next <= 3;
  const cost = next === 1 ? t.hints.costNone : next === 2 ? t.hints.costHalf : t.hints.costAll;
  return (
    <aside aria-labelledby={`${step.id}-hints`} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <h3 id={`${step.id}-hints`} className="font-semibold">
        {t.hints.title}
      </h3>
      <div aria-live="polite" className="flex flex-col gap-2">
        {step.hints.map((h) => (
          <p key={h.level}>
            <strong>{format(t.hints.level, { level: h.level })}:</strong> {h.text}
          </p>
        ))}
      </div>
      {canTake && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted">{cost}</p>
          <div>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => run(take(next))}>
              {next === 3 ? t.hints.solution : format(t.hints.take, { level: next })}
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
