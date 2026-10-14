import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

// Layout pieces for the focused auth flows (login, signup, check mail, invitations): one calm card on bg,
// optionally next to a short value statement on wide screens.

export function AuthMain({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 items-start justify-center px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:items-center lg:pb-24">
      {aside ? (
        <div className="grid w-full items-center gap-16 lg:grid-cols-[minmax(0,1fr)_440px] xl:gap-24">
          <div className="hidden lg:block">{aside}</div>
          <div className="mx-auto w-full max-w-[440px]">{children}</div>
        </div>
      ) : (
        <div className="w-full max-w-[440px]">{children}</div>
      )}
    </main>
  );
}

/** Centered card: optional icon tile, overline, h1, lead; body; optional sunken footer strip. */
export function AuthCard({
  icon,
  iconTone = "accent",
  eyebrow,
  title,
  lead,
  footer,
  children,
  ...rest
}: {
  icon?: IconName;
  iconTone?: "accent" | "success" | "neutral";
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  "data-testid"?: string;
}) {
  const tile = iconTone === "success" ? "bg-success-soft text-success" : iconTone === "neutral" ? "bg-sunken text-ink-muted" : "bg-accent-soft text-accent-ink";
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface" {...rest}>
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-8">
        <header className="flex flex-col gap-3">
          {icon && (
            <span className={cx("mb-1 grid size-11 place-items-center rounded-md", tile)}>
              <Icon name={icon} size={22} />
            </span>
          )}
          {eyebrow && <p className="text-overline text-ink-muted uppercase">{eyebrow}</p>}
          <h1 className="text-title-2 text-ink">{title}</h1>
          {lead && <div className="text-body text-ink-muted">{lead}</div>}
        </header>
        {children}
      </div>
      {footer && <div className="border-t border-line bg-sunken px-6 py-4 text-center text-body-sm text-ink-muted sm:px-8">{footer}</div>}
    </section>
  );
}

/** Short value statement shown beside the login/signup card on wide screens. */
export function AuthValue({ eyebrow, title, points }: { eyebrow: ReactNode; title: ReactNode; points: readonly string[] }) {
  return (
    <div className="flex max-w-[420px] flex-col gap-6">
      <p className="text-overline text-ink-muted uppercase">{eyebrow}</p>
      <h2 className="text-display text-ink">{title}</h2>
      <ul className="flex flex-col gap-4 border-t border-line pt-6">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-body text-ink-muted">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Icon name="check" size={12} strokeWidth={2.25} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
