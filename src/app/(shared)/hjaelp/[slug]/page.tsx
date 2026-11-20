import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCard, SupportCard } from "@/components/marketing/help";
import { Markdown } from "@/components/player/markdown";
import { Icon } from "@/components/ui/icons";
import { format, getMessages } from "@/lib/i18n";
import { helpArticleUrl, helpIndex } from "@/server/support/help";

// One help article (docs/08 § 5). Static: articles are repo content, prerendered at build.

export function generateStaticParams() {
  return helpIndex()
    .all()
    .map((a) => ({ slug: a.slug }));
}

export async function generateMetadata(props: PageProps<"/hjaelp/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const a = helpIndex().get(slug);
  return { title: a ? `${a.title} · ${getMessages().support.help.title}` : getMessages().support.help.title };
}

function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Copenhagen" }).format(new Date(`${iso}T12:00:00Z`));
}

export default async function HelpArticlePage(props: PageProps<"/hjaelp/[slug]">) {
  const t = getMessages().support.help;
  const m = getMessages().marketing.help;
  const { slug } = await props.params;
  const index = helpIndex();
  const article = index.get(slug);
  if (!article) notFound();
  const related = article.related.map((r) => index.get(r)).filter((a) => a !== undefined);
  return (
    <main className="mx-auto flex w-full max-w-read flex-1 flex-col gap-10 px-4 pt-8 pb-20 sm:px-6 sm:pt-12" data-testid="help-article">
      <nav aria-label={m.breadcrumb}>
        <Link href="/hjaelp" className="inline-flex items-center gap-1.5 text-body-sm text-ink-muted transition-colors hover:text-ink">
          <Icon name="arrowLeft" />
          {t.back}
        </Link>
      </nav>
      <header className="flex flex-col gap-3 border-b border-line pb-8">
        <p className="text-overline text-accent uppercase">{m.breadcrumb}</p>
        <h1 className="text-title-1 text-ink">{article.title}</h1>
        <p className="text-body-sm text-ink-subtle">{format(t.updated, { date: formatDay(article.updatedAt) })}</p>
      </header>
      <div className="text-body text-ink sm:text-body-lg [&_li]:pl-1 [&_li+li]:mt-2 [&_ol]:marker:text-ink-subtle [&_strong]:font-semibold [&_ul]:marker:text-ink-subtle">
        <Markdown text={article.body} />
      </div>
      {related.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-line pt-8">
          <h2 className="text-title-3 text-ink">{t.related}</h2>
          <ul className="flex flex-col gap-3">
            {related.map((r) => (
              <ArticleCard key={r.slug} href={helpArticleUrl(r.slug)} title={r.title} />
            ))}
          </ul>
        </section>
      )}
      <SupportCard />
    </main>
  );
}
