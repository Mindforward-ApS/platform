import Link from "next/link";
import { Suspense } from "react";
import { format, getMessages } from "@/lib/i18n";
import { helpArticleUrl, helpIndex } from "@/server/support/help";

// Public help center (docs/08 § 5): article list + simple full-text search (?q=). No login, no personal data.

async function Results({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const t = getMessages().support.help;
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 200) ?? "";
  if (!q) return null;
  const hits = helpIndex().search(q, 5);
  return (
    <section className="flex flex-col gap-2" data-testid="help-results">
      <h2 className="text-lg font-semibold">{format(t.results, { q })}</h2>
      {hits.length === 0 && <p className="text-muted">{t.noResults}</p>}
      <ul className="flex flex-col gap-2">
        {hits.map((h) => (
          <li key={h.slug}>
            <Link className="underline" href={helpArticleUrl(h.slug)}>
              {h.title}
            </Link>
            <p className="text-sm text-muted">{h.excerpt}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HelpCenterPage(props: PageProps<"/hjaelp">) {
  const t = getMessages().support.help;
  const articles = helpIndex().all();
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p>{t.intro}</p>
      <form action="/hjaelp" method="get" role="search" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-sm">{t.searchLabel}</span>
          <input name="q" type="search" maxLength={200} placeholder={t.searchPlaceholder} className="rounded-md border border-border bg-bg px-3 py-2" />
        </label>
        <button type="submit" className="rounded-md border border-border bg-surface px-4 py-2">
          {t.searchButton}
        </button>
      </form>
      <Suspense>
        <Results searchParams={props.searchParams as Promise<{ q?: string | string[] }>} />
      </Suspense>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.allArticles}</h2>
        <ul className="list-disc pl-6">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link className="underline" href={helpArticleUrl(a.slug)}>
                {a.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Link className="underline" href="/konto/support">
        {t.askSupport}
      </Link>
    </main>
  );
}
