import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

// Account-area building blocks (Stripe-style settings): hairline rows inside a `<Card padded={false}>`.
// Kept local to the account area; candidates for the shared kit.

export function SettingsList({ children, label, testId }: { children: ReactNode; label?: string; testId?: string }) {
  return (
    <ul className="divide-y divide-line" aria-label={label} data-testid={testId}>
      {children}
    </ul>
  );
}

/**
 * One navigation row: icon tile, label, optional hint, chevron. The accessible name is the label only
 * (the hint is its description), so "Support" stays "Support" for screen readers and tests.
 */
export function SettingsRow({
  id,
  href,
  icon,
  label,
  hint,
  meta,
  external,
}: {
  id: string;
  href: string;
  icon: IconName;
  label: ReactNode;
  hint?: ReactNode;
  meta?: ReactNode;
  external?: boolean;
}) {
  const labelId = `${id}-label`;
  const hintId = hint ? `${id}-hint` : undefined;
  const inner = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-line bg-sunken text-ink-muted transition-colors group-hover:text-ink">
        <Icon name={icon} size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={labelId} className="text-label text-ink">
          {label}
        </span>
        {hint && (
          <span id={hintId} className="text-body-sm text-ink-muted">
            {hint}
          </span>
        )}
      </span>
      {meta && <span className="hidden shrink-0 text-body-sm text-ink-muted sm:block">{meta}</span>}
      <Icon name="chevronRight" className="shrink-0 text-ink-subtle transition-transform duration-[120ms] group-hover:translate-x-0.5 group-hover:text-ink" />
    </>
  );
  const className = "group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-sunken focus-visible:-outline-offset-2";
  return (
    <li>
      {external ? (
        <a href={href} className={className} aria-labelledby={labelId} aria-describedby={hintId}>
          {inner}
        </a>
      ) : (
        <Link href={href} className={className} aria-labelledby={labelId} aria-describedby={hintId}>
          {inner}
        </Link>
      )}
    </li>
  );
}

/** A row with text on the left and a control (form/button/badge) on the right; stacks on phones. */
export function SettingsItem({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-label text-ink">{title}</p>
        {description && <p className="text-body-sm text-ink-muted">{description}</p>}
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
