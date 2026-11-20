import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr";

export function PageHeader({ title, sub, actions, children }: { title: string; sub?: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">{title}</h1>
          {sub ? <p className="mt-1 text-[0.8125rem] text-pf-muted">{sub}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function Tabs({ items, active }: { items: { label: string; href: string }[]; active: string }) {
  return (
    <nav className="mt-4 flex gap-5 border-b border-[var(--border)] text-[0.8125rem]">
      {items.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`-mb-px border-b-2 pb-2.5 font-medium ${t.label === active ? "border-[var(--coral)] text-heading" : "border-transparent text-pf-muted hover:text-heading"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function SectionTitle({ title, href, link = "Se alle" }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[0.9375rem] font-semibold text-heading">{title}</h2>
      {href ? (
        <Link href={href} className="flex items-center gap-1 text-[0.75rem] font-medium text-[var(--accent)]">
          {link} <CaretRightIcon size={12} />
        </Link>
      ) : null}
    </div>
  );
}

export function Avatar({ initials, size = 32, tone = "ink" }: { initials: string; size?: number; tone?: "ink" | "soft" | "grey" }) {
  const cls = tone === "ink" ? "bg-[var(--ink)] text-pf-white" : tone === "soft" ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--hover-fill)] text-heading";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full font-semibold ${cls}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {initials}
    </span>
  );
}

export function Chip({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "ink" | "grey" | "white" }) {
  const cls = {
    soft: "bg-[var(--accent-soft)] text-[var(--accent)]",
    ink: "bg-[var(--ink)] text-pf-white",
    grey: "bg-[var(--hover-fill)] text-heading",
    white: "bg-pf-white text-[var(--ink)]",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-[4px] px-1.5 py-px text-[0.625rem] font-semibold ${cls}`}>{children}</span>;
}

export function Bar({ value, dark }: { value: number; dark?: boolean }) {
  return (
    <div className={`h-1 rounded-full ${dark ? "bg-pf-white/15" : "bg-[var(--hover-fill)]"}`}>
      <div className="h-full rounded-full bg-[var(--coral)]" style={{ width: `${value}%` }} />
    </div>
  );
}

export function Card({ children, className = "", dark }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return <div className={`${dark ? "app-card-dark" : "app-card"} rounded-[12px] ${className}`}>{children}</div>;
}

/** Marks example data where greb has no real data yet (calendar events, messages, "Skub" …). */
export function Demo({ dark, label = "Eksempeldata" }: { dark?: boolean; label?: string }) {
  return dark ? (
    <span className="rounded-[4px] border border-dashed border-pf-white/25 px-1.5 py-px text-[10px] font-medium text-pf-white/55">{label}</span>
  ) : (
    <span className="rounded-[4px] border border-dashed border-[var(--border-strong)] px-1.5 py-px text-[0.625rem] font-medium text-pf-muted">{label}</span>
  );
}
