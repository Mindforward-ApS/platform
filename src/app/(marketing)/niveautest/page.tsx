import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { PLACEMENT_TRACKS } from "@/lib/config/placement";
import { getMessages } from "@/lib/i18n";

// P4 (docs/01 § 4.1 step 2): pick the tool. "Ved ikke/flere" → ChatGPT track (can be changed later).

/** A whole-card link whose accessible name is only the title; the help text is linked via aria-describedby. */
function TrackCard({ href, title, help, id }: { href: string; title: string; help: ReactNode; id: string }) {
  return (
    <li className="group relative flex items-center gap-4 rounded-lg border border-line bg-surface p-5 transition-[box-shadow,border-color] duration-[120ms] hover:border-line-strong hover:shadow-sm sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={href} aria-describedby={id} className="text-title-3 text-ink after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:shadow-ring">
          {title}
        </Link>
        <p id={id} className="text-body-sm text-ink-muted">
          {help}
        </p>
      </div>
      <Icon name="arrowRight" size={18} className="shrink-0 text-ink-subtle transition-[color,transform] duration-[120ms] group-hover:translate-x-0.5 group-hover:text-accent" />
    </li>
  );
}

export default function PlacementPickPage() {
  const t = getMessages().placement;
  return (
    <main className="mx-auto flex w-full max-w-read flex-1 flex-col gap-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-16">
      <header className="flex flex-col gap-4">
        <p className="text-overline text-accent uppercase">{t.pick.eyebrow}</p>
        <h1 className="text-title-1 text-ink sm:text-display">{t.pick.title}</h1>
        <p className="text-body-lg text-pretty text-ink-muted">{t.pick.intro}</p>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-body-sm text-ink-muted">
          {t.pick.facts.map((f) => (
            <li key={f} className="flex items-center gap-1.5">
              <Icon name="check" className="text-success" />
              {f}
            </li>
          ))}
        </ul>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="choose-track">
        <h2 id="choose-track" className="text-title-3 text-ink">
          {t.pick.chooseTrack}
        </h2>
        <ul className="flex flex-col gap-3">
          {PLACEMENT_TRACKS.map((slug) => {
            const key = slug.toUpperCase() as keyof typeof t.tracks;
            return <TrackCard key={slug} id={`track-${slug}`} href={`/niveautest/${slug}`} title={t.tracks[key]} help={t.pick.trackHelp[key]} />;
          })}
          <TrackCard id="track-unsure" href="/niveautest/chatgpt" title={t.pick.unsure} help={t.pick.unsureHelp} />
        </ul>
      </section>

      <p className="border-t border-line pt-6 text-caption text-ink-subtle">{t.pick.disclaimer}</p>
    </main>
  );
}
