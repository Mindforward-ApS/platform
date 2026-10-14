import { Suspense } from "react";
import { ArticleCard, SupportCard, teaser } from "@/components/marketing/help";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/primitives";
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
    <section className="flex max-w-read flex-col gap-4" data-testid="help-results">
      <h2 className="text-title-3 text-ink">{format(t.results, { q })}</h2>
      {hits.length === 0 && (
        <p className="rounded-lg border border-dashed border-line bg-surface px-6 py-8 text-center text-body-sm text-ink-muted">{t.noResults}</p>
      )}
      <ul className="flex flex-col gap-3">
        {hits.map((h) => (
          <ArticleCard key={h.slug} href={helpArticleUrl(h.slug)} title={h.title} excerpt={h.excerpt} />
        ))}
      </ul>
    </section>
  );
}

function SearchForm({ defaultValue }: { defaultValue?: string }) {
  const t = getMessages().support.help;
  return (
    <form action="/hjaelp" method="get" role="search" className="flex flex-col gap-2">
      <label htmlFor="help-q" className="text-label text-ink">
        {t.searchLabel}
      </label>
      <div className="flex gap-2">
        <span className="relative flex-1">
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle" />
          <input
            id="help-q"
            name="q"
            type="search"
            maxLength={200}
            defaultValue={defaultValue}
            placeholder={t.searchPlaceholder}
            className="h-12 w-full rounded-sm border border-line-strong bg-surface pr-3 pl-11 text-body text-ink shadow-xs transition-[border-color,box-shadow] duration-[120ms] placeholder:text-ink-subtle focus:border-accent focus:shadow-ring focus:outline-none"
          />
        </span>
        <Button type="submit" size="lg">
          {t.searchButton}
        </Button>
      </div>
    </form>
  );
}

async function Search({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  return <SearchForm defaultValue={(Array.isArray(raw) ? raw[0] : raw)?.slice(0, 200)} />;
}

export default function HelpCenterPage(props: PageProps<"/hjaelp">) {
  const t = getMessages().support.help;
  const m = getMessages().marketing.help;
  const articles = helpIndex().all();
  const sp = props.searchParams as Promise<{ q?: string | string[] }>;
  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b border-line bg-surface">
        <div className="mx-auto w-full max-w-app px-4 pt-10 pb-12 sm:px-6 sm:pt-16 sm:pb-14">
          <div className="flex max-w-read flex-col gap-6">
            <div className="flex flex-col gap-3">
              <p className="text-overline text-accent uppercase">{m.eyebrow}</p>
              <h1 className="text-title-1 text-ink sm:text-display">{t.title}</h1>
              <p className="text-body-lg text-ink-muted">{t.intro}</p>
            </div>
            <Suspense fallback={<SearchForm />}>
              <Search searchParams={sp} />
            </Suspense>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-app flex-col gap-12 px-4 pt-10 pb-20 sm:px-6 sm:pt-12">
        <Suspense>
          <Results searchParams={sp} />
        </Suspense>
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-title-3 text-ink">{t.allArticles}</h2>
            <span className="text-body-sm text-ink-subtle tabular-nums">{format(m.articleCount, { count: articles.length })}</span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <ArticleCard key={a.slug} href={helpArticleUrl(a.slug)} title={a.title} excerpt={teaser(a.body)} />
            ))}
          </ul>
        </section>
        <SupportCard />
      </div>
    </main>
  );
}
