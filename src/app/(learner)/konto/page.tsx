import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountDataLinks } from "@/components/admin/account-data-links";
import { needsFirstLoginInfo } from "@/server/admin/first-login";
import { TrainingReminders } from "@/components/monthly/training-reminders";
import { Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { signOut, switchOrganization } from "./actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().account;
  const ctx = await guardPage(() => requireUser(), "/konto");
  const sp = await searchParams;
  const memberships = await db().membership.findMany({
    where: { userId: ctx.user.id, deactivatedAt: null, organization: { deletedAt: null } },
    orderBy: { createdAt: "asc" },
    select: { role: true, organization: { select: { id: true, name: true, type: true } } },
  });
  const active = memberships.find((m) => m.organization.id === ctx.session.activeOrganizationId);
  // M7: B2B employees see once what their admin can and cannot see (docs/10 § 1.6).
  if (active && (await needsFirstLoginInfo(db(), ctx.user.id, active.organization.id))) redirect("/konto/data-info");
  const tracks = await db().track.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { key: true, displayName: true } });
  const ts = getMessages().sandbox;

  return (
    <>
      {sp.fejl === "adgang" && <Notice tone="error">{getMessages().business.errors.notAllowed}</Notice>}
      <p>{[ctx.user.name, ctx.user.email].filter(Boolean).join(" · ")}</p>
      {active && (
        <dl className="grid grid-cols-2 gap-2" data-testid="active-org">
          <dt>{t.activeOrg}</dt>
          <dd>
            {active.organization.name} ({t.orgType[active.organization.type]})
          </dd>
          <dt>{t.role}</dt>
          <dd data-testid="active-role">{t.roles[active.role]}</dd>
        </dl>
      )}
      {active && active.role !== "LEARNER" && active.organization.type === "BUSINESS" && (
        <Link className="underline" href="/virksomhed/medarbejdere">
          {t.members}
        </Link>
      )}
      {memberships
        .filter((m) => m.organization.id !== active?.organization.id)
        .map((m) => (
          <form key={m.organization.id} action={switchOrganization}>
            <input type="hidden" name="organizationId" value={m.organization.id} />
            <SubmitButton variant="secondary">
              {t.switchOrg} {m.organization.name}
            </SubmitButton>
          </form>
        ))}
      <a className="underline" href="/moduler">
        {getMessages().player.list.toModules}
      </a>
      <a className="underline" href="/konto/abonnement">
        {getMessages().billing.account.accountLink}
      </a>
      {active && (
        <section className="flex flex-col gap-1" data-testid="sandbox-links">
          <h2 className="font-semibold">{ts.accountHeading}</h2>
          {tracks.length === 0 && <p className="text-muted">{ts.noTracks}</p>}
          {tracks.map((tr) => (
            <a key={tr.key} className="underline" href={`/sandkasse/${tr.key.toLowerCase()}`}>
              {ts.accountLink}: {format(ts.practiceFor, { product: tr.displayName })}
            </a>
          ))}
        </section>
      )}
      <AccountDataLinks user={ctx.user} isBusinessAdmin={Boolean(active && active.role !== "LEARNER" && active.organization.type === "BUSINESS")} />
      <TrainingReminders userId={ctx.user.id} />
      <a className="underline" href="/virksomhed/opret">
        {t.createBusiness}
      </a>
      <form action={signOut}>
        <SubmitButton variant="secondary">
          {getMessages().auth.logout}
        </SubmitButton>
      </form>
    </>
  );
}

export default function AccountPage(props: PageProps<"/konto">) {
  return (
    <Page title={getMessages().account.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
