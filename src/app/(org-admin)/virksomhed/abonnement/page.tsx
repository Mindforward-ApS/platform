import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SubscriptionSummary } from "@/components/billing/subscription-summary";
import { Field, Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { billingRules, describePrice, loadDisplayPlan } from "@/server/billing/plans";
import { seatUsage } from "@/server/billing/seats";
import { formatDate } from "@/server/billing/time";
import { subscriptionView } from "@/server/billing/view";
import { db } from "@/server/db";
import { openPortal, resume } from "../../../(learner)/konto/abonnement/actions";
import { buyB2B, startTrial, updateSeats } from "./actions";

type Search = { fejl?: string; proeve?: string; pladser?: string; opsagt?: string; genoptaget?: string; tak?: string };

const ERRORS = {
  INVALID_CVR: "cvr",
  TRIAL_USED: "trialUsed",
  MIN_SEATS: "minSeats",
  BELOW_USED: "belowUsed",
  ALREADY_SUBSCRIBED: "hasSubscription",
} as const;

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  const t = getMessages().billing;
  const b = t.business;
  const ctx = await guardPage(() => requireActiveMembership(ADMIN_ROLES), "/virksomhed/abonnement");
  const orgId = ctx.membership.organizationId;
  const sp = await searchParams;
  const v = await subscriptionView(db(), orgId);
  if (v.org.type !== "BUSINESS") redirect("/konto/abonnement");
  const isOwner = ctx.membership.role === "OWNER";
  const used = await seatUsage(db(), orgId);
  const [monthly, annual] = await Promise.all([loadDisplayPlan(db(), "B2B_MONTHLY"), loadDisplayPlan(db(), "B2B_ANNUAL")]);
  const errorKey = sp.fejl && sp.fejl in ERRORS ? ERRORS[sp.fejl as keyof typeof ERRORS] : undefined;
  const status = v.sub?.status ?? null;
  const trialing = v.live && status === "TRIALING";
  const active = v.live && status !== "TRIALING";
  const minSeats = Math.max(billingRules.b2bMinSeats, monthly.minSeats);

  const buyForm = (
    <form action={buyB2B} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm">{b.planLabel}</span>
        <select name="planKey" defaultValue="B2B_MONTHLY" className="rounded-md border border-border bg-bg px-3 py-2">
          <option value="B2B_MONTHLY">{`${t.planNames.B2B_MONTHLY}: ${describePrice(monthly).headline}`}</option>
          <option value="B2B_ANNUAL">{`${t.planNames.B2B_ANNUAL}: ${describePrice(annual).headline}`}</option>
        </select>
      </label>
      <Field label={format(b.seatsLabel, { min: minSeats })} name="seats" type="number" min={Math.max(minSeats, used)} max={500} defaultValue={Math.max(minSeats, used)} required />
      <p className="text-sm">{b.renewLine}</p>
      <p>
        <strong>{describePrice(monthly).headline}</strong>
      </p>
      <SubmitButton>{b.buy}</SubmitButton>
    </form>
  );

  return (
    <>
      {errorKey && <Notice tone="error">{format(b.errors[errorKey], { min: minSeats, used })}</Notice>}
      {sp.fejl && !errorKey && <Notice tone="error">{b.errors.generic}</Notice>}
      {sp.proeve && <Notice>{b.trialStarted}</Notice>}
      {sp.pladser && <Notice>{b.seatsChanged}</Notice>}
      {sp.genoptaget && <Notice>{t.account.resumed}</Notice>}
      {v.entitlements.readOnly && <Notice tone="error">{b.readOnly}</Notice>}
      {!isOwner && <Notice>{b.ownerOnly}</Notice>}

      <SubscriptionSummary
        rows={[
          { label: t.account.plan, value: v.sub ? v.planName : b.noSubscription },
          { label: t.account.status, value: v.statusName, testId: "subscription-status" },
          { label: t.account.seats, value: format(t.account.seatsUsed, { used, limit: v.entitlements.seatLimit }), testId: "seats" },
          ...(v.live && v.endDate ? [{ label: trialing ? t.account.trialEnds : v.sub?.cancelAtPeriodEnd ? t.account.endsOn : t.account.renewsOn, value: v.endDate }] : []),
        ]}
      />

      {isOwner && !v.sub && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{format(b.trialTitle, { days: billingRules.b2bTrialDays })}</h2>
          <p>
            {format(b.trialBody, {
              users: billingRules.b2bTrialMaxUsers,
              price: describePrice(monthly).headline,
              interval: t.intervalPaid.MONTH,
            })}
          </p>
          <form action={startTrial} className="flex flex-col gap-3">
            <Field label={b.cvr} name="cvr" inputMode="numeric" pattern="\d{8}" required />
            <SubmitButton>{b.startTrial}</SubmitButton>
          </form>
        </section>
      )}

      {isOwner && trialing && v.sub?.trialEnd && (
        <section className="flex flex-col gap-3">
          <p>{format(b.trialActive, { date: formatDate(v.sub.trialEnd), price: describePrice(monthly).headline, interval: t.intervalPaid.MONTH })}</p>
          <h2 className="font-semibold">{b.convertTitle}</h2>
          {buyForm}
        </section>
      )}

      {isOwner && !v.live && v.sub && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{b.buyTitle}</h2>
          {buyForm}
        </section>
      )}
      {isOwner && !v.sub && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">{b.buyTitle}</h2>
          {buyForm}
        </section>
      )}

      {isOwner && active && (
        <form action={updateSeats} className="flex flex-col gap-3">
          <h2 className="font-semibold">{b.seatsTitle}</h2>
          <Field label={format(b.seatsLabel, { min: minSeats })} name="seats" type="number" min={Math.max(minSeats, used)} max={500} defaultValue={v.sub?.quantity ?? minSeats} required />
          <SubmitButton variant="secondary">{b.changeSeats}</SubmitButton>
        </form>
      )}

      {isOwner && v.canCancel && (
        <a className="self-start underline" href="/virksomhed/abonnement/opsig">
          {t.account.cancel}
        </a>
      )}
      {isOwner && v.canResume && (
        <>
          {v.endDate && <p>{format(t.account.canceledNotice, { date: v.endDate })}</p>}
          <form action={resume}>
            <input type="hidden" name="from" value="virksomhed" />
            <SubmitButton variant="secondary">{t.account.resume}</SubmitButton>
          </form>
        </>
      )}
      {isOwner && active && (
        <form action={openPortal}>
          <input type="hidden" name="from" value="virksomhed" />
          <SubmitButton variant="secondary">{t.account.portal}</SubmitButton>
        </form>
      )}
    </>
  );
}

export default function BusinessSubscriptionPage(props: PageProps<"/virksomhed/abonnement">) {
  return (
    <Page title={getMessages().billing.business.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </Page>
  );
}
