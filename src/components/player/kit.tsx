import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { Badge, cx } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// Player-local building blocks (choice cards, score bar, criterion rows). Built from the shared kit and tokens only.

/** Danish number formatting: "2.000", "86". */
export function num(n: number): string {
  return Math.round(n).toLocaleString("da-DK");
}

export type ChoiceState = "idle" | "selected" | "correct" | "partial" | "wrong" | "muted";

const choiceLook: Record<ChoiceState, string> = {
  idle: "border-line bg-surface hover:border-line-strong hover:shadow-xs",
  selected: "border-accent bg-accent-soft/40 ring-1 ring-accent",
  correct: "border-success bg-success-soft",
  partial: "border-hint bg-hint-soft",
  wrong: "border-danger bg-danger-soft",
  muted: "border-line bg-surface",
};

/**
 * A large clickable answer card around a real radio/checkbox, so the label, keyboard and screen readers work natively.
 * After answering, state + badges (icon and word) tell the result — never color alone.
 */
export function ChoiceCard({
  type,
  state,
  badges,
  feedback,
  children,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { type: "radio" | "checkbox"; state: ChoiceState; badges?: ReactNode; feedback?: ReactNode; children: ReactNode }) {
  const locked = input.disabled;
  return (
    <li>
      <label
        className={cx(
          "group/choice flex gap-4 rounded-lg border px-4 py-4 transition-[border-color,box-shadow,background-color] duration-[120ms] ease-out has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus sm:px-5",
          choiceLook[state],
          locked ? "cursor-default" : "cursor-pointer",
        )}
      >
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            type={type}
            className={cx(
              "peer size-5 cursor-pointer appearance-none border border-line-strong bg-surface transition-colors duration-[120ms] focus-visible:outline-none disabled:cursor-default",
              type === "radio" ? "rounded-full checked:border-[6px] checked:border-accent" : "rounded-xs checked:border-accent checked:bg-accent",
            )}
            {...input}
          />
          {type === "checkbox" && <Icon name="check" size={14} strokeWidth={2.25} className="pointer-events-none absolute hidden text-on-accent peer-checked:block" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-body text-ink">{children}</span>
          {badges && <span className="flex flex-wrap gap-2">{badges}</span>}
          {feedback && <span className="text-body-sm text-ink-muted">{feedback}</span>}
        </span>
      </label>
    </li>
  );
}

/** Horizontal score bar with an optional vertical pass-threshold marker. */
export function ScoreBar({ pct, thresholdPct, passed, label }: { pct: number; thresholdPct?: number; passed: boolean; label: string }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return (
    <div role="img" aria-label={label} className="relative h-1.5 w-full rounded-full bg-sunken ring-1 ring-line ring-inset">
      <span className={cx("absolute inset-y-0 left-0 rounded-full", passed ? "bg-success" : "bg-ink-muted")} style={{ width: `${clamp(pct)}%` }} />
      {thresholdPct !== undefined && <span className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${clamp(thresholdPct)}%` }} />}
    </div>
  );
}

/** Bestået / Ikke bestået, always with an icon. */
export function PassBadge({ passed, children }: { passed: boolean; children: ReactNode }) {
  return (
    <Badge tone={passed ? "success" : "danger"} icon={passed ? "check" : "x"}>
      {children}
    </Badge>
  );
}

const markLook: Record<"ok" | "partial" | "miss" | "none", { icon: IconName; color: string }> = {
  ok: { icon: "check", color: "text-success" },
  partial: { icon: "dash", color: "text-hint" },
  miss: { icon: "x", color: "text-danger" },
  none: { icon: "dash", color: "text-ink-subtle" },
};

/** One row in a result list: status icon, title + reason, and status word + points on the right. */
export function MarkRow({ mark, title, reason, word, points }: { mark: keyof typeof markLook; title: ReactNode; reason?: ReactNode; word?: ReactNode; points: ReactNode }) {
  const look = markLook[mark];
  return (
    <li className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 py-3.5">
      <Icon name={look.icon} size={18} strokeWidth={2} className={cx("mt-px", look.color)} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-label text-ink">{title}</span>
        {reason && <span className="text-body-sm text-ink-muted">{reason}</span>}
      </span>
      <span className="flex flex-col items-end gap-0.5 text-right">
        <span className="font-mono text-mono text-ink tabular-nums">{points}</span>
        {word && <span className="text-caption text-ink-muted">{word}</span>}
      </span>
    </li>
  );
}

/** A quiet labelled panel for context material inside a step (scenario, facts, the question the AI got). */
export function ContextPanel({ title, icon, children, tone = "surface" }: { title: ReactNode; icon?: IconName; children: ReactNode; tone?: "surface" | "sunken" }) {
  return (
    <section className={cx("flex flex-col gap-2 rounded-lg border border-line px-5 py-4", tone === "sunken" ? "bg-sunken" : "bg-surface")}>
      <h3 className="flex items-center gap-2 text-overline text-ink-muted uppercase">
        {icon && <Icon name={icon} size={14} />}
        {title}
      </h3>
      <div className="text-body text-ink">{children}</div>
    </section>
  );
}

/** Module header shared by the player and the result: back link and the module name. */
export function PlayerHeader({ title, large = false }: { title: string; large?: boolean }) {
  return (
    <div className={cx("flex flex-col", large ? "gap-4" : "gap-1.5")}>
      <Link href="/moduler" className="inline-flex items-center gap-1.5 self-start rounded-xs text-label text-ink-muted transition-colors hover:text-ink">
        <Icon name="arrowLeft" />
        {getMessages().player.intro.back}
      </Link>
      <h1 className={cx("text-ink", large ? "text-title-1" : "text-title-3")}>{title}</h1>
    </div>
  );
}

