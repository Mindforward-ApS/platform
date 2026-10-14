import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AppIcon, Icon, type IconName } from "./icons";

// Mindforward UI kit. Every value comes from src/styles/tokens.css via Tailwind names.
// Rules (design system README): one primary button per view, borders before shadows, status never by color alone.

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ───────────────────────── Layout ───────────────────────── */

/** Standard page body: title, optional lead and actions, content. Kept for every existing page. */
export function Page({
  title,
  lead,
  eyebrow,
  actions,
  width = "read",
  children,
}: {
  title: string;
  lead?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  width?: "read" | "app" | "narrow";
  children: ReactNode;
}) {
  const max = width === "app" ? "max-w-app" : width === "narrow" ? "max-w-[440px]" : "max-w-read";
  return (
    <main className={cx("mx-auto flex w-full flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14", max)}>
      <PageHeader title={title} lead={lead} eyebrow={eyebrow} actions={actions} />
      <div className="flex flex-col gap-6">{children}</div>
    </main>
  );
}

export function PageHeader({ title, lead, eyebrow, actions }: { title: string; lead?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow && <p className="text-overline text-ink-muted uppercase">{eyebrow}</p>}
        <h1 className="text-title-1 text-ink">{title}</h1>
        {lead && <p className="max-w-read text-body-lg text-ink-muted">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}

/** A bordered panel. `title` renders a header row; `footer` sits on a sunken strip. */
export function Card({
  title,
  description,
  actions,
  footer,
  padded = true,
  className,
  children,
  ...rest
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  padded?: boolean;
  className?: string;
  children?: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <section className={cx("overflow-hidden rounded-lg border border-line bg-surface", className)} {...rest}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            {title && <h2 className="text-title-3 text-ink">{title}</h2>}
            {description && <p className="text-body-sm text-ink-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children !== undefined && <div className={cx(padded && "p-6", "flex flex-col gap-4")}>{children}</div>}
      {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-sunken px-6 py-4">{footer}</div>}
    </section>
  );
}

/** Small figure tile for dashboards. */
export function Stat({ label, value, hint, icon }: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-5">
      <p className="flex items-center gap-2.5 text-label text-ink-muted">
        {icon && <AppIcon name={icon} size="xs" />}
        {label}
      </p>
      <p className="text-title-1 text-ink">{value}</p>
      {hint && <p className="text-body-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon = "sparkle", title, children, action }: { icon?: IconName; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center">
      <AppIcon name={icon} size="lg" />
      <p className="text-title-3 text-ink">{title}</p>
      {children && <div className="max-w-sm text-body-sm text-ink-muted">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Divider({ label }: { label?: ReactNode }) {
  if (!label) return <hr className="border-line" />;
  return (
    <div className="flex items-center gap-3 text-caption text-ink-subtle">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

/** Label/value rows (account details, subscription summary). */
export function DescriptionList({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line">
      {items.map(([k, v], i) => (
        <div key={i} className="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[200px_1fr] sm:gap-6">
          <dt className="text-body-sm text-ink-muted">{k}</dt>
          <dd className="text-body text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Table wrapper: horizontal scroll on phones, consistent cell styles via descendant selectors. */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto rounded-lg border border-line bg-surface", className)}>
      <table className="w-full border-collapse text-left text-body-sm [&_tbody_tr]:border-t [&_tbody_tr]:border-line [&_tbody_tr:hover]:bg-sunken/60 [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_td]:text-ink [&_th]:bg-sunken [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-caption [&_th]:font-semibold [&_th]:tracking-[0.02em] [&_th]:text-ink-muted">
        {children}
      </table>
    </div>
  );
}

/* ───────────────────────── Actions ───────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function buttonClass(variant: Variant = "primary", size: Size = "md", className = "") {
  const base =
    "group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border text-label transition-[background-color,box-shadow,color,border-color] duration-[120ms] ease-out select-none disabled:cursor-not-allowed aria-disabled:cursor-not-allowed";
  const sizes: Record<Size, string> = { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-12 px-[22px] text-body font-[550]" };
  const looks: Record<Variant, string> = {
    primary:
      "border-transparent bg-accent text-on-accent shadow-xs hover:bg-accent-hover disabled:border-line disabled:bg-sunken disabled:text-ink-subtle disabled:shadow-none",
    secondary: "border-line-strong bg-surface text-ink shadow-xs hover:bg-sunken disabled:border-line disabled:text-ink-subtle disabled:shadow-none",
    ghost: "border-transparent bg-transparent text-ink-muted hover:bg-sunken hover:text-ink disabled:text-ink-subtle",
    danger: "border-line-strong bg-surface text-danger shadow-xs hover:bg-danger-soft disabled:text-ink-subtle",
  };
  return cx(base, sizes[size], looks[variant], className);
}

function ButtonInner({ children, icon, trailingIcon }: { children: ReactNode; icon?: IconName; trailingIcon?: IconName }) {
  return (
    <>
      {icon && <Icon name={icon} />}
      {children}
      {trailingIcon && (
        <Icon name={trailingIcon} className={trailingIcon === "arrowRight" ? "transition-transform duration-[120ms] group-hover/btn:translate-x-0.5" : ""} />
      )}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; icon?: IconName; trailingIcon?: IconName }) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      <ButtonInner icon={icon} trailingIcon={trailingIcon}>
        {children}
      </ButtonInner>
    </button>
  );
}

/** A link that looks like a button (navigation, not mutation). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  className = "",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?: Variant; size?: Size; icon?: IconName; trailingIcon?: IconName }) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      <ButtonInner icon={icon} trailingIcon={trailingIcon}>
        {children}
      </ButtonInner>
    </Link>
  );
}

/** Inline text link. */
export function TextLink({ href, className = "", children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <Link
      href={href}
      className={cx("font-medium text-accent underline decoration-accent/30 underline-offset-[3px] transition-colors hover:text-accent-hover hover:decoration-accent-hover", className)}
      {...props}
    >
      {children}
    </Link>
  );
}

/* ───────────────────────── Forms ───────────────────────── */

const controlClass =
  "w-full rounded-sm border border-line-strong bg-surface px-3 text-body text-ink shadow-xs transition-[border-color,box-shadow] duration-[120ms] placeholder:text-ink-subtle focus:border-accent focus:shadow-ring focus:outline-none disabled:bg-sunken disabled:text-ink-subtle aria-[invalid=true]:border-danger";

function FieldShell({ label, help, error, children }: { label: ReactNode; help?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-label text-ink">{label}</span>
      {children}
      {error ? (
        <span className="flex items-start gap-1.5 text-body-sm text-danger">
          <Icon name="alert" className="mt-0.5" />
          {error}
        </span>
      ) : (
        help && <span className="text-body-sm text-ink-muted">{help}</span>
      )}
    </label>
  );
}

export function Field({ label, help, error, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; help?: ReactNode; error?: ReactNode }) {
  return (
    <FieldShell label={label} help={help} error={error}>
      <input className={cx(controlClass, "h-10", className)} aria-invalid={error ? true : undefined} {...props} />
    </FieldShell>
  );
}

export function TextArea({ label, help, error, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: ReactNode; help?: ReactNode; error?: ReactNode }) {
  return (
    <FieldShell label={label} help={help} error={error}>
      <textarea className={cx(controlClass, "min-h-28 py-2.5 leading-relaxed", className)} aria-invalid={error ? true : undefined} {...props} />
    </FieldShell>
  );
}

export function Select({ label, help, error, className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: ReactNode; help?: ReactNode; error?: ReactNode }) {
  return (
    <FieldShell label={label} help={help} error={error}>
      <span className="relative">
        <select className={cx(controlClass, "h-10 appearance-none pr-9", className)} aria-invalid={error ? true : undefined} {...props}>
          {children}
        </select>
        <Icon name="chevronDown" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted" />
      </span>
    </FieldShell>
  );
}

/** Checkbox or radio with label to the right. */
export function Check({ label, help, type = "checkbox", className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; help?: ReactNode }) {
  return (
    <label className={cx("flex cursor-pointer items-start gap-3", className)}>
      <input type={type} className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-accent" {...props} />
      <span className="flex flex-col gap-0.5">
        <span className="text-body text-ink">{label}</span>
        {help && <span className="text-body-sm text-ink-muted">{help}</span>}
      </span>
    </label>
  );
}

/* ───────────────────────── Status ───────────────────────── */

export type Tone = "neutral" | "accent" | "success" | "danger" | "hint";

const badgeTones: Record<Tone, string> = {
  neutral: "bg-sunken text-ink-muted ring-1 ring-inset ring-line",
  accent: "bg-accent-soft text-accent-ink",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  hint: "bg-hint-soft text-hint",
};

export function Badge({
  tone = "neutral",
  icon,
  dot,
  children,
  className = "",
  ...rest
}: { tone?: Tone; icon?: IconName; dot?: boolean; children: ReactNode; className?: string; "data-testid"?: string }) {
  return (
    <span {...rest} className={cx("inline-flex h-[22px] items-center gap-[5px] rounded-xs px-2 text-caption font-[550] whitespace-nowrap", badgeTones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-rav" />}
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}

const noticeLook = {
  info: { box: "border-line bg-surface", icon: "info" as IconName, accent: "text-accent", body: "text-ink-muted" },
  error: { box: "border-transparent bg-danger-soft", icon: "alert" as IconName, accent: "text-danger", body: "text-ink" },
  danger: { box: "border-transparent bg-danger-soft", icon: "shield" as IconName, accent: "text-danger", body: "text-ink" },
  hint: { box: "border-transparent bg-hint-soft", icon: "bulb" as IconName, accent: "text-hint", body: "text-ink" },
  success: { box: "border-transparent bg-success-soft", icon: "check" as IconName, accent: "text-success", body: "text-ink" },
};

/** Boxed message: hints, blocks, confirmations. Never a colored left border. */
export function Notice({
  tone = "info",
  title,
  meta,
  icon,
  children,
  className = "",
  ...rest
}: {
  tone?: keyof typeof noticeLook;
  title?: ReactNode;
  meta?: ReactNode;
  icon?: IconName;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  const look = noticeLook[tone];
  const alert = tone === "error" || tone === "danger";
  return (
    <div {...rest} role={alert ? "alert" : "status"} className={cx("flex gap-3 rounded-md border px-4 py-3.5", look.box, className)}>
      <Icon name={icon ?? look.icon} size={18} className={cx("mt-px", look.accent)} />
      <div className="flex min-w-0 flex-col gap-0.5 text-body-sm">
        {title && (
          <p className={cx("font-semibold", look.accent)}>
            {title}
            {meta && <span className="font-mono text-mono font-medium text-ink-muted"> · {meta}</span>}
          </p>
        )}
        {children && <div className={cx(title ? look.body : "text-ink")}>{children}</div>}
      </div>
    </div>
  );
}

/** Thin progress bar (module progress, seats used). */
export function ProgressBar({ value, max = 100, tone = "accent", label }: { value: number; max?: number; tone?: "accent" | "success" | "ink"; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const fill = tone === "success" ? "bg-success" : tone === "ink" ? "bg-ink" : "bg-accent";
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
      <div className={cx("h-full rounded-full transition-[width] duration-200 ease-out", fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Segmented step indicator for the module player. */
export function StepSegments({ current, total, label }: { current: number; total: number; label: string }) {
  if (total > 12) return <ProgressBar value={current} max={total} label={label} />;
  return (
    <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current} aria-label={label} className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cx("h-1.5 rounded-full", i + 1 < current ? "bg-ink" : i + 1 === current ? "bg-accent" : "bg-sunken ring-1 ring-inset ring-line")} />
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-xs border border-line bg-sunken px-1.5 py-0.5 font-mono text-[12px] text-ink-muted">{children}</kbd>;
}
