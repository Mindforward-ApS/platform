"use client";

import { useState, type FormEvent } from "react";
import { ProgressBar } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import type { PlacementTest } from "@/lib/schemas/placement";

// The test as one form (works without JS); JS only adds the progress bar ("statuslinje", docs/01 § 4.1).
// Correct answers are NOT sent to the browser: the server passes the test without `correct`.

export type ClientTest = Omit<PlacementTest, "questions" | "areas"> & { questions: Omit<PlacementTest["questions"][number], "correct">[] };

interface Strings {
  profileTitle: string;
  questionsTitle: string;
  progress: string;
  questionLabel: string;
  aiAnswerLabel: string;
  submit: string;
  honeypotLabel: string;
}

const OPTION =
  "flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-body text-ink transition-[background-color,border-color] duration-[120ms] hover:border-line-strong has-checked:border-accent has-checked:bg-accent-soft has-focus-visible:shadow-ring";
const RADIO = "mt-1 size-4 shrink-0 cursor-pointer accent-accent";

const fill = (s: string, vars: Record<string, number>) => s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

export function PlacementForm({
  test,
  t,
  action,
  startToken,
  slug,
}: {
  test: ClientTest;
  t: Strings;
  action: (formData: FormData) => Promise<void>;
  startToken: string;
  slug: string;
}) {
  const total = test.questions.length;
  const [answered, setAnswered] = useState(0);

  function onChange(e: FormEvent<HTMLFormElement>) {
    const data = new FormData(e.currentTarget);
    setAnswered(test.questions.filter((q) => data.get(q.id)).length);
  }

  return (
    <form action={action} onChange={onChange} className="flex flex-col gap-8">
      <input type="hidden" name="track" value={slug} />
      <input type="hidden" name="startToken" value={startToken} />
      {/* Honeypot: invisible to people, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {t.honeypotLabel}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sticky top-16 z-30 -mx-4 flex flex-col gap-2 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <span className="text-label text-ink">{t.questionsTitle}</span>
          <span className="font-mono text-mono text-ink-muted tabular-nums" data-testid="progress">
            {fill(t.progress, { answered, total })}
          </span>
        </div>
        <ProgressBar value={answered} max={total} label={fill(t.progress, { answered, total })} tone={answered === total ? "success" : "accent"} />
      </div>

      <div className="rounded-lg border border-line bg-surface p-6">
        <fieldset className="flex min-w-0 flex-col gap-6">
          <legend className="mb-6 text-title-3 text-ink">{t.profileTitle}</legend>
          {test.profileQuestions.map((p) => (
            <fieldset key={p.id} className="flex min-w-0 flex-col gap-3">
              <legend className="mb-1 text-label text-ink">{p.question}</legend>
              {p.help && <p className="-mt-2 text-body-sm text-ink-muted">{p.help}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {p.options.map((o) => (
                  <label key={o.id} className={OPTION}>
                    <input type="radio" name={p.id} value={o.id} required={p.required} className={RADIO} />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </fieldset>
      </div>

      <h2 className="sr-only">{t.questionsTitle}</h2>
      <ol className="flex flex-col gap-6">
        {test.questions.map((q, i) => (
          <li key={q.id} className="rounded-lg border border-line bg-surface p-6">
            <fieldset className="flex min-w-0 flex-col gap-4">
              <legend className="mb-4 flex flex-col gap-2">
                <span className="font-mono text-mono text-ink-subtle tabular-nums">{fill(t.questionLabel, { n: i + 1, total })}</span>
                <span className="text-title-3 text-ink">{q.prompt}</span>
              </legend>
              {q.context && (
                <blockquote className="flex flex-col gap-1.5 rounded-md border border-line bg-sunken px-4 py-3 text-body-sm text-ink">
                  <span className="text-overline text-ink-subtle uppercase">{t.aiAnswerLabel}</span>
                  <span className="whitespace-pre-line">{q.context}</span>
                </blockquote>
              )}
              <div className="flex flex-col gap-2">
                {q.options.map((o) => (
                  <label key={o.id} className={OPTION}>
                    <input type="radio" name={q.id} value={o.id} required className={RADIO} />
                    <span>{o.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-body-sm text-ink-muted tabular-nums">{fill(t.progress, { answered, total })}</span>
        <SubmitButton className="h-12 px-[22px] text-body font-[550]">
          {t.submit}
        </SubmitButton>
      </div>
    </form>
  );
}
