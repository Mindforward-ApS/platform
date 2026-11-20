import type { ReactNode } from "react";
import { cx } from "@/components/ui/primitives";

// Shared building blocks for the public marketing pages (landing, help center, legal). Presentation only.

/** Full-width band with the standard app container. `tone="night"` is the fixed dark band (same in both themes). */
export function Band({
  id,
  tone = "default",
  className,
  children,
}: {
  id?: string;
  tone?: "default" | "surface" | "night";
  className?: string;
  children: ReactNode;
}) {
  const look = tone === "night" ? "bg-night text-on-night" : tone === "surface" ? "border-y border-line bg-surface" : "";
  return (
    <section id={id} className={cx("scroll-mt-16", look, className)}>
      <div className="mx-auto w-full max-w-app px-4 py-20 sm:px-6 sm:py-28">{children}</div>
    </section>
  );
}

/** Eyebrow + title + lead for a section. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  tone = "default",
  align = "start",
  as: As = "h2",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  tone?: "default" | "night";
  align?: "start" | "center";
  as?: "h1" | "h2";
}) {
  const night = tone === "night";
  return (
    <div className={cx("flex max-w-read flex-col gap-4", align === "center" && "mx-auto items-center text-center")}>
      {eyebrow && <p className={cx("text-overline uppercase", night ? "text-night-accent" : "text-accent")}>{eyebrow}</p>}
      <As className={cx("text-title-1 sm:text-display", night ? "text-on-night" : "text-ink")}>{title}</As>
      {lead && <p className={cx("text-body-lg text-pretty", night ? "text-on-night-muted" : "text-ink-muted")}>{lead}</p>}
    </div>
  );
}

/** "86 %" style formatting with a thin space-free Danish percent. */
export function pct(value: number): string {
  return `${Math.round(value)} %`;
}
