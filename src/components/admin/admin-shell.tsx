import type { ReactNode } from "react";

// Company admin page body. Navigation lives in the app sidebar ("Virksomhed" group, see (org-admin)/layout.tsx).

export function AdminShell({ title, lead, actions, children }: { title: string; lead?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 lg:px-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1 text-ink">{title}</h1>
          {lead && <p className="max-w-read text-body-lg text-ink-muted">{lead}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </header>
      <div className="flex flex-col gap-6">{children}</div>
    </main>
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
