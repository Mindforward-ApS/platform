import { Icon } from "@/components/ui/icons";
import { format, getMessages } from "@/lib/i18n";

type PageKey = keyof ReturnType<typeof getMessages>["placement"]["legal"]["pages"];
interface Section {
  heading: string;
  body?: readonly string[];
  list?: readonly string[];
}

/** Stable, readable anchor ids from Danish headings ("Hvem er dataansvarlig" → "hvem-er-dataansvarlig"). */
function anchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Placeholder legal page (docs/10 § 8): clearly marked draft, version + date, structured sections.
 * Presentation only — the wording comes verbatim from i18n and is never changed here.
 */
export function LegalPage({ page }: { page: PageKey }) {
  const all = getMessages();
  const t = all.placement.legal;
  const p = t.pages[page];
  const sections = (p.sections as readonly Section[]).map((s) => ({ ...s, id: anchor(s.heading) }));
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="flex max-w-read flex-col gap-4">
        <div role="note" className="flex items-center gap-2 self-start rounded-sm bg-hint-soft px-3 py-1.5 text-label text-hint">
          <Icon name="alert" />
          <span data-testid="legal-draft">{t.draftBanner}</span>
        </div>
        <h1 className="text-title-1 text-ink sm:text-display">{p.title}</h1>
        <p className="text-body-sm text-ink-muted">{format(t.versionLine, { version: p.version, date: p.updated })}</p>
        <p className="text-body-sm text-ink-muted">{t.placeholderNote}</p>
      </header>

      <div className="grid items-start gap-10 border-t border-line pt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav aria-labelledby="legal-toc" className="flex flex-col gap-3 lg:sticky lg:top-24">
          <p id="legal-toc" className="text-overline text-ink-subtle uppercase">
            {all.marketing.legal.toc}
          </p>
          <ol className="flex flex-col gap-0.5 border-l border-line">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px flex gap-3 border-l border-transparent py-1.5 pl-4 text-body-sm text-ink-muted transition-colors hover:border-line-strong hover:text-ink">
                  <span className="font-mono text-mono text-ink-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex max-w-read flex-col gap-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="flex scroll-mt-24 flex-col gap-3">
              <h2 className="text-title-2 text-ink">{s.heading}</h2>
              {s.body?.map((b) => (
                <p key={b} className="text-body text-ink sm:text-body-lg">
                  {b}
                </p>
              ))}
              {s.list && (
                <ul className="flex list-disc flex-col gap-2 pl-6 text-body text-ink marker:text-ink-subtle sm:text-body-lg">
                  {s.list.map((l) => (
                    <li key={l} className="pl-1">
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}
