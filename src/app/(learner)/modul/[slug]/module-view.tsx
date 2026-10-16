"use client";

import Link from "next/link";
import { useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { num } from "@/components/player/kit";
import { FactList, HeroCard, HeroChips, HeroMeta, HeroPills, HeroTitle, Panel } from "@/components/ui/cards";
import { ModuleCover } from "@/components/ui/module-cover";
import { ModulePlayer, type PlayerServerActions } from "@/components/player/module-player";
import { Icon, type IconName } from "@/components/ui/icons";
import { Button, cx, Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { PlayerState } from "@/server/modules/player-types";
import { checkClickTaskAction, finishAttemptAction, openStepSandboxAction, skipClickTaskAction, startAttemptAction, submitAnswerAction, takeHintAction } from "./actions";

const t = getMessages().player;

const actions: PlayerServerActions = {
  start: startAttemptAction,
  answer: submitAnswerAction,
  hint: takeHintAction,
  checkClick: checkClickTaskAction,
  skipClick: skipClickTaskAction,
  openSandbox: openStepSandboxAction,
  finish: finishAttemptAction,
};

type StepType = keyof typeof t.nav.stepType;

export interface ModuleIntro {
  title: string;
  summary: string;
  objectives: string[];
  minutes: number;
  steps: number;
  passPct: number;
  level: number;
  locale: string;
  stepList: { id: string; title: string; type: StepType }[];
  promptTasks: number;
  maxSubmissions: number | null;
  mustPass: number;
}

const TYPE_ICON: Record<StepType, IconName> = {
  READ: "book",
  DEMO: "sandbox",
  CLICK_TASK: "sandbox",
  PROMPT_TASK: "chat",
  QUIZ: "check",
  SPOT_ERROR: "search",
  JUDGMENT: "shield",
};

/** Detaljer | Trin as pill tabs (WAI-ARIA tabs: arrow keys move between them). */
function IntroTabs({ intro }: { intro: ModuleIntro }) {
  const [tab, setTab] = useState<"details" | "steps">("details");
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = [
    ["details", t.intro.tabDetails],
    ["steps", t.intro.tabSteps],
  ] as const;
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[next]![0]);
    refs.current[next]?.focus();
  };
  const level = (t.list.level as Record<number, string>)[intro.level];
  const facts: { icon: IconName; text: string }[] = [
    {
      icon: "book",
      text:
        intro.promptTasks === 0
          ? format(t.intro.factSteps, { count: num(intro.steps) })
          : format(intro.promptTasks === 1 ? t.intro.factStepsPrompt : t.intro.factStepsPrompts, { count: num(intro.steps), prompts: num(intro.promptTasks) }),
    },
    ...(level ? [{ icon: "award" as const, text: format(t.intro.factLevel, { level: intro.level, label: level }) }] : []),
    { icon: "clock", text: format(t.intro.factMinutes, { minutes: num(intro.minutes) }) },
    { icon: "target", text: format(t.intro.factPass, { pct: num(intro.passPct) }) },
    ...(intro.maxSubmissions ? [{ icon: "route" as const, text: format(t.intro.factSubmissions, { max: num(intro.maxSubmissions) }) }] : []),
    ...(intro.mustPass > 0 ? [{ icon: "alert" as const, text: format(t.intro.factMustPass, { count: num(intro.mustPass) }) }] : []),
    ...(intro.promptTasks > 0 ? [{ icon: "shield" as const, text: t.prompt.privacy }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={t.intro.tabs} className="flex flex-wrap gap-1.5">
        {tabs.map(([key, label], i) => (
          <button
            key={key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-${key}-tab`}
            aria-selected={tab === key}
            aria-controls={`${base}-${key}`}
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              "h-11 rounded-full px-5.5 text-label transition-colors duration-[120ms]",
              tab === key ? "bg-tint text-tint-ink" : "text-ink-muted hover:bg-sunken hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "details" ? (
        <div role="tabpanel" id={`${base}-details`} aria-labelledby={`${base}-details-tab`}>
          <Panel title={t.intro.tabDetails}>
            <FactList items={facts} />
          </Panel>
        </div>
      ) : (
        <div role="tabpanel" id={`${base}-steps`} aria-labelledby={`${base}-steps-tab`}>
          <Panel title={t.intro.tabSteps}>
            <ol className="flex flex-col divide-y divide-line">
              {intro.stepList.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3.5 py-3 first:pt-0 last:pb-0">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink-muted" aria-hidden="true">
                    <Icon name={TYPE_ICON[s.type]} size={16} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-label text-ink">{s.title}</span>
                    <span className="text-caption text-ink-muted">
                      {format(t.nav.progress, { current: i + 1, total: intro.steps })} · {t.nav.stepType[s.type]}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </div>
  );
}

export function ModuleView({ slug, initial, intro }: { slug: string; initial: PlayerState | null; intro: ModuleIntro | null }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state) return <ModulePlayer key={state.attemptId} initial={state} actions={actions} />;
  if (!intro) return null;

  // Chips: the kinds of steps in this module, in the order they first appear.
  const types = [...new Set(intro.stepList.map((s) => s.type))].map((ty) => t.nav.stepType[ty]);
  const meta: { icon?: IconName; text: string }[] = [
    ...(t.intro.locale[intro.locale] ? [{ text: t.intro.locale[intro.locale]! }] : []),
    { icon: "clock", text: format(t.intro.metaMinutes, { minutes: num(intro.minutes) }) },
    { icon: "book", text: format(t.list.steps, { count: num(intro.steps) }) },
    { icon: "check", text: format(t.intro.metaPass, { pct: num(intro.passPct) }) },
  ];

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 pt-6 pb-20 sm:px-6 lg:px-11 lg:pt-6">
      <Link href="/moduler" className="inline-flex items-center gap-1.5 self-start rounded-xs text-label text-ink-muted transition-colors hover:text-ink lg:hidden">
        <Icon name="arrowLeft" />
        {t.intro.back}
      </Link>
      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-7">
          <HeroCard aside={intro.objectives.length > 0 ? <HeroPills items={intro.objectives} label={t.intro.objectives} /> : undefined}>
            <HeroTitle>{intro.title}</HeroTitle>
            <HeroChips items={types} label={t.intro.stepTypes} />
            <HeroMeta items={meta} />
          </HeroCard>
          <section aria-labelledby="module-description" className="flex flex-col gap-2.5">
            <h2 id="module-description" className="text-[1.125rem] font-semibold text-ink">
              {t.intro.description}
            </h2>
            <p className="max-w-[70ch] text-body text-ink-muted">{intro.summary}</p>
          </section>
          <IntroTabs intro={intro} />
        </div>
        <aside className="flex flex-col gap-6 xl:sticky xl:top-6">
          <section className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
            <ModuleCover seed={slug} size="lg" priority />
            <div className="flex flex-col gap-4 p-6 sm:px-7">
              <p className="text-body-sm text-ink-muted">{format(t.intro.passRule, { pct: num(intro.passPct) })}</p>
              {error && <Notice tone="error">{error}</Notice>}
              <Button
                type="button"
                size="lg"
                trailingIcon="arrowRight"
                disabled={pending}
                className="w-full rounded-full"
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
          </section>
        </aside>
      </div>
    </div>
  );
}
