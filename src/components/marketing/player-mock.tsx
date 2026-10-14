import { LogoMark } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icons";
import { Badge, buttonClass, cx, ProgressBar, StepSegments } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { pct } from "./section";

// Product cut-out for the landing hero: a PROMPT_TASK step from "Din første gode prompt" plus its score card,
// drawn with the UI kit (no screenshots). Purely illustrative: the inner markup is aria-hidden and the figure
// carries one label, so screen readers never meet fake form controls.

export function PlayerMock() {
  const t = getMessages().marketing.playerMock;
  const max = t.criteria.reduce((sum, c) => sum + 2 * c.weight, 0);
  const got = t.criteria.reduce((sum, c) => sum + c.score * c.weight, 0);
  const score = (got / max) * 100;

  return (
    <figure className="flex flex-col gap-4" aria-label={t.figureLabel}>
      <div aria-hidden="true" className="relative select-none">
        {/* Step panel */}
        <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-lg lg:mr-14">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <LogoMark size={18} />
              <span className="truncate text-label text-ink">{t.module}</span>
            </span>
            <span className="shrink-0 font-mono text-mono text-ink-muted tabular-nums">{t.step}</span>
          </div>
          <div className="px-5 pt-4">
            <StepSegments current={5} total={8} label={t.step} />
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-2">
              <Badge tone="accent" icon="send" className="self-start">
                {t.stepType}
              </Badge>
              <p className="text-overline text-ink-subtle uppercase">{t.taskLabel}</p>
              <p className="text-body-sm text-ink">{t.task}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-label text-ink">{t.promptLabel}</span>
              <div className="rounded-sm border border-accent bg-surface px-3 py-2.5 text-body-sm text-ink shadow-ring">{t.prompt}</div>
              <span className="self-end font-mono text-mono text-ink-subtle tabular-nums">{format(t.chars, { count: t.prompt.length })}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className={buttonClass("ghost", "sm", "-ml-3")}>
                <Icon name="bulb" />
                {t.hint}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-caption text-ink-subtle">{t.attempt}</span>
                <span className={buttonClass("secondary", "sm", "shadow-none")}>
                  <Icon name="check" />
                  {t.submitted}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Score card, overlapping the panel on wide screens */}
        <div className="relative z-10 mx-4 -mt-6 rounded-lg border border-line bg-surface p-5 shadow-lg sm:mr-0 sm:ml-auto sm:w-[320px] lg:-mt-20">
          <div className="flex items-center justify-between gap-3">
            <span className="text-label text-ink-muted">{t.scoreTitle}</span>
            <Badge tone="success" icon="check">
              {t.passed}
            </Badge>
          </div>
          <p className="mt-2 text-title-1 text-ink tabular-nums">{pct(score)}</p>
          <div className="mt-3">
            <ProgressBar value={score} tone="success" />
          </div>
          <ul className="mt-4 flex flex-col divide-y divide-line">
            {t.criteria.map((c) => {
              const full = c.score === 2;
              return (
                <li key={c.label} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                  <span className="flex items-center justify-between gap-3 text-body-sm">
                    <span className="flex items-center gap-2 text-ink">
                      <Icon name={full ? "check" : "dash"} className={full ? "text-success" : "text-hint"} />
                      {c.label}
                    </span>
                    <span className="font-mono text-mono text-ink-muted tabular-nums">{format(t.criterionScore, { score: c.score, max: 2 })}</span>
                  </span>
                  {!full && <span className={cx("pl-6 text-caption text-ink-muted")}>{c.feedback}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <figcaption className="text-caption text-ink-subtle">{t.caption}</figcaption>
    </figure>
  );
}
