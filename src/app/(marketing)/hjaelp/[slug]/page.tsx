import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/player/markdown";
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
  const { slug } = await props.params;
  const index = helpIndex();
  const article = index.get(slug);
  if (!article) notFound();
  const related = article.related.map((r) => index.get(r)).filter((a) => a !== undefined);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6" data-testid="help-article">
      <Link className="text-sm underline" href="/hjaelp">
        {t.back}
      </Link>
      <h1 className="text-2xl font-semibold">{article.title}</h1>
      <p className="text-sm text-muted">{format(t.updated, { date: formatDay(article.updatedAt) })}</p>
      <Markdown text={article.body} />
      {related.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.related}</h2>
          <ul className="list-disc pl-6">
            {related.map((r) => (
              <li key={r.slug}>
                <Link className="underline" href={helpArticleUrl(r.slug)}>
                  {r.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <Link className="underline" href="/konto/support">
        {t.askSupport}
      </Link>
    </main>
  );
}
