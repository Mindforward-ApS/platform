import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon, type BrandKey } from "@/components/ui/brand-icon";
import { Icon } from "@/components/ui/icons";
import { PLACEMENT_TRACKS } from "@/lib/config/placement";
import { getMessages } from "@/lib/i18n";

// P4 (docs/01 § 4.1 step 2): pick the tool. "Ved ikke/flere" → ChatGPT track (can be changed later).
// Website look (mindforward.dk): centred heading with the blue dot, fact chips, white cards with the tool's
// mark on a grey tile and the arrow on a tile, like the website's bezel buttons.

/** A whole-card link whose accessible name is only the title; the help text is linked via aria-describedby. */
function TrackCard({ href, title, help, id, brand }: { href: string; title: string; help: ReactNode; id: string; brand?: BrandKey }) {
  return (
    <li className="group relative flex items-center gap-4 rounded-[18px] bg-surface p-4 shadow-[0_18px_40px_-28px_var(--color-site-shadow)] ring-1 ring-site-line transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_50px_-26px_var(--color-site-shadow)] sm:gap-5 sm:p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-site-tile" aria-hidden="true">
        {brand ? <BrandIcon brand={brand} size={26} /> : <Icon name="sparkle" size={22} className="text-site-blue" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={href}
          aria-describedby={id}
          className="text-[17px] font-semibold tracking-[-0.01em] text-site-ink after:absolute after:inset-0 after:rounded-[18px] focus-visible:outline-none focus-visible:after:shadow-ring"
        >
          {title}
        </Link>
        <p id={id} className="text-[14.5px] leading-[1.55] text-site-body">
          {help}
        </p>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-site-tile text-site-blue transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true">
        <Icon name="arrowRight" size={18} />
      </span>
    </li>
  );
}

export default function PlacementPickPage() {
  const t = getMessages().placement;
  return (
    <main className="mf-v3 mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-10 px-4 pt-12 pb-20 sm:px-6 sm:pt-16">
      <header className="flex flex-col items-center gap-4 text-center">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-site-blue uppercase">{t.pick.eyebrow}</p>
        <h1 className="text-[clamp(32px,4.4vw,48px)] leading-[1.08] font-semibold tracking-[-0.025em] text-balance text-site-ink">
          {t.pick.title}
          <span className="text-site-blue">.</span>
        </h1>
        <p className="max-w-[560px] text-[16.5px] leading-[1.7] text-pretty text-site-body">{t.pick.intro}</p>
        <ul className="flex flex-wrap justify-center gap-2 pt-1 text-[14px] text-site-ink">
          {t.pick.facts.map((f) => (
            <li key={f} className="flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 ring-1 ring-site-line">
              <Icon name="check" className="text-site-blue" />
              {f}
            </li>
          ))}
        </ul>
      </header>

      <section className="flex flex-col gap-4" aria-labelledby="choose-track">
        <h2 id="choose-track" className="text-[19px] font-semibold tracking-[-0.01em] text-site-ink">
          {t.pick.chooseTrack}
        </h2>
        <ul className="flex flex-col gap-3">
          {PLACEMENT_TRACKS.map((slug) => {
            const key = slug.toUpperCase() as keyof typeof t.tracks;
            return <TrackCard key={slug} id={`track-${slug}`} href={`/niveautest/${slug}`} title={t.tracks[key]} help={t.pick.trackHelp[key]} brand={slug} />;
          })}
          <TrackCard id="track-unsure" href="/niveautest/chatgpt" title={t.pick.unsure} help={t.pick.unsureHelp} />
        </ul>
      </section>

      <p className="border-t border-site-line pt-6 text-[12.5px] leading-[1.6] text-site-body">{t.pick.disclaimer}</p>
    </main>
  );
}
