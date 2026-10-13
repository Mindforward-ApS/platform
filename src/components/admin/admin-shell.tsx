import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";

// Neutral placeholder layout for the company admin (design session pending, docs/11 M7).

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const t = getMessages().orgAdmin.nav;
  const links: [string, string][] = [
    ["/virksomhed", t.overview],
    ["/virksomhed/medarbejdere", t.members],
    ["/virksomhed/rapport", t.report],
    ["/virksomhed/data", t.data],
    ["/virksomhed/databehandleraftale", t.dpa],
    ["/konto", t.account],
  ];
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-6">
      <nav aria-label={t.overview} className="flex flex-wrap gap-3 text-sm">
        {links.map(([href, label]) => (
          <a key={href} href={href} className="underline">
            {label}
          </a>
        ))}
      </nav>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children}
    </main>
  );
}

export function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border p-4" data-testid={testId}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
