import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { num } from "@/components/player/kit";
import { ModuleCard } from "@/components/player/module-card";
import { Icon } from "@/components/ui/icons";
import { ModuleCover } from "@/components/ui/module-cover";
import { Badge, ButtonLink, EmptyState, ProgressBar, TextLink } from "@/components/ui/primitives";
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

function NextModule({ entry, number }: { entry: CatalogEntry; number: number }) {
  const started = entry.status === "IN_PROGRESS";
  return (
    <section className="grid overflow-hidden rounded-xl border border-line bg-surface md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 p-6 sm:p-8">
        <p className="flex items-center gap-2 text-overline text-accent uppercase">
          <span className="size-1.5 rounded-full bg-rav" />
          {started ? t.home.continueEyebrow : t.home.startEyebrow}
        </p>
        <div className="flex flex-col gap-2">
          <h2 className="text-title-2 text-ink">{entry.title}</h2>
          <p className="text-body text-ink-muted">{entry.summary}</p>
        </div>
        <p className="flex flex-wrap items-center gap-4 font-mono text-mono text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="clock" size={14} />
            {format(t.list.minutes, { minutes: num(entry.minutes) })}
          </span>
          {entry.steps > 0 && <span>{format(t.list.steps, { count: num(entry.steps) })}</span>}
          {started && <Badge tone="accent">{t.home.inProgress}</Badge>}
        </p>
        <div className="mt-auto pt-2">
          <ButtonLink href={`/modul/${entry.slug}`} size="lg" trailingIcon="arrowRight">
            {started ? t.home.continue : t.home.start}
          </ButtonLink>
        </div>
      </div>
      <ModuleCover seed={entry.slug} label={String(number).padStart(2, "0")} size="lg" className="order-first h-full min-h-44 md:order-none md:aspect-auto" />
    </section>
  );
}

function Progress({ modules, certificates }: { modules: CatalogEntry[]; certificates: number }) {
  const passed = modules.filter((m) => m.status === "PASSED");
  const best = passed.map((m) => m.bestScorePct).filter((v): v is number => v !== null);
  const avg = best.length ? Math.round(best.reduce((a, b) => a + b, 0) / best.length) : null;
  const rows: [string, string][] = [
    [t.home.inProgress, num(modules.filter((m) => m.status === "IN_PROGRESS").length)],
    [t.home.certificates, num(certificates)],
    [t.home.bestAverage, avg === null ? t.home.none : `${num(avg)} %`],
  ];
  return (
    <section className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6">
      <h2 className="text-title-3 text-ink">{t.home.progressTitle}</h2>
      <div className="flex flex-col gap-3">
        <p className="flex items-baseline gap-2">
          <span className="text-title-1 text-ink">{format(t.home.passedOf, { passed: num(passed.length), total: num(modules.length) })}</span>
          <span className="text-body-sm text-ink-muted">{t.home.passedLabel}</span>
        </p>
        <ProgressBar value={passed.length} max={modules.length} tone="success" label={t.home.passedLabel} />
      </div>
      <dl className="flex flex-col divide-y divide-line border-t border-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2.5 text-body-sm">
            <dt className="text-ink-muted">{k}</dt>
            <dd className="font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <TextLink href="/plan" className="text-body-sm">
        {t.home.planLink}
      </TextLink>
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
    <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
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
        <h1 className="text-title-1 text-ink">{firstName ? format(t.home.greeting, { name: firstName }) : t.home.greetingNoName}</h1>
        <p className="text-body-lg text-ink-muted">{t.home.lead}</p>
      </header>
      {visible.length === 0 ? (
        <EmptyState icon="route" title={t.home.emptyTitle}>
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
