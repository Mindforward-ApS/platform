import type { ReactNode } from "react";
import { AppIcon, type IconName } from "@/components/ui/icons";


// Layout pieces for the focused auth flows (login, signup, check mail, invitations), design v3: one white card,
// optionally next to a short value statement on a dark slate-blue card on wide screens.

export function AuthMain({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-1 items-start justify-center px-4 pt-10 pb-20 sm:px-6 sm:pt-16 lg:items-center lg:py-20">
      {aside ? (
        <div className="mx-auto grid w-full max-w-[920px] items-stretch gap-10 lg:grid-cols-2 xl:gap-12">
          <div className="hidden lg:block">{aside}</div>
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

/** Beside the login/signup card on wide screens: the woman from the website hero, waving hello, rising out
 *  of a navy frame (same build as the hero on mindforward.dk), with a short welcome bubble. */
export function AuthWelcome({ greeting }: { greeting: ReactNode }) {
  return (
    <div className="flex h-full items-end justify-center pb-0" aria-hidden="true">
      {/* same proportions as the hero box on mindforward.dk: 460×660, frame 78% high and 8% wider on each side,
          the cut-out 17% wider on each side so the waving hand fits; only the frame's rounded bottom clips her.
          Box = 86.2% of the column, so the frame (116%) fills the column exactly */}
      <div className="relative aspect-[460/660] w-[86.2%]">
        <div className="absolute -inset-x-[8%] bottom-0 h-[78%] rounded-[28px] bg-site-navy shadow-[0_30px_60px_-30px_var(--color-site-navy-shadow)]" />
        <div className="absolute -inset-x-[17%] bottom-0 h-full [clip-path:inset(-100%_-100%_0_-100%_round_0_0_28px_28px)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static cut-out WebP from /public */}
          <img src="/heroes/auth-wave.webp" alt="" decoding="async" className="size-full object-contain object-bottom" />
        </div>
        <p className="absolute top-[12%] -left-[14%] rounded-2xl bg-surface px-4 py-3 text-[15.5px] font-semibold tracking-[-0.01em] whitespace-nowrap text-site-ink shadow-[0_24px_50px_-22px_var(--color-site-shadow)] ring-1 ring-site-line">
          {greeting}
        </p>
      </div>
    </div>
  );
}
