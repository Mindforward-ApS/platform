import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransferOffers } from "@/components/certificate/transfer-offer";
import { HomeCourses } from "@/components/courses/home-courses";
import { num } from "@/components/player/kit";
import { StatusBadge } from "@/components/player/module-card";
import { HeroCard, HeroMeta, HeroTitle, KpiRow, Panel, Segments } from "@/components/ui/cards";
import { Icon } from "@/components/ui/icons";
import { BrandIcon } from "@/components/ui/brand-icon";
import { coverGround } from "@/components/ui/module-cover";
import { ButtonLink, cx, EmptyState, ProgressBar, TextLink } from "@/components/ui/primitives";
import { coverPhoto } from "@/lib/config/illustrations";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { needsFirstLoginInfo } from "@/server/admin/first-login";
import { listMyCertificates } from "@/server/certificates/service";
import { getWorkProfile } from "@/server/connectors/service";
import { getMemberCourseProgress } from "@/server/courses/service";
import { db } from "@/server/db";
import type { CatalogEntry } from "@/server/modules/catalog";
import { listModulesForLearner } from "@/server/modules/catalog";
import { playableOptions } from "@/server/modules/deps";

// Learner home after login, design v3 (Marco 16 Oct 2026): next module as the blue hero, module list with segmented
// scores, own progress, free practice and help.
// Only the learner's own data; no comparison with colleagues (docs/01 § 7).

const t = getMessages().player;

/** The next module as the v3 blue hero: eyebrow chip, title, summary, level/time/steps, one white CTA. */
function NextModule({ entry, number }: { entry: CatalogEntry; number: number }) {
  const started = entry.status === "IN_PROGRESS";
  const level = (t.list.level as Record<number, string>)[entry.level];
  return (
    <HeroCard
      aside={
        <div className="flex items-end md:pl-2">
          <ButtonLink href={`/modul/${entry.slug}`} variant="secondary" size="lg" trailingIcon="arrowRight" className="rounded-full border-transparent bg-surface">
            {started ? t.home.continue : t.home.start}
          </ButtonLink>
        </div>
      }
    >
      <p className="mb-4 inline-flex items-center gap-2 self-start rounded-full border border-hero-chip-line px-3 py-1 text-[0.8125rem] text-on-hero">
        <span className="size-1.5 rounded-full bg-rav" aria-hidden="true" />
        {started ? t.home.continueEyebrow : t.home.startEyebrow} · {format(t.list.moduleNumber, { n: number })}
      </p>
      <HeroTitle as="h2">{entry.title}</HeroTitle>
      <p className="line-clamp-3 max-w-xl text-body text-on-hero">{entry.summary}</p>
      <HeroMeta
        items={[
          ...(level ? [{ text: format(t.intro.factLevel, { level: entry.level, label: level }) }] : []),
          { icon: "clock" as const, text: format(t.intro.metaMinutes, { minutes: num(entry.minutes) }) },
          ...(entry.steps > 0 ? [{ icon: "book" as const, text: format(t.list.steps, { count: num(entry.steps) }) }] : []),
          ...(started ? [{ text: t.home.inProgress }] : []),
        ]}
      />
    </HeroCard>
  );
}

/** "Din fremgang": the learner's own key figures (never compared with colleagues). */
function Progress({ modules, certificates }: { modules: CatalogEntry[]; certificates: number }) {
  const passed = modules.filter((m) => m.status === "PASSED");
  const best = passed.map((m) => m.bestScorePct).filter((v): v is number => v !== null);
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : null;
  return (
    <Panel title={t.home.progressTitle} data-testid="home-progress">
      <div className="flex flex-col gap-2">
        <p className="flex items-baseline justify-between gap-3 text-body-sm text-ink-muted">
          <span>{t.home.kpiPassed}</span>
          <span className="text-label text-ink tabular-nums">{format(t.home.passedOf, { passed: num(passed.length), total: num(modules.length) })}</span>
        </p>
        <ProgressBar value={passed.length} max={modules.length} tone="success" label={t.home.kpiPassed} />
      </div>
      <KpiRow
        bleed
        items={[
          { value: avg === null ? t.home.none : `${num(avg)} %`, label: t.home.kpiAverage, hint: t.home.kpiAverageHint },
          { value: num(modules.filter((m) => m.status === "IN_PROGRESS").length), label: t.home.kpiInProgress, hint: t.home.kpiInProgressHint },
          { value: num(certificates), label: t.home.kpiCertificates, hint: t.home.kpiCertificatesHint },
        ]}
      />
    </Panel>
  );
}

function ModuleThumb({ slug }: { slug: string }) {
  const photo = coverPhoto(slug);
  if (photo)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public
      <img src={photo} alt="" aria-hidden="true" loading="lazy" className="size-12.5 shrink-0 rounded-full object-cover object-[72%_55%] ring-1 ring-line" />
    );
  return <span className={cx("size-12.5 shrink-0 rounded-full ring-1 ring-line", coverGround(slug).ground)} aria-hidden="true" />;
}

