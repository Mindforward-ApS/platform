import { Suspense } from "react";
import { SubscriptionSummary } from "@/components/billing/subscription-summary";
import { Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { subscriptionView } from "@/server/billing/view";
import { db } from "@/server/db";
import { openPortal, resume } from "./actions";

type Search = { tak?: string; opsagt?: string; genoptaget?: string; fejl?: string };

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  const t = getMessages().billing;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/konto/abonnement");
  const sp = await searchParams;
  const v = await subscriptionView(db(), ctx.membership.organizationId);

  if (v.org.type === "BUSINESS") {
    return (
      <>
        <Notice>{t.account.businessManaged}</Notice>
        {ctx.membership.role !== "LEARNER" && (
          <a className="underline" href="/virksomhed/abonnement">
            {t.account.goBusiness}
          </a>
        )}
      </>
    );
  }
  const isOwner = ctx.membership.role === "OWNER";

  return (
    <>
      {v.withdrawalOpen && isOwner && (
        <section className="flex flex-col gap-1">
          <a className="self-start rounded-md border border-border px-4 py-2" href="/fortryd-aftale" data-testid="withdraw-button">
            {t.account.withdraw}
          </a>
          {v.withdrawalDeadline && <p className="text-sm">{format(t.account.withdrawInfo, { date: v.withdrawalDeadline })}</p>}
        </section>
      )}
      {sp.tak && (v.live ? <Notice>{t.account.confirmed}</Notice> : <Notice>{t.account.pending}</Notice>)}
      {sp.genoptaget && <Notice>{t.account.resumed}</Notice>}
      {v.withdrawn && <Notice>{t.account.withdrawn}</Notice>}
      {v.entitlements.banner === "PAST_DUE" && <Notice tone="error">{t.account.pastDue}</Notice>}

      <SubscriptionSummary
        rows={[
          { label: t.account.plan, value: v.live ? v.planName : t.planNames.FREE, testId: "plan-name" },
          { label: t.account.status, value: v.statusName, testId: "subscription-status" },
          ...(v.live && v.endDate ? [{ label: v.sub?.cancelAtPeriodEnd ? t.account.endsOn : t.account.renewsOn, value: v.endDate, testId: "period-end" }] : []),
        ]}
      />

      {!v.live && (
        <>
          <p>{format(t.account.freeInfo, { count: v.entitlements.freeModuleLimit ?? 0 })}</p>
          {isOwner && (
            <a className="self-start rounded-md border border-border px-4 py-2" href="/koeb">
              {t.account.buyLink}
            </a>
          )}
        </>
      )}

      {isOwner && v.canCancel && (
        <a className="self-start underline" href="/konto/abonnement/opsig">
          {t.account.cancel}
        </a>
      )}
      {isOwner && v.canResume && (
        <>
          {v.endDate && <p>{format(t.account.canceledNotice, { date: v.endDate })}</p>}
          <form action={resume}>
            <SubmitButton variant="secondary">{t.account.resume}</SubmitButton>
          </form>
        </>
      )}
      {isOwner && v.org && v.sub && (
        <form action={openPortal}>
          <SubmitButton variant="secondary">{t.account.portal}</SubmitButton>
        </form>
      )}
    </>
  );
}

export default function SubscriptionPage(props: PageProps<"/konto/abonnement">) {
  return (
    <Page title={getMessages().billing.account.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </Page>
  );
}
