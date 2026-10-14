"use client";

import { useState, useTransition } from "react";
import { num, PlayerHeader } from "@/components/player/kit";
import { ModuleCover } from "@/components/ui/module-cover";
import { ModulePlayer, type PlayerServerActions } from "@/components/player/module-player";
import { Icon } from "@/components/ui/icons";
import { Button, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { PlayerState } from "@/server/modules/player-types";
import { checkClickTaskAction, finishAttemptAction, skipClickTaskAction, startAttemptAction, submitAnswerAction, takeHintAction } from "./actions";

const t = getMessages().player;

const actions: PlayerServerActions = {
  start: startAttemptAction,
  answer: submitAnswerAction,
  hint: takeHintAction,
  checkClick: checkClickTaskAction,
  skipClick: skipClickTaskAction,
  finish: finishAttemptAction,
};

export interface ModuleIntro {
  title: string;
  summary: string;
  objectives: string[];
  minutes: number;
  steps: number;
  passPct: number;
}

export function ModuleView({ slug, initial, intro }: { slug: string; initial: PlayerState | null; intro: ModuleIntro | null }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state) return <ModulePlayer key={state.attemptId} initial={state} actions={actions} />;
  if (!intro) return null;

  const facts: [string, string][] = [
    [t.intro.time, format(t.list.minutes, { minutes: num(intro.minutes) })],
    [t.intro.stepsLabel, num(intro.steps)],
    [t.intro.threshold, format(t.intro.thresholdValue, { pct: num(intro.passPct) })],
  ];

  return (
    <div className="mx-auto flex w-full max-w-read flex-1 flex-col gap-10 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <ModuleCover seed={slug} size="lg" priority className="-mb-2 rounded-2xl" />
      <div className="flex flex-col gap-3">
        <PlayerHeader title={intro.title} large />
        <p className="text-body-lg text-ink-muted">{intro.summary}</p>
      </div>

      <dl aria-label={t.intro.facts} className="grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 px-4 py-4 sm:px-6">
            <dt className="text-caption text-ink-muted">{k}</dt>
            <dd className="font-mono text-body text-ink tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>

      {intro.objectives.length > 0 && (
        <section aria-labelledby="objectives" className="flex flex-col gap-4">
          <h2 id="objectives" className="text-title-3 text-ink">
            {t.intro.objectives}
          </h2>
          <ul className="flex flex-col gap-3">
            {intro.objectives.map((o) => (
              <li key={o} className="flex gap-3 text-body text-ink">
                <Icon name="check" size={18} strokeWidth={2} className="mt-0.5 text-accent" />
                {o}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-col gap-4 border-t border-line pt-8">
        <p className="text-body-sm text-ink-muted">{format(t.intro.passRule, { pct: num(intro.passPct) })}</p>
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <Button
            type="button"
            size="lg"
            trailingIcon="arrowRight"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const r = await startAttemptAction(slug);
                if (r.ok) setState(r.state);
                else setError((t.errors as Record<string, string>)[r.error] ?? t.errors.generic);
              })
            }
          >
            {t.intro.start}
          </Button>
        </div>
      </div>
    </div>
  );
}