function ModuleList({ items }: { items: { m: CatalogEntry; n: number }[] }) {
  return (
    <Panel
      title={t.home.modulesTitle}
      actions={
        <TextLink href="/moduler" className="text-body-sm">
          {t.home.seeAll}
        </TextLink>
      }
    >
      <p className="-mt-2 text-body-sm text-ink-muted">{t.home.modulesLead}</p>
      <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_auto_1rem] gap-x-4 border-b border-line pb-2 text-caption text-ink-subtle md:grid">
        <span>
          {t.home.colModule} · {t.home.colStatus}
        </span>
        <span className="text-right">{t.home.colScore}</span>
        <span />
      </div>
      <ul className="-mx-3 -mt-2 flex flex-col">
        {items.map(({ m, n }) => (
          <li key={m.slug}>
            <Link
              href={`/modul/${m.slug}`}
              className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-3 transition-colors hover:bg-sunken/70 md:grid-cols-[minmax(0,1fr)_auto_1rem]"
            >
              <span className="flex min-w-0 items-center gap-3.5">
                <ModuleThumb slug={m.slug} />
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="line-clamp-2 text-label text-ink">{m.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-body-sm text-ink-muted">
                    <StatusBadge status={m.status} />
                    <span>
                      {format(t.list.moduleNumber, { n })} · {format(t.list.minutes, { minutes: num(m.minutes) })}
                    </span>
                  </span>
                </span>
              </span>
              <span className="flex items-center justify-end gap-3">
                {m.bestScorePct !== null ? (
                  <>
                    <span className="hidden sm:flex">
                      <Segments pct={m.bestScorePct} label={`${t.home.colScore}: ${num(Math.round(m.bestScorePct))} %`} />
                    </span>
                    <span className="w-11 text-right text-label text-ink tabular-nums">{num(Math.round(m.bestScorePct))} %</span>
                  </>
                ) : (
                  <span className="text-body-sm text-ink-subtle">{t.home.none}</span>
                )}
              </span>
              <Icon name="chevronRight" className="hidden justify-self-end text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink md:block" />
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/** Invitation to the work profile → connector recommendations for the learner's industry. */
function ProfileCard() {
  const p = getMessages().profile.homeCard;
  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 sm:flex-row sm:items-center sm:px-7" data-testid="profile-card">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tint text-tint-ink" aria-hidden="true">
        <Icon name="link" size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="text-[1.125rem] font-semibold text-ink">{p.title}</h2>
        <p className="text-body-sm text-ink-muted">{p.body}</p>
      </div>
      <ButtonLink href="/profil/virksomhed" variant="secondary" trailingIcon="arrowRight" className="rounded-full">
        {p.cta}
      </ButtonLink>
    </section>
  );
}

function HelpCard() {
  return (
    <Panel title={t.home.helpTitle}>
      <p className="-mt-2 text-body-sm text-ink-muted">{t.home.helpBody}</p>
      <ButtonLink href="/hjaelp" variant="secondary" icon="help" className="self-start rounded-full">
        {t.home.helpLink}
      </ButtonLink>
    </Panel>
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
    <section className="flex flex-col overflow-hidden rounded-card border border-line bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
      <img src="/heroes/hero-sandbox.webp" alt="" aria-hidden="true" loading="lazy" className="aspect-[16/8] w-full object-cover object-[75%_50%]" />
      <div className="flex flex-col gap-3 p-6 sm:px-7">
        <div className="flex flex-col gap-1">
          <h2 className="text-[1.125rem] font-semibold text-ink">{t.home.practiceTitle}</h2>
          <p className="text-body-sm text-ink-muted">{t.home.practiceBody}</p>
        </div>
        <ul className="-mx-3 flex flex-col">
          {tracks.map(([href, label, brand]) => (
            <li key={href}>
              <Link href={href} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-label text-ink transition-colors hover:bg-sunken">
                <span className="grid size-9 place-items-center rounded-full bg-sunken" aria-hidden="true">
                  <BrandIcon brand={brand} size={20} />
                </span>
                {label}
                <Icon name="arrowRight" className="ml-auto text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/hjem");
  // M7: B2B employees see once what their admin can and cannot see (docs/10 § 1.6) — same gate as /konto.
  if (await needsFirstLoginInfo(db(), ctx.user.id, ctx.membership.organizationId)) redirect("/konto/data-info");
  const [modules, certs, workProfile, courses] = await Promise.all([
    listModulesForLearner(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, playableOptions()),
    listMyCertificates(db(), ctx.user.id),
    getWorkProfile(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }),
    getMemberCourseProgress(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }),
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
        <ButtonLink href="/plan" variant="secondary" icon="plan" className="rounded-full">
          {t.home.planCta}
        </ButtonLink>
      </header>
      <TransferOffers userId={ctx.user.id} organizationId={ctx.membership.organizationId} />
      <HomeCourses courses={courses} />
      {!workProfile?.completedAt && <ProfileCard />}
      {visible.length === 0 ? (
        <EmptyState icon="book" title={t.home.emptyTitle}>
          {t.home.emptyBody}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-7">
            {next ? (
              <NextModule entry={next.m} number={next.n} />
            ) : (
              <HeroCard>
                <HeroTitle as="h2">{t.home.allPassedTitle}</HeroTitle>
                <p className="max-w-xl text-body text-on-hero">{t.home.allPassedBody}</p>
              </HeroCard>
            )}
            <ModuleList items={numbered} />
          </div>
          <aside className="flex flex-col gap-6">
            <Progress modules={visible} certificates={certs.length} />
            <Practice />
            <HelpCard />
          </aside>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <main className="mf-stagger flex w-full max-w-wide flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 lg:px-11 lg:pt-6">
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}
