import Link from "next/link";
import type { ReactNode } from "react";
import { MindforwardLogo } from "@/components/platform/logo";
import { Icon } from "@/components/ui/icons";
import type { OnboardingKind } from "@/lib/config/onboarding";
import { getMessages } from "@/lib/i18n";

// Sign-up + onboarding frame, copied from the approved preview (mindforward-platform /onboarding, Marco 11 Nov 2026):
// dark brand panel on the left from 1024px, the step on the right with back button, progress bar and kind badge.
// One question per screen. Colours are the website/forløb tokens (chocolate stage, cream page, coral accent).

export function OnboardingFrame({
  kind,
  pct,
  backHref,
  title,
  lead,
  children,
}: {
  kind: OnboardingKind | null;
  pct: number;
  backHref?: string | null;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
}) {
  const t = getMessages().onboarding;
  return (
    <div className="grid min-h-svh bg-web-bg font-site lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-linear-160 from-web-stage-raised to-web-stage-deep p-10 lg:flex">
        <div aria-hidden="true" className="absolute top-1/3 -right-24 size-[28rem] rounded-full bg-web-coral opacity-30 blur-3xl" />
        <Link href="/" aria-label={getMessages().logoLabel} className="relative self-start">
          {/* Same logo as the platform sidebar: coral brain, white "Forward" (Marco 2026-11-11: the brain was white). */}
          <MindforwardLogo size={30} />
        </Link>
        <div className="relative">
          <p className="max-w-[24rem] text-[2.25rem] leading-[1.15] font-semibold tracking-[-0.03em] text-web-white">
            {kind === "virksomhed" ? t.aside.titleVirksomhed : t.aside.titlePrivat}
          </p>
          <p className="mt-4 max-w-[22rem] text-web-white/60">{t.aside.body}</p>
        </div>
        <span aria-hidden="true" />
      </aside>
      <main id="indhold" className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center gap-4">
          {backHref && (
            <Link href={backHref} aria-label={t.back} className="grid size-9 shrink-0 place-items-center rounded-full bg-web-surface text-web-ink">
              <Icon name="arrowLeft" />
            </Link>
          )}
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-web-surface"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={title && typeof title === "string" ? title : undefined}
          >
            <div className="h-full rounded-full bg-web-coral transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          {kind && <span className="rounded-full bg-web-surface px-3 py-1 text-[0.75rem] font-semibold text-web-muted">{t.kindBadge[kind]}</span>}
        </div>
        <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col justify-center py-10">
          <h1 className="text-[1.875rem] leading-tight font-semibold tracking-[-0.02em] text-web-ink">{title}</h1>
          {lead && <div className="mt-2 text-[1rem] text-web-muted">{lead}</div>}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
