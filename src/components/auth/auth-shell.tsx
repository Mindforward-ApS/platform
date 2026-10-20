import type { ReactNode } from "react";
import { AppIcon, Icon, type IconName } from "@/components/ui/icons";


// Layout pieces for the focused auth flows (login, signup, check mail, invitations), design v3: one white card,
// optionally next to a short value statement on a dark slate-blue card on wide screens.

export function AuthMain({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-start justify-center px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:items-center lg:pb-24">
      {aside ? (
        <div className="mx-auto grid w-full max-w-[920px] items-stretch gap-10 lg:grid-cols-2 xl:gap-12">
          <div className="hidden overflow-hidden rounded-[22px] bg-site-navy p-8 shadow-[0_30px_60px_-30px_var(--color-site-navy-shadow)] lg:block xl:p-10">{aside}</div>
          <div className="mx-auto flex w-full max-w-[440px] flex-col lg:max-w-none [&>section]:lg:flex-1">{children}</div>
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
    <section className="flex flex-col overflow-hidden rounded-[22px] bg-surface shadow-[0_24px_50px_-28px_var(--color-site-shadow)] ring-1 ring-site-line" {...rest}>
      <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-8 sm:px-8">
        <header className="flex flex-col gap-3">
          {icon && (
            <AppIcon name={icon} tone={tone} size="lg" className="mb-1" />
          )}
          {eyebrow && <p className="text-overline text-ink-muted uppercase">{eyebrow}</p>}
          <h1 className="text-[28px] leading-[1.15] font-semibold tracking-[-0.02em] text-site-ink">{title}</h1>
          {lead && <div className="text-[15.5px] leading-[1.65] text-site-body">{lead}</div>}
        </header>
        {children}
      </div>
      {footer && <div className="border-t border-site-line bg-site-soft px-6 py-4 text-center text-body-sm text-ink-muted sm:px-8">{footer}</div>}
    </section>
  );
}

/** Short value statement shown beside the login/signup card on wide screens. */
export function AuthValue({ eyebrow, title, points }: { eyebrow: ReactNode; title: ReactNode; points: readonly string[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-linear-160 from-site-blue-light via-site-blue to-site-blue-deep" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- static WebP from /public, same photo as the website hero */}
        <img src="/heroes/auth-person.webp" alt="" decoding="async" className="absolute inset-x-0 bottom-0 mx-auto h-[115%] w-auto object-contain object-bottom" />
      </div>
      <p className="text-[0.6875rem] font-medium tracking-[0.12em] text-on-sidebar-label uppercase">{eyebrow}</p>
      <h2 className="text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] text-on-sidebar">{title}</h2>
      <ul className="flex flex-col gap-4 border-t border-sidebar-line pt-6">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3 text-[15.5px] leading-[1.6] text-on-sidebar-muted">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-site-blue text-on-sidebar">
              <Icon name="check" size={12} strokeWidth={2.25} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
