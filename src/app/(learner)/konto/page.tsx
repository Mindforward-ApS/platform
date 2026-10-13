import { Suspense } from "react";
import { Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
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
        <a className="underline" href="/virksomhed/medarbejdere">
          {t.members}
        </a>
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
