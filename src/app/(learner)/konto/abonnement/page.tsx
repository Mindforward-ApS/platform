import { Suspense, type ReactNode } from "react";
import { SupportLauncher } from "@/components/support/support-widget";
import { Badge, ButtonLink, Card, DescriptionList, Notice, Page, type Tone } from "@/components/ui/primitives";
import type { IconName } from "@/components/ui/icons";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { subscriptionView } from "@/server/billing/view";
import { db } from "@/server/db";
import { openPortal, resume } from "./actions";

type Search = { tak?: string; opsagt?: string; genoptaget?: string; fejl?: string };

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  const m = getMessages();
  const t = m.billing;
  const a = m.account.subscription;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/konto/abonnement");
  const sp = await searchParams;
  const v = await subscriptionView(db(), ctx.membership.organizationId);

  if (v.org.type === "BUSINESS") {
    return (
      <Card
        title={a.businessTitle}
        footer={
          ctx.membership.role !== "LEARNER" && (
            <ButtonLink href="/virksomhed/abonnement" variant="secondary" trailingIcon="arrowRight">
              {t.account.goBusiness}
            </ButtonLink>
          )
        }
      >
        <Notice>{t.account.businessManaged}</Notice>
      </Card>
    );
  }
  const isOwner = ctx.membership.role === "OWNER";
  const canceled = Boolean(v.sub?.cancelAtPeriodEnd);
  // Status is always shown as a word; tone and icon only reinforce it.
  const statusLook: { tone: Tone; icon: IconName } =
    v.entitlements.banner === "PAST_DUE"
      ? { tone: "danger", icon: "alert" }
      : v.live && canceled
        ? { tone: "hint", icon: "clock" }
        : v.live
          ? { tone: "success", icon: "check" }
          : { tone: "neutral", icon: "dash" };

  return (
    <>
      {sp.tak && (v.live ? <Notice tone="success">{t.account.confirmed}</Notice> : <Notice>{t.account.pending}</Notice>)}
      {sp.genoptaget && <Notice tone="success">{t.account.resumed}</Notice>}
      {sp.fejl === "opsig" && <Notice tone="error">{a.errorCancel}</Notice>}
      {sp.fejl === "genoptag" && <Notice tone="error">{a.errorResume}</Notice>}
      {v.withdrawn && <Notice>{t.account.withdrawn}</Notice>}
      {v.entitlements.banner === "PAST_DUE" && <Notice tone="error">{t.account.pastDue}</Notice>}

      <Card
        title={a.planTitle}
        description={a.planDescription}
        footer={
          isOwner && (v.sub || !v.live) ? (
            <>
              {v.sub && (
                <form action={openPortal}>
                  <SubmitButton variant="secondary">{t.account.portal}</SubmitButton>
                </form>
              )}
              {!v.live && (
                <ButtonLink href="/koeb" trailingIcon="arrowRight">
                  {t.account.buyLink}
                </ButtonLink>
              )}
            </>
          ) : undefined
        }
      >
        <div data-testid="subscription-summary">
          <DescriptionList
            items={[
              [
                t.account.plan,
                <span key="plan" className="font-medium" data-testid="plan-name">
                  {v.live ? v.planName : t.planNames.FREE}
                </span>,
              ],
              [
                t.account.status,
                <span key="status" data-testid="subscription-status">
                  <Badge tone={statusLook.tone} icon={statusLook.icon}>
                    {v.statusName}
                  </Badge>
                </span>,
              ],
              ...(v.live && v.endDate
                ? ([
                    [
                      canceled ? t.account.endsOn : t.account.renewsOn,
                      <span key="end" data-testid="period-end">
                        {v.endDate}
                      </span>,
                    ],
                  ] as [string, ReactNode][])
                : []),
            ]}
          />
        </div>
        {!v.live && <p className="border-t border-line pt-4 text-body-sm text-ink-muted">{format(t.account.freeInfo, { count: v.entitlements.freeModuleLimit ?? 0 })}</p>}
      </Card>

      {v.withdrawalOpen && isOwner && (
        <Card
          title={a.withdrawTitle}
          description={a.withdrawDescription}
          footer={
            <ButtonLink href="/fortryd-aftale" variant="secondary" data-testid="withdraw-button">
              {t.account.withdraw}
            </ButtonLink>
          }
        >
          {v.withdrawalDeadline && <p className="text-body text-ink">{format(t.account.withdrawInfo, { date: v.withdrawalDeadline })}</p>}
        </Card>
      )}

      {isOwner && v.canCancel && (
        <Card
          title={a.cancelTitle}
          description={a.cancelDescription}
          footer={
            <ButtonLink href="/konto/abonnement/opsig" variant="danger">
              {t.account.cancel}
            </ButtonLink>
          }
        />
      )}

      {isOwner && v.canResume && (
        <Card
          title={a.canceledTitle}
          footer={
            <form action={resume}>
              <SubmitButton>{t.account.resume}</SubmitButton>
            </form>
          }
        >
          {v.endDate && <Notice tone="hint" icon="clock">{format(t.account.canceledNotice, { date: v.endDate })}</Notice>}
        </Card>
      )}
    </>
  );
}

export default function SubscriptionPage(props: PageProps<"/konto/abonnement">) {
  const m = getMessages();
  return (
    <Page title={m.billing.account.title} lead={m.account.subscription.lead}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
      <SupportLauncher t={m.support.widget} />
    </Page>
  );
}
