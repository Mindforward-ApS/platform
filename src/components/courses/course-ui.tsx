import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// Forløb in the new website look (mindforward.dk on :3400): chocolate "stage" with a coral glow, cream page,
// white cards with large radii, coral as the one accent, Inter. Colours come from the --mf-web-* tokens.
// Tool names are text only: no vendor logos or icons.

/** Cream, Inter page area that fills the app panel. */
export function CourseFrame({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col bg-web-bg font-site text-web-body">{children}</div>;
}

export function CourseMain({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <main className={cx("mx-auto flex w-full flex-1 flex-col gap-8 px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8", narrow ? "max-w-4xl" : "max-w-5xl", "in-[.app-panel]:mx-0")}>
      {children}
    </main>
  );
}

/** The website's dark stage: chocolate with a soft coral light from the top right. */
export function Stage({ children, className = "", ...rest }: { children: ReactNode; className?: string; "data-testid"?: string }) {
  return (
    <section {...rest} className={cx("relative isolate overflow-hidden rounded-[28px] bg-web-stage px-6 py-8 text-web-stage-text shadow-[0_24px_60px_-30px_var(--color-web-shadow)] sm:px-10 sm:py-10", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_85%_0%,var(--color-web-glow),transparent_70%)]" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_0%_100%,var(--color-web-stage-deep),transparent_70%)]" />
      {children}
    </section>
  );
}

/** Outlined pill label ("Kurser", "Smagsprøve" on the website). */
export function Pill({ children, onStage = false }: { children: ReactNode; onStage?: boolean }) {
  return (
    <span className={cx("inline-flex h-8 items-center rounded-full px-3.5 text-[0.8125rem] font-medium", onStage ? "border border-web-stage-line bg-web-stage-glass text-web-white" : "border border-web-line-strong bg-web-surface text-web-ink")}>
      {children}
    </span>
  );
}

type Look = "coral" | "light" | "glass";
const LOOK: Record<Look, string> = {
  coral: "bg-linear-to-b from-web-coral-from to-web-coral-to text-web-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_8px_18px_-8px_var(--color-web-shadow)] hover:brightness-105",
  light: "bg-web-surface text-web-ink ring-1 ring-inset ring-web-line-strong hover:bg-web-white",
  glass: "bg-web-stage-glass text-web-white ring-1 ring-inset ring-web-stage-line hover:bg-web-stage-raised",
};
export function webButtonClass(look: Look = "coral", className = "") {
  return cx(
    "group/wb inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-[0.9375rem] font-medium whitespace-nowrap transition-[filter,background-color] duration-[120ms] select-none disabled:cursor-not-allowed disabled:opacity-45",
    LOOK[look],
    className,
  );
}

export function WebButtonLink({ href, look = "coral", icon, trailingIcon, className = "", children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; look?: Look; icon?: IconName; trailingIcon?: IconName }) {
  return (
    <Link href={href} className={webButtonClass(look, className)} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={16} className="transition-transform duration-[120ms] group-hover/wb:translate-x-0.5" />}
    </Link>
  );
}

/** White card with a large radius and a hairline, like the website's bento cards. */
export function WebCard({ title, children, className = "", ...rest }: { title?: ReactNode; children: ReactNode; className?: string; "data-testid"?: string }) {
  return (
    <section {...rest} className={cx("rounded-[24px] border border-web-line bg-web-surface p-6 sm:p-8", className)}>
      {title && <h2 className="mb-5 text-[1.25rem] font-medium tracking-[-0.01em] text-web-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function ToolPicker({ courses, current }: { courses: { slug: string; toolName: string }[]; current: string }) {
  const t = getMessages().courses;
  return (
    <nav aria-label={t.toolPicker} data-testid="tool-picker">
      <ul className="inline-flex flex-wrap gap-1 rounded-full border border-web-stage-line bg-web-stage-glass p-1">
        {courses.map((c) => {
          const active = c.slug === current;
          return (
            <li key={c.slug}>
              <Link
                href={`/forloeb/${c.slug}`}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "inline-flex h-10 items-center rounded-full px-5 text-[0.9375rem] font-medium transition-colors duration-[120ms]",
                  active ? "bg-web-bg text-web-ink" : "text-web-stage-text hover:text-web-white",
                )}
              >
                {c.toolName}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Badges in JSON order; they wrap on narrow screens. */
export function LessonBadges({ badges, onStage = false }: { badges: string[]; onStage?: boolean }) {
  if (badges.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <span key={b} className={cx("inline-flex min-h-6 items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-medium", onStage ? "bg-web-stage-glass text-web-stage-text ring-1 ring-inset ring-web-stage-line" : "bg-web-coral-soft text-web-coral-ink")}>
          {b}
        </span>
      ))}
    </span>
  );
}

export function ComingSoon() {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-web-bg px-2.5 text-[0.75rem] font-medium text-web-muted ring-1 ring-inset ring-web-line">
      <Icon name="lock" size={12} />
      {getMessages().courses.comingSoon}
    </span>
  );
}

/** Coral check dot, as in the website hero list. */
export function CoralCheck({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span aria-hidden="true" className={cx("grid shrink-0 place-items-center rounded-full bg-linear-to-b from-web-coral-from to-web-coral-to text-web-white", size === "sm" ? "size-5" : "size-6")}>
      <Icon name="check" size={size === "sm" ? 11 : 13} />
    </span>
  );
}

export function CourseDisclaimer({ text }: { text: string }) {
  return (
    <p className="border-t border-web-line pt-6 text-[0.8125rem] text-web-muted" data-testid="course-disclaimer">
      {text}
    </p>
  );
}
