import { Suspense } from "react";
import { ChecklistStep } from "@/components/admin/admin-ui";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/ui/icons";
import { Badge, ButtonLink, Card, ProgressBar, Stat, TextLink } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { orgOverview } from "@/server/admin/queries";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { currentSubscription, getEntitlements } from "@/server/billing/entitlements";
import { db } from "@/server/db";

// V2 Overblik: onboarding checklist + key figures for the whole org (no per-person ranking, docs/01 § 7).

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
  const [o, ent, sub] = await Promise.all([orgOverview(db(), orgId, ctx.user.id, now), getEntitlements(db(), orgId, now), currentSubscription(db(), orgId)]);
  const trialDays = sub?.status === "TRIALING" && sub.trialEnd ? Math.max(0, Math.ceil((sub.trialEnd.getTime() - now.getTime()) / 86_400_000)) : null;
  const checklist: [string, boolean, string][] = [
    [t.checklist.dpa, o.organization.dpaAcceptedAt !== null, "/virksomhed/databehandleraftale"],
    [t.checklist.track, o.anyTrackChosen, "/virksomhed/medarbejdere"],
    [t.checklist.invite, o.anyInvitationSent, "/virksomhed/medarbejdere"],
    [t.checklist.tryModule, o.actorTriedModule, "/moduler"],
    [t.checklist.policy, o.organization.aiPolicyUrl !== null, "/virksomhed/rapport"],
  ];
  const doneCount = checklist.filter(([, done]) => done).length;
  const stats: [string, number, string, "mail" | "users" | "check" | "award"][] = [
    [t.stats.invited, o.invited, "invited", "mail"],
    [t.stats.active, o.active, "active", "users"],
    [t.stats.passed, o.withPassed, "passed", "check"],
    [t.stats.certificates, o.certificates, "certificates", "award"],
  ];
  const seatsUsed = o.active + o.invited;
  return (
    <>
      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-10">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex items-center gap-2 text-title-3 text-ink">
              <Icon name="grid" className="text-ink-muted" />
              <span className="truncate">{o.organization.name}</span>
            </p>
            {trialDays !== null ? (
              <Badge tone="hint" icon="clock" className="self-start">
                {format(t.trialDaysLeft, { days: trialDays })}
              </Badge>
            ) : (
              <p className="text-body-sm text-ink-muted">{t.trial}</p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 md:max-w-xs">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-body-sm text-ink">{format(m.seats.usage, { used: seatsUsed, limit: ent.seatLimit })}</p>
              <TextLink href="/virksomhed/abonnement" className="text-body-sm">
                {m.seats.addSeats}
              </TextLink>
            </div>
            <ProgressBar value={seatsUsed} max={ent.seatLimit} label={t.seatsTitle} tone="accent" />
          </div>
        </div>
      </Card>

      <section aria-label={t.figuresTitle} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="overview-stats">
          {stats.map(([label, value, key, icon]) => (
            <Stat
              key={key}
              label={
                <span className="flex min-h-15 items-start gap-2 sm:min-h-10">
                  <Icon name={icon} className="mt-0.5" />
                  {label}
                </span>
              }
              value={<span data-testid={`stat-${key}`}>{value}</span>}
            />
          ))}
        </div>
        <p className="flex items-start gap-2 text-body-sm text-ink-muted">
          <Icon name="info" className="mt-0.5" />
          {t.learningNote}
        </p>
      </section>

      <Card title={t.checklistTitle} description={format(t.checklistProgress, { done: doneCount, total: checklist.length })} padded={false} data-testid="onboarding-checklist">
        <div className="px-6 pt-5 pb-1">
          <ProgressBar value={doneCount} max={checklist.length} tone="success" label={t.checklistTitle} />
        </div>
        <ol className="flex flex-col divide-y divide-line pb-2">
          {checklist.map(([label, done, href], i) => (
            <ChecklistStep key={label} index={i + 1} label={label} done={done} href={href} doneText={t.done} todoText={t.todo} />
          ))}
        </ol>
      </Card>
    </>
  );
}

export default function OverviewPage() {
  const t = getMessages().orgAdmin.overview;
  return (
    <AdminShell
      title={t.title}
      lead={t.lead}
      actions={
        <ButtonLink href="/virksomhed/medarbejdere#inviter" icon="plus">
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
