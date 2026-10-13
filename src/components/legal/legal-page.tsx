import { format, getMessages } from "@/lib/i18n";

type PageKey = keyof ReturnType<typeof getMessages>["placement"]["legal"]["pages"];
interface Section {
  heading: string;
  body?: readonly string[];
  list?: readonly string[];
}

/** Placeholder legal page (docs/10 § 8): clearly marked draft, version + date, structured sections. */
export function LegalPage({ page }: { page: PageKey }) {
  const t = getMessages().placement.legal;
  const p = t.pages[page];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <p role="note" className="rounded-md border border-danger p-3 font-semibold text-danger" data-testid="legal-draft">
        {t.draftBanner}
      </p>
      <h1 className="text-2xl font-semibold">{p.title}</h1>
      <p className="text-sm text-muted">{format(t.versionLine, { version: p.version, date: p.updated })}</p>
      <p className="text-sm text-muted">{t.placeholderNote}</p>
      {(p.sections as readonly Section[]).map((s) => (
        <section key={s.heading} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{s.heading}</h2>
          {s.body?.map((b) => <p key={b}>{b}</p>)}
          {s.list && (
            <ul className="list-disc pl-6">
              {s.list.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </main>
  );
}
