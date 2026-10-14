import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/icons";
import { Badge, cx, type Tone } from "@/components/ui/primitives";

// Small presentation pieces shared by the company admin and the owner console. Tokens only; no data access.

/** "Label: value" → [label, value]. Used to lay out pre-formatted report lines as label/value pairs. */
export function splitLine(line: string): [string, string] {
  const i = line.indexOf(": ");
  return i === -1 ? ["", line] : [line.slice(0, i), line.slice(i + 2)];
}

/** Status pill with an icon, so status is never carried by color alone. */
export function StatusBadge({ tone, icon, children, testId }: { tone: Tone; icon?: IconName; children: ReactNode; testId?: string }) {
  return (
    <Badge tone={tone} icon={icon}>
      <span data-testid={testId}>{children}</span>
    </Badge>
  );
}

/** One onboarding step: done/missing marker, label, status word, and the page that completes it. */
export function ChecklistStep({ index, label, done, href, doneText, todoText }: { index: number; label: string; done: boolean; href: string; doneText: string; todoText: string }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-4 px-6 py-4 transition-colors duration-[120ms] hover:bg-sunken">
        <span
          className={cx(
            "grid size-7 shrink-0 place-items-center rounded-full text-caption font-semibold tabular-nums",
            done ? "bg-success-soft text-success" : "bg-surface text-ink-muted ring-1 ring-inset ring-line-strong",
          )}
          aria-hidden="true"
        >
          {done ? <Icon name="check" size={14} strokeWidth={2.25} /> : index}
        </span>
        <span className={cx("min-w-0 flex-1 text-body", done ? "text-ink-muted" : "text-ink")}>{label}</span>
        <Badge tone={done ? "success" : "neutral"} icon={done ? "check" : "clock"}>
          {done ? doneText : todoText}
        </Badge>
        <Icon name="chevronRight" className="hidden text-ink-subtle transition-transform duration-[120ms] group-hover:translate-x-0.5 sm:block" />
      </Link>
    </li>
  );
}

/** Label above a value — the phone layout for a table-like row; on desktop the label is only for screen readers. */
export function Cell({ label, className, children, align = "start" }: { label: string; className?: string; children: ReactNode; align?: "start" | "end" }) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-0.5", align === "end" && "md:items-end md:text-right", className)}>
      <span className="text-caption text-ink-muted md:sr-only">{label}</span>
      <div className="min-w-0 text-body-sm text-ink">{children}</div>
    </div>
  );
}

/** Clickable panel linking to a section (owner overview). Border first; shadow on hover only. */
export function LinkCard({ href, icon, title, body, cta }: { href: string; icon: IconName; title: string; body: string; cta: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 transition-[box-shadow,border-color] duration-[120ms] hover:border-line-strong hover:shadow-sm"
    >
      <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
        <Icon name={icon} size={20} />
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-title-3 text-ink">{title}</span>
        <span className="text-body-sm text-ink-muted">{body}</span>
      </span>
      <span className="mt-auto flex items-center gap-1.5 text-label text-accent">
        {cta}
        <Icon name="arrowRight" className="transition-transform duration-[120ms] group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/** Mono box for values that are copied by hand (TXT record, TOTP key, one-time links). */
export function CodeBox({ children, testId, className }: { children: ReactNode; testId?: string; className?: string }) {
  return (
    <code data-testid={testId} className={cx("block rounded-sm border border-line bg-sunken px-3 py-2.5 font-mono text-mono break-all text-ink", className)}>
      {children}
    </code>
  );
}
