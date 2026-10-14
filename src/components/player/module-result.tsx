"use client";

import type { RefObject } from "react";
import { Button, ButtonLink, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { PlayerResult, PlayerState } from "@/server/modules/player-types";
import { MarkRow, num, PassBadge, PlayerHeader, ScoreBar } from "./kit";

const t = getMessages().player;
const CRITERION = { 2: "ok", 1: "partial", 0: "miss" } as const;

/** The module's end screen (ScoreResult pattern): big score, pass badge, threshold bar, per-step points, criteria. */
export function ModuleResult({
  state,
  result: r,
  heading,
  message,
  pending,
  onRetry,
}: {
  state: PlayerState;
  result: PlayerResult;
  heading: RefObject<HTMLHeadingElement | null>;
  message: { tone: "info" | "error"; text: string } | null;
  pending: boolean;
  onRetry: () => void;
}) {
  const prompts = state.steps.flatMap((s) => (s.type === "PROMPT_TASK" && s.criteria ? [s] : []));
  const typeOf = new Map(state.steps.map((s) => [s.id, s.type]));
  return (
    <div className="mx-auto flex w-full max-w-read flex-1 flex-col gap-8 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
      <PlayerHeader title={state.module.title} />

      <section aria-labelledby="result-title" className="overflow-hidden rounded-lg border border-line bg-surface" data-testid="module-result">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-8">
          <p className="flex items-baseline text-ink tabular-nums" aria-hidden="true">
            <span className="text-display-xl">{num(r.scorePct)}</span>
            <span className="ml-1.5 text-title-1 font-medium text-ink-muted">%</span>
          </p>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex">
              <PassBadge passed={r.passed}>{r.passed ? t.result.passed : t.result.notPassed}</PassBadge>
            </div>
            <h2 id="result-title" ref={heading} tabIndex={-1} aria-label={`${t.result.title}: ${r.passed ? t.result.passed : t.result.notPassed}`} className="text-title-2 text-ink focus-visible:outline-none">
              {t.result.title}
            </h2>
            <div className="flex flex-col gap-2 pt-1">
              <ScoreBar pct={r.scorePct} thresholdPct={r.passThresholdPct} passed={r.passed} label={format(t.result.scoreLine, { pct: num(r.scorePct), threshold: num(r.passThresholdPct) })} />
              <p className="text-body-sm text-ink-muted" aria-live="polite">
                {format(t.result.scoreLine, { pct: num(r.scorePct), threshold: num(r.passThresholdPct) })}
              </p>
            </div>
          </div>
        </div>

        {r.mustPassFailed.length > 0 && (
          <div className="border-t border-line px-6 py-4 sm:px-8">
            <Notice tone="error">
              {t.result.mustPassFailed} {r.mustPassFailed.map((m) => m.title).join(", ")}
            </Notice>
          </div>
        )}

        <div className="border-t border-line px-6 pt-5 pb-2 sm:px-8">
          <h3 className="text-overline text-ink-muted uppercase">{t.result.perStep}</h3>
          <ul className="divide-y divide-line">
            {r.steps.map((s) => {
              const type = typeOf.get(s.stepId);
              return (
                <MarkRow
                  key={s.stepId}
                  mark={s.passed ? "ok" : s.points > 0 ? "partial" : "miss"}
                  title={s.title}
                  reason={type ? t.nav.stepType[type] : undefined}
                  word={s.passed ? t.status.passed : t.status.notPassed}
                  points={format(t.status.pointsShort, { points: num(s.points), max: num(s.maxPoints) })}
                />
              );
            })}
          </ul>
        </div>

        {prompts.map((s) => (
          <div key={s.id} className="border-t border-line px-6 pt-5 pb-2 sm:px-8">
            <h3 className="text-label text-ink">
              {s.title}: <span className="font-normal text-ink-muted">{t.prompt.criteria}</span>
            </h3>
            <ul className="divide-y divide-line" data-testid="result-criteria">
              {s.criteria?.map((c) => (
                <MarkRow
                  key={c.id}
                  mark={c.score !== undefined ? CRITERION[c.score] : "none"}
                  title={c.label}
                  word={c.score !== undefined ? t.prompt.score[c.score] : undefined}
                  points={c.score !== undefined ? format(t.status.pointsShort, { points: c.score, max: 2 }) : "–"}
                />
              ))}
            </ul>
          </div>
        ))}

        {message && (
          <div className="border-t border-line px-6 py-4 sm:px-8">
            <Notice tone={message.tone}>{message.text}</Notice>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-line bg-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-body-sm text-ink-muted">{t.result.bestCounts}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant={r.passed ? "secondary" : "primary"} disabled={pending} onClick={onRetry}>
              {t.result.retry}
            </Button>
            <ButtonLink href="/moduler" variant={r.passed ? "primary" : "secondary"} trailingIcon={r.passed ? "arrowRight" : undefined}>
              {t.result.toModules}
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
