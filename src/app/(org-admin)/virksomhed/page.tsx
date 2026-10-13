import { Suspense } from "react";
import { AdminShell, Section } from "@/components/admin/admin-shell";
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
  const t = getMessages().orgAdmin.overview;
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
  const stats: [string, number, string][] = [
    [t.stats.invited, o.invited, "invited"],
    [t.stats.active, o.active, "active"],
    [t.stats.passed, o.withPassed, "passed"],
    [t.stats.certificates, o.certificates, "certificates"],
  ];
  return (
    <>
      <p>{o.organization.name}</p>
      <Section title={t.checklistTitle} testId="onboarding-checklist">
        <ul className="flex flex-col gap-1">
          {checklist.map(([label, done, href]) => (
            <li key={label}>
              <a href={href} className="underline">
                {label}
              </a>{" "}
              — {done ? t.done : t.todo}
            </li>
          ))}
        </ul>
      </Section>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="overview-stats">
        {stats.map(([label, value, key]) => (
          <div key={key} className="rounded-md border border-border p-3">
            <dt className="text-sm">{label}</dt>
            <dd className="text-2xl font-semibold" data-testid={`stat-${key}`}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm">{format(getMessages().orgAdmin.seats.usage, { used: o.active + o.invited, limit: ent.seatLimit })}</p>
      <p className="text-sm">{trialDays !== null ? format(getMessages().orgAdmin.overview.trialDaysLeft, { days: trialDays }) : t.trial}</p>
      <p className="text-sm">{t.learningNote}</p>
    </>
  );
}

export default function OverviewPage() {
  return (
    <AdminShell title={getMessages().orgAdmin.overview.title}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
