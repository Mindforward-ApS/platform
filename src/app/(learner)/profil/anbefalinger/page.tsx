import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileShell } from "@/components/profile/profile-shell";
import type { DemoPanelData } from "@/components/profile/demo-panel";
import { RecommendationList, type RecommendationCard } from "@/components/profile/recommendation-list";
import { Badge, ButtonLink, cx, EmptyState } from "@/components/ui/primitives";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { canRunDemo } from "@/server/connectors/demo";
import type { ConnectorPlatformKey } from "@/server/connectors/scoring";
import { platformForUser, recommendationsFor } from "@/server/connectors/service";
import { db } from "@/server/db";

// Step 3: ranked connectors for the learner's industry, systems and AI platform, with "Prøv den".

const PLATFORMS: ConnectorPlatformKey[] = ["CHATGPT", "COPILOT", "CLAUDE"];

async function Content({ searchParams }: { searchParams: Promise<{ platform?: string }> }) {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/profil/anbefalinger");
  const scope = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  const sp = await searchParams;
  const asked = PLATFORMS.find((p) => p === sp.platform?.toUpperCase());
  const platform = asked ?? (await platformForUser(db(), scope)) ?? "CHATGPT";
  const [rec, canDemo] = await Promise.all([recommendationsFor(db(), scope, platform), canRunDemo(db(), scope.organizationId)]);
  if (!rec) redirect("/profil/virksomhed");
  const t = getMessages().profile;
  const platformName = t.platforms[platform];
  const industry = rec.profile.industry?.name ?? "";

  const demoIds = rec.recommended.map((r) => r.demoId).filter((d): d is string => Boolean(d));
  const [demos, systems, checked] = await Promise.all([
    db().connectorDemo.findMany({ where: { id: { in: demoIds } }, select: { id: true, title: true, prompt: true, data: true } }),
    db().system.findMany({ where: { id: { in: rec.profile.selectedSystemIds } }, select: { id: true, name: true } }),
    db().connectorAvailability.aggregate({ where: { platform }, _max: { lastVerifiedAt: true } }),
  ]);
  const systemName = new Map(systems.map((s) => [s.id, s.name]));
  const cards: RecommendationCard[] = rec.recommended.map((r) => {
    const d = demos.find((x) => x.id === r.demoId);
    return {
      id: r.id,
      name: r.name,
      status: r.status === "THIRD_PARTY" ? "THIRD_PARTY" : "OFFICIAL",
      sourceUrl: r.sourceUrl,
      useCase: r.useCase,
      coveredTasks: r.coveredTasks,
      matchedSystems: r.matchedSystemIds.map((id) => systemName.get(id)).filter((n): n is string => Boolean(n)),
      demo: d ? { demoId: d.id, title: d.title, prompt: d.prompt, data: d.data as DemoPanelData["data"] } : null,
    };
  });

  return (
    <ProfileShell step={3}>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex max-w-2xl flex-col gap-3">
          <p className="text-overline text-ink-subtle uppercase">{format(t.results.eyebrow, { industry })}</p>
          <h1 className="text-title-1 text-ink">{t.results.title}</h1>
          <p className="text-body-lg text-ink-muted">{format(t.results.lead, { platform: platformName })}</p>
        </div>
        <nav aria-label={t.results.platformLabel} className="flex flex-col gap-2">
          <span className="text-caption text-ink-subtle">{t.results.platformLabel}</span>
          <div className="inline-flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <Link
                key={p}
                href={`/profil/anbefalinger?platform=${p.toLowerCase()}`}
                aria-current={p === platform ? "page" : undefined}
                className={cx("rounded-full px-5 py-2.5 text-label transition-colors", p === platform ? "bg-tint text-tint-ink" : "text-ink-muted hover:bg-sunken hover:text-ink")}
              >
                {t.platforms[p]}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {cards.length === 0 ? (
        <EmptyState icon="link" title={format(t.results.none, { platform: platformName })} />
      ) : (
        <RecommendationList
          items={cards}
          platform={platform}
          platformName={platformName}
          canDemo={canDemo}
          t={{ official: t.results.official, thirdParty: t.results.thirdParty, covers: t.results.covers, usesYourSystem: t.results.usesYourSystem, source: t.results.source, tryIt: t.results.tryIt, tryLocked: t.results.tryLocked, demo: { ...t.demo, generic: t.demo.errors.generic } }}
        />
      )}

      {rec.unavailable.length > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-dashed border-line-strong/40 p-5 sm:p-6" data-testid="unavailable">
          <h2 className="text-title-3 text-ink">{format(t.results.unavailableTitle, { platform: platformName })}</h2>
          <p className="text-body-sm text-ink-muted">{format(t.results.unavailableLead, { platform: platformName })}</p>
          <ul className="flex flex-wrap gap-2">
            {rec.unavailable.map((u) => (
              <li key={u.id}>
                <Badge>{u.name}</Badge>
              </li>
            ))}
          </ul>
          {checked._max.lastVerifiedAt && <p className="text-caption text-ink-subtle">{format(t.results.checkedOn, { date: formatDateDa(checked._max.lastVerifiedAt) })}</p>}
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href="/hjem" size="lg" trailingIcon="arrowRight">
          {t.results.done}
        </ButtonLink>
        <ButtonLink href="/profil/systemer" variant="ghost" size="lg">
          {t.results.change}
        </ButtonLink>
      </div>
      <p className="max-w-2xl text-caption text-ink-subtle">{t.results.disclaimer}</p>
    </ProfileShell>
  );
}

export default function RecommendationsPage(props: PageProps<"/profil/anbefalinger">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams as Promise<{ platform?: string }>} />
    </Suspense>
  );
}
