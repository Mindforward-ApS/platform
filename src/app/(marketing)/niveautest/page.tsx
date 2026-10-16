import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { PLACEMENT_TRACKS } from "@/lib/config/placement";
import { getMessages } from "@/lib/i18n";

// P4 (docs/01 § 4.1 step 2): pick the tool. "Ved ikke/flere" → ChatGPT track (can be changed later).

/** A whole-card link whose accessible name is only the title; the help text is linked via aria-describedby. */
function TrackCard({ href, title, help, id }: { href: string; title: string; help: ReactNode; id: string }) {
  return (
    <li className="group relative flex items-center gap-4 rounded-card border border-line bg-surface p-5 transition-[background-color,border-color] duration-[120ms] hover:border-line-strong hover:bg-sunken/50 sm:px-7 sm:py-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link href={href} aria-describedby={id} className="text-title-3 text-ink after:absolute after:inset-0 after:rounded-card focus-visible:outline-none focus-visible:after:shadow-ring">
          {title}
        </Link>
        <p id={id} className="text-body-sm text-ink-muted">
          {help}
        </p>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint text-tint-ink transition-transform duration-[120ms] group-hover:translate-x-0.5" aria-hidden="true">
        <Icon name="arrowRight" size={18} />
      </span>
    </li>
  );
}

export default function PlacementPickPage() {
  const t = getMessages().placement;
  return (
    <main className="mf-v3 mx-auto flex w-full max-w-read flex-1 flex-col gap-10 px-4 pt-10 pb-20 sm:px-6 sm:pt-16">
      <header className="mf-hero flex flex-col gap-4 rounded-card p-6 sm:px-8 sm:py-8">
        <p className="self-start rounded-full border border-hero-chip-line px-3 py-1 text-[0.8125rem] text-on-hero">{t.pick.eyebrow}</p>
        <h1 className="text-title-1 font-bold text-on-hero">{t.pick.title}</h1>
        <p className="text-body-lg text-pretty text-on-hero">{t.pick.intro}</p>
        <ul className="flex flex-wrap gap-2 pt-1 text-body-sm text-on-hero">
          {t.pick.facts.map((f) => (
            <li key={f} className="flex items-center gap-1.5 rounded-full border border-hero-pill-line bg-hero-pill px-3 py-1">
              <Icon name="check" />
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
