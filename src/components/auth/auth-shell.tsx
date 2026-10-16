import type { ReactNode } from "react";
import { AppIcon, Icon, type IconName } from "@/components/ui/icons";


// Layout pieces for the focused auth flows (login, signup, check mail, invitations), design v3: one white card,
// optionally next to a short value statement on a dark slate-blue card on wide screens.

export function AuthMain({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 items-start justify-center px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:items-center lg:pb-24">
      {aside ? (
        <div className="grid w-full items-stretch gap-10 lg:grid-cols-[minmax(0,1fr)_440px] xl:gap-16">
          <div className="hidden rounded-card bg-sidebar p-8 lg:block xl:p-10">{aside}</div>
          <div className="mx-auto flex w-full max-w-[440px] flex-col justify-center">{children}</div>
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
  const tone = iconTone === "success" ? "mint" : iconTone === "neutral" ? "slate" : "blue";
  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface" {...rest}>
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-8">
        <header className="flex flex-col gap-3">
          {icon && (
            <AppIcon name={icon} tone={tone} size="lg" className="mb-1" />
          )}
          {eyebrow && <p className="text-overline text-ink-muted uppercase">{eyebrow}</p>}
          <h1 className="text-title-2 font-semibold text-ink">{title}</h1>
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
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-sidebar-raised" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
        <img src="/heroes/hero-workspace.webp" alt="" decoding="async" className="absolute inset-0 size-full object-cover object-[72%_50%]" />
      </div>
      <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-on-sidebar-label uppercase">{eyebrow}</p>
      <h2 className="text-title-1 text-on-sidebar">{title}</h2>
      <ul className="flex flex-col gap-4 border-t border-sidebar-line pt-6">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-body text-on-sidebar-muted">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-on-sidebar text-sidebar">
              <Icon name="check" size={12} strokeWidth={2.25} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
