import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { AdminSubmit } from "@/components/admin/danger-submit";
import { SubscriptionSummary } from "@/components/billing/subscription-summary";
import { ButtonLink, Field, Notice, Select } from "@/components/ui/primitives";
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
  const s = getMessages().orgAdmin.subscription;
  const ctx = await guardPage(() => requireActiveMembership(ADMIN_ROLES), "/virksomhed/abonnement");
  const orgId = ctx.membership.organizationId;
  const sp = await searchParams;
  const v = await subscriptionView(db(), orgId);
  if (v.org.type !== "BUSINESS") redirect("/konto/abonnement");
  // OWNER and ADMIN both manage billing (Marco 2026-11-11).
  const isOwner = ctx.membership.role === "OWNER" || ctx.membership.role === "ADMIN";
  const used = await seatUsage(db(), orgId);
  const [monthly, annual] = await Promise.all([loadDisplayPlan(db(), "B2B_MONTHLY"), loadDisplayPlan(db(), "B2B_ANNUAL")]);
  const errorKey = sp.fejl && sp.fejl in ERRORS ? ERRORS[sp.fejl as keyof typeof ERRORS] : undefined;
  const status = v.sub?.status ?? null;
  const trialing = v.live && status === "TRIALING";
  const active = v.live && status !== "TRIALING";
  const minSeats = Math.max(billingRules.b2bMinSeats, monthly.minSeats);
  const trialOffered = isOwner && !v.sub;

  // The trial is the main action when it is on offer; buying is then the secondary choice.
  const buyForm = (primary: boolean) => (
    <form action={buyB2B} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={b.planLabel} name="planKey" defaultValue="B2B_MONTHLY">
          <option value="B2B_MONTHLY">{`${t.planNames.B2B_MONTHLY}: ${describePrice(monthly).headline}`}</option>
          <option value="B2B_ANNUAL">{`${t.planNames.B2B_ANNUAL}: ${describePrice(annual).headline}`}</option>
        </Select>
        <Field label={format(b.seatsLabel, { min: minSeats })} name="seats" type="number" min={Math.max(minSeats, used)} max={500} defaultValue={Math.max(minSeats, used)} required className="tabular-nums" />
      </div>
      <div className="flex flex-col gap-1 rounded-md border border-line bg-sunken px-4 py-3">
        <p className="text-title-3 text-ink">{describePrice(monthly).headline}</p>
        <p className="text-body-sm text-ink-muted">{b.renewLine}</p>
      </div>
      <div>{primary ? <SubmitButton>{b.buy}</SubmitButton> : <SubmitButton variant="secondary">{b.buy}</SubmitButton>}</div>
    </form>
  );

  const hasManage = isOwner && (v.canCancel || v.canResume || active);

  return (
    <>
      {errorKey && <Notice tone="error">{format(b.errors[errorKey], { min: minSeats, used })}</Notice>}
      {sp.fejl && !errorKey && <Notice tone="error">{b.errors.generic}</Notice>}
      {sp.proeve && <Notice tone="success">{b.trialStarted}</Notice>}
      {sp.pladser && <Notice tone="success">{b.seatsChanged}</Notice>}
      {sp.genoptaget && <Notice tone="success">{t.account.resumed}</Notice>}
      {v.entitlements.readOnly && <Notice tone="error">{b.readOnly}</Notice>}
      {!isOwner && (
        <Notice tone="info" icon="lock">
          {b.ownerOnly}
        </Notice>
      )}

      <Section title={s.summaryTitle}>
        <div className="text-body [&_dd]:text-ink [&_dl]:grid-cols-[minmax(0,10rem)_minmax(0,1fr)] [&_dl]:gap-x-6 [&_dl]:gap-y-3 [&_dt]:text-ink-muted">
          <SubscriptionSummary
          rows={[
            { label: t.account.plan, value: v.sub ? v.planName : b.noSubscription },
            { label: t.account.status, value: v.statusName, testId: "subscription-status" },
            { label: t.account.seats, value: format(t.account.seatsUsed, { used, limit: v.entitlements.seatLimit }), testId: "seats" },
            ...(v.live && v.endDate ? [{ label: trialing ? t.account.trialEnds : v.sub?.cancelAtPeriodEnd ? t.account.endsOn : t.account.renewsOn, value: v.endDate }] : []),
          ]}
          />
        </div>
      </Section>

      {trialOffered && (
        <Section
          title={format(b.trialTitle, { days: billingRules.b2bTrialDays })}
          description={format(b.trialBody, {
            users: billingRules.b2bTrialMaxUsers,
            price: describePrice(monthly).headline,
            interval: t.intervalPaid.MONTH,
          })}
        >
          <form action={startTrial} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-64">
              <Field label={b.cvr} name="cvr" inputMode="numeric" pattern="\d{8}" required className="tabular-nums" />
            </div>
            <SubmitButton>{b.startTrial}</SubmitButton>
          </form>
        </Section>
      )}

      {isOwner && trialing && v.sub?.trialEnd && (
        <Section title={b.convertTitle} description={format(b.trialActive, { date: formatDate(v.sub.trialEnd), price: describePrice(monthly).headline, interval: t.intervalPaid.MONTH })}>
          {buyForm(true)}
        </Section>
      )}

      {isOwner && !v.live && v.sub && <Section title={b.buyTitle}>{buyForm(true)}</Section>}
      {trialOffered && <Section title={b.buyTitle}>{buyForm(false)}</Section>}

      {isOwner && active && (
        <Section title={b.seatsTitle}>
          <form action={updateSeats} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-64">
              <Field label={format(b.seatsLabel, { min: minSeats })} name="seats" type="number" min={Math.max(minSeats, used)} max={500} defaultValue={v.sub?.quantity ?? minSeats} required className="tabular-nums" />
            </div>
            <SubmitButton variant="secondary">{b.changeSeats}</SubmitButton>
          </form>
        </Section>
      )}

      {hasManage && (
        <Section title={s.manageTitle}>
          {v.canResume && v.endDate && <Notice tone="hint">{format(t.account.canceledNotice, { date: v.endDate })}</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            {active && (
              <form action={openPortal}>
                <input type="hidden" name="from" value="virksomhed" />
                <AdminSubmit variant="secondary" icon="card">
                  {t.account.portal}
                </AdminSubmit>
              </form>
            )}
            {v.canResume && (
              <form action={resume}>
                <input type="hidden" name="from" value="virksomhed" />
                <SubmitButton variant="secondary">{t.account.resume}</SubmitButton>
              </form>
            )}
            {v.canCancel && (
              <ButtonLink href="/virksomhed/abonnement/opsig" variant="danger">
                {t.account.cancel}
              </ButtonLink>
            )}
          </div>
        </Section>
      )}
    </>
  );
}

export default function BusinessSubscriptionPage(props: PageProps<"/virksomhed/abonnement">) {
  return (
    <AdminShell title={getMessages().billing.business.title} lead={getMessages().orgAdmin.subscription.lead}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<Search>} />
      </Suspense>
    </AdminShell>
  );
}
