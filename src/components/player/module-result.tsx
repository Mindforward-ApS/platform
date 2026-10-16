"use client";

import type { RefObject } from "react";
import Link from "next/link";
import { HeroCard, HeroChips, HeroTitle, Panel } from "@/components/ui/cards";
import { Icon } from "@/components/ui/icons";
import { Button, ButtonLink, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { PlayerResult, PlayerState } from "@/server/modules/player-types";
import { MarkRow, num, PassBadge, ScoreBar } from "./kit";

const t = getMessages().player;
const CRITERION = { 2: "ok", 1: "partial", 0: "miss" } as const;

/** The module's end screen, design v3: blue hero with the score and pass badge, then cards for per-step points and criteria. */
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
  const verdict = r.passed ? t.result.passed : t.result.notPassed;
  const scoreLine = format(t.result.scoreLine, { pct: num(r.scorePct), threshold: num(r.passThresholdPct) });
  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 pt-6 pb-20 sm:px-6 lg:px-11">
      <Link href="/moduler" className="inline-flex items-center gap-1.5 self-start rounded-xs text-label text-ink-muted transition-colors hover:text-ink">
        <Icon name="arrowLeft" />
        {t.intro.back}
      </Link>
      <div className="flex max-w-5xl flex-col gap-6" data-testid="module-result">
        <HeroCard
          aside={
            <p className="flex items-baseline self-center text-on-hero tabular-nums md:pr-4" aria-hidden="true">
              <span className="text-display-xl font-bold">{num(r.scorePct)}</span>
              <span className="ml-1.5 text-title-1 font-medium">%</span>
            </p>
          }
        >
          <HeroTitle>{state.module.title}</HeroTitle>
          <HeroChips items={[...new Set(state.steps.map((s) => t.nav.stepType[s.type]))]} label={t.intro.stepTypes} />
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <div className="flex">
              <span className="rounded-xs bg-surface">
                <PassBadge passed={r.passed}>{verdict}</PassBadge>
              </span>
            </div>
            <h2 id="result-title" ref={heading} tabIndex={-1} aria-label={`${t.result.title}: ${verdict}`} className="text-title-3 text-on-hero focus-visible:outline-none">
              {t.result.title}
            </h2>
            <p className="text-body-sm text-on-hero" aria-live="polite">
              {scoreLine}
            </p>
          </div>
        </HeroCard>

        <Panel>
          <ScoreBar pct={r.scorePct} thresholdPct={r.passThresholdPct} passed={r.passed} label={scoreLine} />
          {r.mustPassFailed.length > 0 && (
            <Notice tone="error">
              {t.result.mustPassFailed} {r.mustPassFailed.map((m) => m.title).join(", ")}
            </Notice>
          )}
          <h3 className="pt-2 text-overline text-ink-muted uppercase">{t.result.perStep}</h3>
          <ul className="-mt-2 divide-y divide-line">
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
        </Panel>

        {prompts.map((s) => (
          <Panel key={s.id}>
            <h3 className="text-label text-ink">
              {s.title}: <span className="font-normal text-ink-muted">{t.prompt.criteria}</span>
            </h3>
            <ul className="-mt-2 divide-y divide-line" data-testid="result-criteria">
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
          </Panel>
        ))}

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        <div className="flex flex-col gap-4 rounded-card border border-line bg-sunken px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <p className="text-body-sm text-ink-muted">{t.result.bestCounts}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant={r.passed ? "secondary" : "primary"} disabled={pending} onClick={onRetry} className="rounded-full">
              {t.result.retry}
            </Button>
            <ButtonLink href="/moduler" variant={r.passed ? "primary" : "secondary"} trailingIcon={r.passed ? "arrowRight" : undefined} className="rounded-full">
              {t.result.toModules}
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
