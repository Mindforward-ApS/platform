import Link from "next/link";
import { Suspense } from "react";
import { ChecklistStep } from "@/components/admin/admin-ui";
import { AdminShell } from "@/components/admin/admin-shell";
import { Avatar, HeroCard, HeroMeta, HeroTitle, KpiRow, Panel, RoleTag } from "@/components/ui/cards";
import { Icon } from "@/components/ui/icons";
import { ButtonLink, ProgressBar, TextLink } from "@/components/ui/primitives";
import { WeekChart, type WeekBar } from "@/components/ui/week-chart";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { orgOverview, orgPassedPerWeek, orgResponsibles } from "@/server/admin/queries";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { currentSubscription, getEntitlements } from "@/server/billing/entitlements";
import { db } from "@/server/db";

// Overblik, design v3: company hero with seats, key figures, onboarding checklist, passed modules per week (real
// aggregates) and the responsible owners/admins. No per-person ranking or scores (docs/01 § 7).

async function Content() {
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, "/virksomhed");
  const m = getMessages().orgAdmin;
  const t = m.overview;
  const orgId = ctx.membership.organizationId;
  const now = new Date();
  const [o, ent, sub, weekly, people] = await Promise.all([
    orgOverview(db(), orgId, ctx.user.id, now),
    getEntitlements(db(), orgId, now),
    currentSubscription(db(), orgId),
    orgPassedPerWeek(db(), orgId, now, 12),
    orgResponsibles(db(), orgId),
  ]);
  const trialDays = sub?.status === "TRIALING" && sub.trialEnd ? Math.max(0, Math.ceil((sub.trialEnd.getTime() - now.getTime()) / 86_400_000)) : null;
  const checklist: [string, boolean, string][] = [
    [t.checklist.dpa, o.organization.dpaAcceptedAt !== null, "/virksomhed/databehandleraftale"],
    [t.checklist.track, o.anyTrackChosen, "/virksomhed/medarbejdere"],
    [t.checklist.invite, o.anyInvitationSent, "/virksomhed/medarbejdere"],
    [t.checklist.tryModule, o.actorTriedModule, "/moduler"],
    [t.checklist.policy, o.organization.aiPolicyUrl !== null, "/virksomhed/rapport"],
  ];
  const doneCount = checklist.filter(([, done]) => done).length;
  const stats: [string, number, string][] = [
    [t.stats.invited, o.invited, "invited"],
    [t.stats.active, o.active, "active"],
    [t.stats.passed, o.withPassed, "passed"],
    [t.stats.certificates, o.certificates, "certificates"],
  ];
  const seatsUsed = o.active + o.invited;
  const ch = t.chart;
  const bars: WeekBar[] = weekly.weeks.map((w) => ({
    key: `${w.year}-${w.week}`,
    label: format(ch.week, { week: w.week }),
    longLabel: format(ch.weekLong, { week: w.week, year: w.year }),
    value: w.passed,
    details: w.avgScorePct === null ? [] : [[ch.avgScore, `${w.avgScorePct} %`]],
  }));
  const weekCount = weekly.weeks.length;
  return (
    <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-7">
        <HeroCard
          aside={
            <div className="flex flex-col justify-end gap-2.5 md:w-[17rem]">
              <p className="flex items-baseline justify-between gap-4 text-body-sm text-on-hero">
                <span>{format(m.seats.usage, { used: seatsUsed, limit: ent.seatLimit })}</span>
                <Link href="/virksomhed/abonnement" className="font-medium text-on-hero underline decoration-hero-chip-line underline-offset-[3px] hover:decoration-on-hero">
                  {m.seats.addSeats}
                </Link>
              </p>
              <span role="progressbar" aria-label={t.seatsTitle} aria-valuemin={0} aria-valuemax={ent.seatLimit} aria-valuenow={seatsUsed} className="h-2 overflow-hidden rounded-full bg-hero-pill ring-1 ring-hero-pill-line">
                <span className="block h-full rounded-full bg-on-hero" style={{ width: `${Math.min(100, (seatsUsed / Math.max(1, ent.seatLimit)) * 100)}%` }} />
              </span>
            </div>
          }
        >
          <HeroTitle as="h2">{o.organization.name}</HeroTitle>
          <p className="max-w-md text-body-sm text-on-hero">{trialDays !== null ? format(t.trialDaysLeft, { days: trialDays }) : t.trial}</p>
          <HeroMeta
            items={[{ icon: "check", text: format(t.checklistProgress, { done: doneCount, total: checklist.length }) }]}
          />
        </HeroCard>

        <section aria-label={t.figuresTitle} className="flex flex-col gap-3">
          <Panel>
            <KpiRow
              divided={false}
              data-testid="overview-stats"
              items={stats.map(([label, value, key]) => ({ label, value: String(value), testId: `stat-${key}` }))}
            />
          </Panel>
          <p className="flex items-start gap-2 text-body-sm text-ink-muted">
            <Icon name="info" className="mt-0.5" />
            {t.learningNote}
          </p>
        </section>

        <Panel title={t.checklistTitle} data-testid="onboarding-checklist">
          <p className="-mt-2 text-body-sm text-ink-muted">{format(t.checklistProgress, { done: doneCount, total: checklist.length })}</p>
          <ProgressBar value={doneCount} max={checklist.length} tone="success" label={t.checklistTitle} />
          <ol className="-mx-6 -mb-6 flex flex-col divide-y divide-line border-t border-line sm:-mx-7 sm:-mb-6.5 [&_a]:sm:px-7">
            {checklist.map(([label, done, href], i) => (
              <ChecklistStep key={label} index={i + 1} label={label} done={done} href={href} doneText={t.done} todoText={t.todo} />
            ))}
          </ol>
        </Panel>
      </div>

      <aside className="flex flex-col gap-6">
        <Panel title={ch.title} data-testid="overview-chart">
          {weekly.passedInWindow === 0 && <p className="text-body-sm text-ink-muted">{format(ch.empty, { weeks: weekCount })}</p>}
          <WeekChart bars={bars} summary={format(ch.summary, { weeks: weekCount, total: weekly.passedInWindow })} valueLabel={ch.passed} weekLabel={ch.weekCol} />
          <KpiRow
            bleed
            items={[
              { value: weekly.avgBestScorePct === null ? m.members.none : `${weekly.avgBestScorePct} %`, label: ch.kpiAvgScore },
              { value: `${seatsUsed} / ${ent.seatLimit}`, label: ch.kpiSeats },
              { value: String(weekly.passedInWindow), label: format(ch.kpiPassed, { weeks: weekCount }) },
            ]}
          />
        </Panel>

        <Panel
          title={t.responsiblesTitle}
          actions={
            <TextLink href="/virksomhed/medarbejdere" className="text-body-sm">
              {t.allMembers}
            </TextLink>
          }
        >
          <ul className="flex flex-col gap-4">
            {people.map((p) => (
              <li key={p.memberId} className="flex items-center gap-3.5">
                <Avatar name={p.name} email={p.email} size="lg" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
                    <span className="truncate">{p.name || p.email}</span>
                    <RoleTag role={p.role}>{m.roles[p.role]}</RoleTag>
                  </span>
                  <span className="truncate text-body-sm text-ink-muted">{p.jobRole ? m.jobRoles[p.jobRole] : p.email}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </aside>
    </div>
  );
}

export default function OverviewPage() {
  const t = getMessages().orgAdmin.overview;
  return (
    <AdminShell
      title={t.title}
      lead={t.lead}
      actions={
        <ButtonLink href="/virksomhed/medarbejdere#inviter" icon="plus" className="rounded-full">
          {t.inviteCta}
        </ButtonLink>
      }
    >
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
