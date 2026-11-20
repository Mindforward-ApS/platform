import Link from "next/link";
import { AppIcon, Icon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";

// Help center presentation helpers (docs/08 § 5). Display only — search and content live in src/server/support/help.ts.

/** First paragraph of an article as plain text, for card teasers. */
export function teaser(body: string, max = 140): string {
  const first = body.split(/\n{2,}/).find((b) => b.trim() && !/^(\d+\.|[-*])\s/.test(b.trim())) ?? "";
  const plain = first.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\s+/g, " ").trim();
  return plain.length > max ? `${plain.slice(0, max).replace(/\s+\S*$/, "")} …` : plain;
}

export function ArticleCard({ href, title, excerpt }: { href: string; title: string; excerpt?: string }) {
  return (
    <li className="group relative flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 transition-[box-shadow,border-color] duration-[120ms] hover:border-line-strong hover:shadow-sm">
      <Link href={href} className="flex items-start justify-between gap-3 text-label text-ink after:absolute after:inset-0 after:rounded-lg">
        {title}
        <Icon name="arrowRight" className="mt-0.5 shrink-0 text-ink-subtle transition-[color,transform] duration-[120ms] group-hover:translate-x-0.5 group-hover:text-accent" />
      </Link>
      {excerpt && <p className="text-body-sm text-ink-muted">{excerpt}</p>}
    </li>
  );
}

export function SupportCard() {
  const t = getMessages().marketing.help;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="flex gap-4">
        <AppIcon name="chats" tone="sky" size="md" />
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3 text-ink">{t.supportTitle}</h2>
          <p className="text-body-sm text-ink-muted">{t.supportBody}</p>
        </div>
      </div>
      <ButtonLink href="/konto/support" variant="secondary" className="shrink-0 self-start sm:self-center">
        {t.supportCta}
      </ButtonLink>
    </section>
  );
}
