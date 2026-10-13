"use client";

import { useState, type FormEvent } from "react";
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
    <form action={action} onChange={onChange} className="flex flex-col gap-6">
      <input type="hidden" name="track" value={slug} />
      <input type="hidden" name="startToken" value={startToken} />
      {/* Honeypot: invisible to people, tempting for bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          {t.honeypotLabel}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="sticky top-0 flex flex-col gap-1 bg-bg py-2">
        <progress className="w-full" max={total} value={answered} aria-label={fill(t.progress, { answered, total })} />
        <span className="text-sm text-muted" data-testid="progress">
          {fill(t.progress, { answered, total })}
        </span>
      </div>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-lg font-semibold">{t.profileTitle}</legend>
        {test.profileQuestions.map((p) => (
          <fieldset key={p.id} className="flex flex-col gap-2">
            <legend className="font-medium">{p.question}</legend>
            {p.help && <p className="text-sm text-muted">{p.help}</p>}
            {p.options.map((o) => (
              <label key={o.id} className="flex items-center gap-2">
                <input type="radio" name={p.id} value={o.id} required={p.required} />
                {o.text}
              </label>
            ))}
          </fieldset>
        ))}
      </fieldset>

      <h2 className="text-lg font-semibold">{t.questionsTitle}</h2>
      {test.questions.map((q, i) => (
        <fieldset key={q.id} className="flex flex-col gap-2 rounded-md border border-border p-4">
          <legend className="text-sm text-muted">{fill(t.questionLabel, { n: i + 1, total })}</legend>
          <p className="font-medium">{q.prompt}</p>
          {q.context && (
            <blockquote className="rounded-md bg-surface p-3 text-sm">
              <span className="block font-semibold">{t.aiAnswerLabel}</span>
              {q.context}
            </blockquote>
          )}
          {q.options.map((o) => (
            <label key={o.id} className="flex items-start gap-2">
              <input type="radio" name={q.id} value={o.id} required className="mt-1" />
              <span>{o.text}</span>
            </label>
          ))}
        </fieldset>
      ))}
      <SubmitButton>{t.submit}</SubmitButton>
    </form>
  );
}
