import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { num } from "@/components/player/kit";
import { ModuleCard } from "@/components/player/module-card";
import { Icon } from "@/components/ui/icons";
import { Illustration } from "@/components/ui/illustration";
import { coverGround } from "@/components/ui/module-cover";
import { Badge, ButtonLink, cx, EmptyState, TextLink } from "@/components/ui/primitives";
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

/** Photo variant (reference: community-app hero): photo banner on top, text below — never on top of the photo. */
function NextModulePhoto({ entry, number, photo }: { entry: CatalogEntry; number: number; photo: string }) {
  const started = entry.status === "IN_PROGRESS";
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
      <div className="relative aspect-[21/8] bg-sunken">
        {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
        <img src={photo} alt="" aria-hidden="true" className="absolute inset-0 size-full object-cover object-[70%_55%]" />
        <span className="absolute top-4 left-4 inline-flex h-7 items-center gap-2 rounded-full bg-on-night/90 px-3 text-caption font-semibold text-night shadow-xs backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-rav" />
          {started ? t.home.continueEyebrow : t.home.startEyebrow}
        </span>
      </div>
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:p-8">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-overline text-accent uppercase">{format(t.list.moduleNumber, { n: number })}</p>
          <h2 className="text-title-1 text-ink">{entry.title}</h2>
          <p className="max-w-xl text-body text-ink-muted">{entry.summary}</p>
          <p className="mt-1 flex flex-wrap items-center gap-4 font-mono text-mono text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" size={14} />
              {format(t.list.minutes, { minutes: num(entry.minutes) })}
            </span>
            {entry.steps > 0 && <span>{format(t.list.steps, { count: num(entry.steps) })}</span>}
            {started && <Badge tone="accent">{t.home.inProgress}</Badge>}
          </p>
        </div>
        <ButtonLink href={`/modul/${entry.slug}`} size="lg" trailingIcon="arrowRight" className="shrink-0 self-start sm:self-end">
          {started ? t.home.continue : t.home.start}
        </ButtonLink>
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

function Ring({ value, max }: { value: number; max: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? value / max : 0;
  return (
    <svg viewBox="0 0 80 80" className="size-24 -rotate-90" aria-hidden="true">
      <circle cx="40" cy="40" r={r} className="stroke-sunken" strokeWidth="8" fill="none" />
      {pct > 0 && <circle cx="40" cy="40" r={r} className="stroke-success" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />}
    </svg>
  );
}

function Progress({ modules, certificates }: { modules: CatalogEntry[]; certificates: number }) {
  const passed = modules.filter((m) => m.status === "PASSED");
  const best = passed.map((m) => m.bestScorePct).filter((v): v is number => v !== null);
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : null;
  const tiles: [string, string][] = [
    [t.home.inProgress, num(modules.filter((m) => m.status === "IN_PROGRESS").length)],
    [t.home.certificates, num(certificates)],
    [t.home.bestAverageShort, avg === null ? t.home.none : `${num(avg)} %`],
  ];
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-title-3 text-ink">{t.home.progressTitle}</h2>
        <TextLink href="/plan" className="text-body-sm">
          {t.home.planLink}
        </TextLink>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative grid place-items-center">
          <Ring value={passed.length} max={modules.length} />
          <span className="absolute text-title-3 text-ink">
            {num(passed.length)}
            <span className="text-body-sm text-ink-subtle">/{num(modules.length)}</span>
          </span>
        </div>
        <p className="text-body-sm text-ink-muted">{format(t.home.passedSentence, { passed: num(passed.length), total: num(modules.length) })}</p>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 rounded-lg bg-sunken px-3 py-2.5">
            <dd className="text-title-3 text-ink">{v}</dd>
            <dt className="text-caption text-ink-muted">{k}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Practice() {
  const s = getMessages().shell;
  const tracks = [
    ["/sandkasse/chatgpt", s.tracks.chatgpt, "bg-cover-mint-ink"],
    ["/sandkasse/copilot", s.tracks.copilot, "bg-cover-sky-ink"],
    ["/sandkasse/claude", s.tracks.claude, "bg-cover-coral-ink"],
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
        {tracks.map(([href, label, dot]) => (
          <li key={href}>
            <Link href={href} className="group flex items-center gap-3 rounded-md px-2 py-2.5 text-label text-ink transition-colors hover:bg-sunken">
              <span className={`size-2 rounded-full ${dot}`} />
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
  const recommended = numbered.filter(({ m }) => m.status !== "PASSED" && m.slug !== next?.m.slug).slice(0, 4);

  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-display text-ink">{firstName ? format(t.home.greeting, { name: firstName }) : t.home.greetingNoName}</h1>
        <p className="text-body-lg text-ink-muted">{t.home.lead}</p>
      </header>
      {visible.length === 0 ? (
        <EmptyState icon="book" title={t.home.emptyTitle}>
          {t.home.emptyBody}
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-w-0 flex-col gap-10">
            {next ? (
              <NextModule entry={next.m} number={next.n} />
            ) : (
              <EmptyState icon="award" title={t.home.allPassedTitle}>
                {t.home.allPassedBody}
              </EmptyState>
            )}
            {recommended.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="text-title-2 text-ink">{t.home.recommended}</h2>
                  <TextLink href="/moduler" className="text-body-sm">
                    {t.home.seeAll}
                  </TextLink>
                </div>
                <ul className="grid gap-4 sm:grid-cols-2">
                  {recommended.map(({ m, n }) => (
                    <ModuleCard key={m.slug} entry={m} number={n} />
                  ))}
                </ul>
              </section>
            )}
          </div>
          <aside className="flex flex-col gap-6">
            <Progress modules={visible} certificates={certs.length} />
            <Practice />
          </aside>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-8 px-4 pt-8 pb-20 sm:px-8 md:pt-12">
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}
