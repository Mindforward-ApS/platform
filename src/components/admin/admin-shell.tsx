import type { ReactNode } from "react";
import { NavLink } from "@/components/shell/nav-link";
import { Icon, type IconName } from "@/components/ui/icons";
import { getMessages } from "@/lib/i18n";

// Company admin frame: sidebar on desktop, scrolling tabs on phones; the page title sits above the content.

export function AdminShell({ title, lead, actions, children }: { title: string; lead?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  const t = getMessages().orgAdmin.nav;
  const links: [string, string, IconName, boolean?][] = [
    ["/virksomhed", t.overview, "grid", true],
    ["/virksomhed/medarbejdere", t.members, "users"],
    ["/virksomhed/rapport", t.report, "chart"],
    ["/virksomhed/data", t.data, "shield"],
    ["/virksomhed/databehandleraftale", t.dpa, "file"],
    ["/konto", t.account, "user"],
  ];
  return (
    <div className="mx-auto flex w-full max-w-app flex-1 flex-col gap-8 px-4 pt-8 pb-20 sm:px-6 md:flex-row md:gap-10 md:pt-12">
      <aside className="md:w-56 md:shrink-0">
        <nav aria-label={t.overview} className="-mx-4 flex gap-1 overflow-x-auto px-4 md:sticky md:top-24 md:mx-0 md:flex-col md:px-0">
          {links.map(([href, label, icon, exact]) => (
            <NavLink key={href} href={href} exact={exact} variant="side">
              <Icon name={icon} />
              <span className="whitespace-nowrap">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col gap-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-title-1 text-ink">{title}</h1>
            {lead && <p className="max-w-read text-body-lg text-ink-muted">{lead}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </header>
        <div className="flex flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}

export function Section({ title, description, actions, children, testId }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; testId?: string }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface" data-testid={testId}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3 text-ink">{title}</h2>
          {description && <p className="text-body-sm text-ink-muted">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="flex flex-col gap-4 p-6">{children}</div>
    </section>
  );
}
