import Link from "next/link";
import { AdminMock } from "@/components/marketing/admin-mock";
import { PlayerMock } from "@/components/marketing/player-mock";
import { Pricing } from "@/components/marketing/pricing";
import { SandboxMock } from "@/components/marketing/sandbox-mock";
import { Band, SectionHeading } from "@/components/marketing/section";
import { Icon, type IconName } from "@/components/ui/icons";
import { ButtonLink, TextLink } from "@/components/ui/primitives";
import { billingRules } from "@/lib/config/plans";
import { PLACEMENT_TRACKS, placementConfig } from "@/lib/config/placement";
import { format, getMessages } from "@/lib/i18n";

// P1 landing page (docs/01 § 5): value promise, how it works, product cut-out, tracks, business section,
// prices from config, FAQ and a closing CTA. No invented numbers, customers, quotes or logos (CLAUDE.md ALDRIG).

const HOW_ICONS: IconName[] = ["target", "route", "sandbox", "chart", "clock"];
const FEATURE_ICONS: IconName[] = ["clock", "chart", "award", "chat", "lock", "sparkle"];
const BUSINESS_ICONS: IconName[] = ["users", "grid", "file", "shield"];

function Hero() {
  const t = getMessages().marketing.hero;
  return (
    <section className="overflow-hidden border-b border-line">
      <div className="mx-auto grid w-full max-w-app items-center gap-14 px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="flex items-center gap-2 text-overline text-accent uppercase">
            <span className="size-1.5 rounded-full bg-rav" aria-hidden="true" />
            {t.eyebrow}
          </p>
          <h1 className="text-display text-ink sm:text-display-xl">{t.title}</h1>
          <p className="max-w-[34rem] text-body-lg text-ink-muted">{t.lead}</p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <ButtonLink href="/niveautest" size="lg" trailingIcon="arrowRight">
              {t.primary}
            </ButtonLink>
            <ButtonLink href="#virksomheder" size="lg" variant="secondary">
              {t.secondary}
            </ButtonLink>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-ink-muted">
            {t.facts.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <Icon name="check" className="text-success" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <PlayerMock />
      </div>
    </section>
  );
}

function TrackStrip() {
  const all = getMessages();
  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-app flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-6">
        <p className="shrink-0 text-overline text-ink-subtle uppercase">{all.marketing.tracksStrip.label}</p>
        <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
          {Object.values(all.placement.tracks).map((name) => (
            <li key={name} className="text-title-3 text-ink-muted">
              {name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HowItWorks() {
  const t = getMessages().marketing.how;
  return (
    <Band id="saadan-virker-det">
      <div className="flex flex-col gap-12">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <ol className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {t.steps.map((s, i) => (
            <li
              key={s.title}
              className="flex flex-col gap-4 bg-surface p-6 sm:last:col-span-2 lg:last:col-span-1"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent-ink">
                  <Icon name={HOW_ICONS[i] ?? "sparkle"} size={20} />
                </span>
                <span className="font-mono text-mono text-ink-subtle tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="text-title-3 text-ink">{s.title}</h3>
              <p className="text-body-sm text-ink-muted">{format(s.body, { questions: placementConfig.maxQuestions })}</p>
            </li>
          ))}
        </ol>
      </div>
    </Band>
  );
}

function SandboxBand() {
  const t = getMessages().marketing.sandbox;
  return (
    <Band tone="night">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div className="flex flex-col gap-10">
          <SectionHeading tone="night" eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
          <ul className="flex flex-col gap-6">
            {t.points.map((p) => (
              <li key={p.title} className="flex gap-4">
                <Icon name="check" size={18} className="mt-1 text-night-accent" />
                <div className="flex flex-col gap-1">
                  <h3 className="text-title-3 text-on-night">{p.title}</h3>
                  <p className="text-body-sm text-on-night-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SandboxMock />
      </div>
    </Band>
  );
}

function Features() {
  const t = getMessages().marketing.features;
  return (
    <Band>
      <div className="flex flex-col gap-12">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {t.items.map((f, i) => (
            <li key={f.title} className="flex flex-col gap-3 border-t border-line pt-6">
              <Icon name={FEATURE_ICONS[i] ?? "sparkle"} size={20} className="text-accent" />
              <h3 className="text-title-3 text-ink">{f.title}</h3>
              <p className="text-body-sm text-ink-muted">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Band>
  );
}

function Tracks() {
  const all = getMessages();
  const t = all.marketing.tracks;
  return (
    <Band id="spor" tone="surface">
      <div className="flex flex-col gap-12">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <ul className="grid gap-6 md:grid-cols-3">
          {PLACEMENT_TRACKS.map((slug) => {
            const key = slug.toUpperCase() as keyof typeof t.items;
            return (
              <li key={slug}>
                <Link
                  href={`/niveautest/${slug}`}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-6 transition-[box-shadow,border-color] duration-[120ms] hover:border-line-strong hover:shadow-sm"
                >
                  <span className="text-title-2 text-ink">{all.placement.tracks[key]}</span>
                  <span className="text-body-sm text-ink-muted">{t.items[key]}</span>
                  <span className="mt-auto flex items-center gap-1.5 pt-3 text-label text-accent">
                    {all.marketing.hero.primary}
                    <Icon name="arrowRight" className="transition-transform duration-[120ms] group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-2 text-body-sm text-ink-muted">
          <p>
            <TextLink href="/niveautest">{t.unsure}</TextLink>
          </p>
          <p className="text-caption text-ink-subtle">{all.placement.pick.disclaimer}</p>
        </div>
      </div>
    </Band>
  );
}

function Business() {
  const t = getMessages().marketing.business;
  return (
    <Band id="virksomheder">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="flex flex-col gap-10">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
          <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {t.points.map((p, i) => (
              <li key={p.title} className="flex flex-col gap-2">
                <span className="flex items-center gap-2 text-title-3 text-ink">
                  <Icon name={BUSINESS_ICONS[i] ?? "check"} className="text-accent" />
                  {p.title}
                </span>
                <p className="text-body-sm text-ink-muted">{p.body}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/virksomhed/opret" size="lg" trailingIcon="arrowRight">
              {t.primary}
            </ButtonLink>
            <ButtonLink href="#priser" size="lg" variant="ghost">
              {t.secondary}
            </ButtonLink>
          </div>
        </div>
        <AdminMock />
      </div>
    </Band>
  );
}

function Prices() {
  const t = getMessages().marketing.pricing;
  return (
    <Band id="priser" tone="surface">
      <div className="flex flex-col gap-12">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
        <Pricing />
      </div>
    </Band>
  );
}

function Faq() {
  const t = getMessages().marketing.faq;
  return (
    <Band id="faq">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} />
          <p className="text-body">
            <TextLink href="/hjaelp">{t.more}</TextLink>
          </p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {t.items.map((item) => (
            <details key={item.q} className="group">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-title-3 text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <Icon name="plus" size={18} className="mt-1 shrink-0 text-ink-muted transition-transform duration-[120ms] group-open:rotate-45" />
              </summary>
              <p className="max-w-read pb-6 text-body text-ink-muted">{format(item.a, { days: billingRules.withdrawalDays })}</p>
            </details>
          ))}
        </div>
      </div>
    </Band>
  );
}

function Closing() {
  const t = getMessages().marketing.closing;
  return (
    <Band tone="night">
      <div className="flex flex-col items-center gap-8 text-center">
        <SectionHeading tone="night" align="center" title={t.title} lead={t.body} />
        <div className="flex flex-col items-center gap-5">
          <ButtonLink href="/niveautest" size="lg" trailingIcon="arrowRight" className="bg-night-accent text-night hover:bg-on-night">
            {t.primary}
          </ButtonLink>
          <Link href="/virksomhed/opret" className="text-label text-on-night-muted underline decoration-night-line underline-offset-[3px] transition-colors hover:text-on-night">
            {t.secondary}
          </Link>
        </div>
      </div>
    </Band>
  );
}

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <Hero />
      <TrackStrip />
      <HowItWorks />
      <SandboxBand />
      <Features />
      <Tracks />
      <Business />
      <Prices />
      <Faq />
      <Closing />
    </main>
  );
}
