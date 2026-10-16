import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { cx } from "./primitives";

// Design v3 card language (Marco 16 Oct 2026, mindforward-preview/platform-preview.html): white cards with a 1px
// light border and a 22px radius, one blue gradient hero per screen, pill tabs, people rows with round avatars,
// coloured role tags and segmented progress. All values from src/styles/tokens.css.

/** White v3 card. `title` renders an h2 row with optional actions. */
export function Panel({
  title,
  actions,
  className,
  children,
  as: Tag = "section",
  ...rest
}: {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
  as?: "section" | "div";
  "data-testid"?: string;
  "aria-label"?: string;
}) {
  return (
    <Tag className={cx("flex flex-col gap-4 rounded-card border border-line bg-surface p-6 sm:px-7 sm:py-6.5", className)} {...rest}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-[1.125rem] leading-snug font-semibold tracking-[-0.01em] text-ink">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** The big blue gradient card for the current entity (module, company, next step). Text is white (≥ 5:1). */
export function HeroCard({ children, aside, className, ...rest }: { children: ReactNode; aside?: ReactNode; className?: string; "data-testid"?: string }) {
  return (
    <section
      className={cx("mf-hero grid gap-6 overflow-hidden rounded-card p-6 sm:px-7.5 sm:py-7 md:min-h-[14.5rem]", aside ? "md:grid-cols-[minmax(0,1fr)_auto]" : "", className)}
      {...rest}
    >
      <div className="flex min-w-0 flex-col">{children}</div>
      {aside}
    </section>
  );
}

export function HeroTitle({ children, as: Tag = "h1" }: { children: ReactNode; as?: "h1" | "h2" }) {
  return <Tag className="mb-3.5 text-[1.4375rem] leading-tight font-bold tracking-[-0.01em] text-on-hero">{children}</Tag>;
}

/** Outline chips on the hero. */
export function HeroChips({ items, label }: { items: string[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((c) => (
        <li key={c} className="rounded-full border border-hero-chip-line px-3 py-1 text-[0.8125rem] leading-tight text-on-hero">
          {c}
        </li>
      ))}
    </ul>
  );
}

/** Meta line at the bottom of the hero: "Dansk · ⏱ ca. 10 min · 8 trin · Bestå ved 80 %". */
export function HeroMeta({ items }: { items: { icon?: IconName; text: string }[] }) {
  return (
    <ul className="mt-auto flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-10 text-body-sm text-on-hero">
      {items.map((m, i) => (
        <li key={m.text} className="flex items-center gap-3.5 whitespace-nowrap">
          {i > 0 && <span aria-hidden="true">·</span>}
          <span className="flex items-center gap-1.5">
            {m.icon && <Icon name={m.icon} size={16} />}
            {m.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Translucent pills on the hero's right side (learning goals). */
export function HeroPills({ items, label }: { items: ReactNode[]; label: string }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-2.5 md:w-[17rem]">
      {items.map((g, i) => (
        <li key={i} className="flex items-start gap-2.5 rounded-xl border border-hero-pill-line bg-hero-pill px-4 py-2.5 text-body-sm text-on-hero">
          <span aria-hidden="true" className="mt-[0.55em] size-[5px] shrink-0 rounded-full bg-on-hero" />
          <span>{g}</span>
        </li>
      ))}
    </ul>
  );
}

/** Round avatar with initials (we keep no profile photos). */
export function Avatar({ name, email, size = "md" }: { name?: string | null; email: string; size?: "sm" | "md" | "lg" }) {
  const source = name?.trim() || email.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
  const box = size === "lg" ? "size-12.5 text-label" : size === "sm" ? "size-8 text-caption" : "size-11 text-caption";
  return (
    <span aria-hidden="true" className={cx("grid shrink-0 place-items-center rounded-full bg-tint font-semibold text-tint-ink ring-1 ring-line", box)}>
      {initials}
    </span>
  );
}

/** Coloured role tag next to a name: owners/admins blue, learners green. The word carries the meaning. */
export function RoleTag({ role, children }: { role: "OWNER" | "ADMIN" | "LEARNER"; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-5.5 items-center rounded-full px-2.5 text-caption whitespace-nowrap", role === "LEARNER" ? "bg-tag-learner text-tag-learner-ink" : "bg-tint text-tint-ink")}>
      {children}
    </span>
  );
}

/** Ten-segment progress bar (one segment per 10 %). The number next to it is the accessible value. */
export function Segments({ pct, label, segments = 10 }: { pct: number; label: string; segments?: number }) {
  const on = Math.round((Math.max(0, Math.min(100, pct)) / 100) * segments);
  return (
    <span role="img" aria-label={label} className="flex gap-0.5">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className={cx("h-4.5 w-1.5 rounded-[2px]", i < on ? "bg-seg-on" : "bg-seg-off")} />
      ))}
    </span>
  );
}

/** Two-column list of facts with small grey line icons. */
export function FactList({ items, label }: { items: { icon: IconName; text: ReactNode }[]; label?: string }) {
  return (
    <ul aria-label={label} className="grid gap-x-7.5 gap-y-3 sm:grid-cols-2">
      {items.map((f, i) => (
        <li key={i} className="flex items-start gap-2.5 text-body-sm text-ink-muted">
          <Icon name={f.icon} size={18} className="mt-px text-ink-subtle" />
          <span>{f.text}</span>
        </li>
      ))}
    </ul>
  );
}

/** Row of key figures (big value, small label). `bleed` lets it run edge to edge at the bottom of a Panel. */
export function KpiRow({
  items,
  bleed = false,
  divided = true,
  ...rest
}: {
  items: { value: ReactNode; label: ReactNode; hint?: ReactNode; testId?: string }[];
  bleed?: boolean;
  /** Hairline above the row (when it follows other content in a card). */
  divided?: boolean;
  "data-testid"?: string;
}) {
  return (
    <dl
      {...rest}
      className={cx("grid gap-4", divided && "border-t border-line pt-5", items.length >= 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3", bleed && "-mx-6 -mb-6 px-6 pb-5 sm:-mx-7 sm:-mb-6.5 sm:px-7")}
    >
      {items.map((k, i) => (
        <div key={i} className="flex min-w-0 flex-col-reverse justify-end gap-0.5">
          {k.hint && <dd className="hidden text-caption font-normal text-ink-subtle sm:block">{k.hint}</dd>}
          <dt className="text-body-sm text-ink-muted">{k.label}</dt>
          <dd className="text-[1.375rem] leading-tight font-bold text-ink tabular-nums" data-testid={k.testId}>
            {k.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A pill-shaped link or button look (top-right actions, white with a light border). */
export const pillClass =
  "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-5 text-label text-ink transition-colors duration-[120ms] hover:bg-sunken";
