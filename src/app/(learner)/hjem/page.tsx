import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { num } from "@/components/player/kit";
import { StatusBadge } from "@/components/player/module-card";
import { AppIcon, Icon, type IconName } from "@/components/ui/icons";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Illustration } from "@/components/ui/illustration";
import { coverGround } from "@/components/ui/module-cover";
import { Badge, ButtonLink, cx, EmptyState, ProgressBar, TextLink } from "@/components/ui/primitives";
import { coverPhoto, illustrationForModule } from "@/lib/config/illustrations";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { needsFirstLoginInfo } from "@/server/admin/first-login";
import { listMyCertificates } from "@/server/certificates/service";
import { db } from "@/server/db";
import type { CatalogEntry } from "@/server/modules/catalog";
import { listModulesForLearner } from "@/server/modules/catalog";
import { playableOptions } from "@/server/modules/deps";

// Learner home after login (Marco 14 Oct 2026): next module as a hero, recommendations, progress and free practice.
// Only the learner's own data; no comparison with colleagues (docs/01 § 7).

const t = getMessages().player;

/** Photo variant: compact horizontal card — photo left, text right (dashboard density). */
function NextModulePhoto({ entry, number, photo }: { entry: CatalogEntry; number: number; photo: string }) {
  const started = entry.status === "IN_PROGRESS";
  return (
    <section className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-xs md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="relative min-h-48 bg-sunken md:min-h-full">
        {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
        <img src={photo} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-[72%_55%]" />
        <span className="absolute top-4 left-4 inline-flex h-7 items-center gap-2 rounded-full bg-on-night/90 px-3 text-caption font-semibold text-night shadow-xs backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-rav" />
          {started ? t.home.continueEyebrow : t.home.startEyebrow}
        </span>
      </div>
      <div className="flex flex-col gap-4 p-6 lg:p-8">
        <p className="text-overline text-accent uppercase">{format(t.list.moduleNumber, { n: number })}</p>
        <div className="flex flex-col gap-2">
          <h2 className="text-title-2 text-ink">{entry.title}</h2>
          <p className="line-clamp-3 text-body text-ink-muted">{entry.summary}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
          <p className="flex items-center gap-4 font-mono text-mono text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" size={14} />
              {format(t.list.minutes, { minutes: num(entry.minutes) })}
            </span>
            {entry.steps > 0 && <span>{format(t.list.steps, { count: num(entry.steps) })}</span>}
          </p>
          <ButtonLink href={`/modul/${entry.slug}`} trailingIcon="arrowRight">
            {started ? t.home.continue : t.home.start}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

function NextModule({ entry, number }: { entry: CatalogEntry; number: number }) {
  const photo = coverPhoto(entry.slug);
  if (photo) return <NextModulePhoto entry={entry} number={number} photo={photo} />;
  const started = entry.status === "IN_PROGRESS";
  const g = coverGround(entry.slug);
  return (
    <section className={cx("relative isolate grid overflow-hidden rounded-2xl md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]", g.ground)}>
      <div className="flex flex-col gap-5 p-7 sm:p-10">
        <span className="inline-flex h-7 items-center gap-2 self-start rounded-full bg-surface/90 px-3 text-caption font-semibold text-ink shadow-xs">
          <span className="size-1.5 rounded-full bg-rav" />
          {started ? t.home.continueEyebrow : t.home.startEyebrow} · {format(t.list.moduleNumber, { n: number })}
        </span>
        <div className="flex flex-col gap-3">
          <h2 className="text-title-1 text-ink">{entry.title}</h2>
          <p className="max-w-md text-body-lg text-ink-muted">{entry.summary}</p>
        </div>
        <p className="flex flex-wrap items-center gap-4 font-mono text-mono text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={14} />
            {format(t.list.minutes, { minutes: num(entry.minutes) })}
          </span>
          {entry.steps > 0 && <span>{format(t.list.steps, { count: num(entry.steps) })}</span>}
          {started && <Badge tone="accent">{t.home.inProgress}</Badge>}
        </p>
        <div className="pt-1">
          <ButtonLink href={`/modul/${entry.slug}`} size="lg" trailingIcon="arrowRight">
            {started ? t.home.continue : t.home.start}
          </ButtonLink>
        </div>
      </div>
      <div className="relative hidden min-h-64 md:block" aria-hidden="true">
        <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" fill="none">
          <g className={g.ring} strokeWidth="1.5" opacity=".22">
            <circle cx="150" cy="150" r="72" />
            <circle cx="150" cy="150" r="112" />
            <circle cx="150" cy="150" r="152" />
          </g>
        </svg>
        <Illustration name={illustrationForModule(entry.slug)} priority className="absolute top-1/2 left-1/2 h-[62%] max-h-60 -translate-x-1/2 -translate-y-1/2" />
        <Illustration name="tick" className="absolute top-[14%] right-[12%] h-[16%] max-h-14 rotate-12 opacity-90" />
        <Illustration name="flash" className="absolute bottom-[12%] left-[10%] h-[18%] max-h-16 -rotate-12 opacity-90" />
      </div>
    </section>
  );
}

function Kpi({ icon, label, value, hint, children }: { icon: IconName; label: string; value: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-xs sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <AppIcon name={icon} size="sm" />
        <p className="text-label leading-tight text-ink-muted">{label}</p>
      </div>
      <p className="text-title-2 text-ink sm:text-title-1">{value}</p>
      {children}
      {hint && <p className="hidden text-caption text-ink-subtle sm:block">{hint}</p>}
    </div>
  );
}

function Kpis({ modules, certificates }: { modules: CatalogEntry[]; certificates: number }) {
  const passed = modules.filter((m) => m.status === "PASSED");
  const best = passed.map((m) => m.bestScorePct).filter((v): v is number => v !== null);
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      <Kpi icon="book" label={t.home.kpiPassed} value={`${num(passed.length)} / ${num(modules.length)}`}>
        <ProgressBar value={passed.length} max={modules.length} tone="success" label={t.home.kpiPassed} />
      </Kpi>
      <Kpi icon="chart" label={t.home.kpiAverage} value={avg === null ? t.home.none : `${num(avg)} %`} hint={t.home.kpiAverageHint} />
      <Kpi icon="lightning" label={t.home.kpiInProgress} value={num(modules.filter((m) => m.status === "IN_PROGRESS").length)} hint={t.home.kpiInProgressHint} />
      <Kpi icon="award" label={t.home.kpiCertificates} value={num(certificates)} hint={t.home.kpiCertificatesHint} />
    </div>
  );
}

function ModuleThumb({ slug }: { slug: string }) {
  const photo = coverPhoto(slug);
  if (photo)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public
      <img src={photo} alt="" aria-hidden="true" loading="lazy" className="h-10 w-14 shrink-0 rounded-lg object-cover object-[72%_55%] ring-1 ring-line sm:h-12 sm:w-[72px]" />
    );
  return <span className={cx("h-10 w-14 shrink-0 rounded-lg ring-1 ring-line sm:h-12 sm:w-[72px]", coverGround(slug).ground)} aria-hidden="true" />;
}

function ModuleList({ items }: { items: { m: CatalogEntry; n: number }[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-6 py-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-title-3 text-ink">{t.home.modulesTitle}</h2>
          <p className="text-body-sm text-ink-muted">{t.home.modulesLead}</p>
        </div>
        <TextLink href="/moduler" className="text-body-sm">
          {t.home.seeAll}
        </TextLink>
      </header>
      <div className="hidden grid-cols-[minmax(0,1fr)_140px_160px_24px] gap-6 border-b border-line bg-sunken px-6 py-2.5 text-caption font-semibold text-ink-muted md:grid">
        <span>{t.home.colModule}</span>
        <span>{t.home.colStatus}</span>
        <span>{t.home.colScore}</span>
        <span />
      </div>
      <ul className="divide-y divide-line">
        {items.map(({ m, n }) => (
          <li key={m.slug}>
            <Link
              href={`/modul/${m.slug}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 px-6 py-3.5 transition-colors hover:bg-sunken/60 md:grid-cols-[minmax(0,1fr)_140px_160px_24px]"
            >
              <span className="flex min-w-0 items-center gap-4">
                <ModuleThumb slug={m.slug} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="line-clamp-2 text-label text-ink md:truncate">{m.title}</span>
                  <span className="font-mono text-mono text-ink-subtle">
                    {format(t.list.moduleNumber, { n })} · {format(t.list.minutes, { minutes: num(m.minutes) })}
                  </span>
                </span>
              </span>
              <span className="justify-self-end md:justify-self-start">
                <StatusBadge status={m.status} />
              </span>
              <span className={cx("col-span-2 items-center gap-3 md:col-span-1 md:flex", m.bestScorePct === null ? "hidden" : "flex")}>
                {m.bestScorePct !== null ? (
                  <>
                    <span className="w-10 text-label text-ink">{num(Math.round(m.bestScorePct))} %</span>
                    <span className="flex-1">
                      <ProgressBar value={m.bestScorePct} tone={m.status === "PASSED" ? "success" : "accent"} label={t.home.colScore} />
                    </span>
                  </>
                ) : (
                  <span className="text-body-sm text-ink-subtle">{t.home.none}</span>
                )}
              </span>
              <Icon name="chevronRight" className="hidden text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:block" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HelpCard() {
  return (
    <section className="flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xs">
      <AppIcon name="help" size="md" />
      <div className="flex flex-col gap-1">
        <h2 className="text-label text-ink">{t.home.helpTitle}</h2>
        <p className="text-body-sm text-ink-muted">{t.home.helpBody}</p>
        <TextLink href="/hjaelp" className="mt-1 text-body-sm">
          {t.home.helpLink}
        </TextLink>
      </div>
    </section>
  );
}

function Practice() {
  const s = getMessages().shell;
  const tracks = [
    ["/sandkasse/chatgpt", s.tracks.chatgpt, "chatgpt"],
    ["/sandkasse/copilot", s.tracks.copilot, "copilot"],
    ["/sandkasse/claude", s.tracks.claude, "claude"],
  ] as const;
  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-6 pt-0 shadow-xs">
      {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
      <img src="/heroes/hero-sandbox.webp" alt="" aria-hidden="true" loading="lazy" className="-mx-6 aspect-[16/9] w-[calc(100%+3rem)] max-w-none object-cover object-[75%_50%]" />
      <div className="flex flex-col gap-1">
        <h2 className="text-title-3 text-ink">{t.home.practiceTitle}</h2>
        <p className="text-body-sm text-ink-muted">{t.home.practiceBody}</p>
      </div>
      <ul className="-mx-2 flex flex-col">
        {tracks.map(([href, label, brand]) => (
          <li key={href}>
            <Link href={href} className="group flex items-center gap-3 rounded-md px-2 py-2.5 text-label text-ink transition-colors hover:bg-sunken">
              <BrandIcon brand={brand} size={24} />
              {label}
              <Icon name="arrowRight" className="ml-auto text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/hjem");
  // M7: B2B employees see once what their admin can and cannot see (docs/10 § 1.6) — same gate as /konto.
  if (await needsFirstLoginInfo(db(), ctx.user.id, ctx.membership.organizationId)) redirect("/konto/data-info");
  const [modules, certs] = await Promise.all([
    listModulesForLearner(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, playableOptions()),
    listMyCertificates(db(), ctx.user.id),
  ]);
  const firstName = ctx.user.name?.trim().split(/\s+/)[0];
  const visible = modules.filter((m) => m.status !== "REMOVED");
  const numbered = visible.map((m, i) => ({ m, n: i + 1 }));
  const next = numbered.find(({ m }) => m.status === "IN_PROGRESS") ?? numbered.find(({ m }) => m.status !== "PASSED");

  const today = new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-overline text-ink-subtle uppercase">{today}</p>
          <h1 className="text-title-1 text-ink">{firstName ? format(t.home.greeting, { name: firstName }) : t.home.greetingNoName}</h1>
          <p className="text-body text-ink-muted">{t.home.lead}</p>
        </div>
        <ButtonLink href="/plan" variant="secondary" icon="plan">
          {t.home.planCta}
        </ButtonLink>
      </header>
      {visible.length === 0 ? (
        <EmptyState icon="book" title={t.home.emptyTitle}>
          {t.home.emptyBody}
        </EmptyState>
      ) : (
        <>
          <Kpis modules={visible} certificates={certs.length} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-6">
              {next ? (
                <NextModule entry={next.m} number={next.n} />
              ) : (
                <EmptyState icon="award" title={t.home.allPassedTitle}>
                  {t.home.allPassedBody}
                </EmptyState>
              )}
              <ModuleList items={numbered} />
            </div>
            <aside className="flex flex-col gap-6">
              <Practice />
              <HelpCard />
            </aside>
          </div>
        </>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <main className="flex w-full flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 lg:px-10">
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}
