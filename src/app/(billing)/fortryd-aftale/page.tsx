import { Suspense } from "react";
import { Card, Field, Notice, PageHeader, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { currentSubscription } from "@/server/billing/entitlements";
import { agreementLabel, isWithdrawalOpen } from "@/server/billing/withdrawal";
import { db } from "@/server/db";
import { submitWithdrawalForm } from "./actions";

/** Logged-in B2C owner with an agreement in the withdrawal period: prefill name, email and agreement. */
async function prefill() {
  const ctx = await getAuthContext();
  if (!ctx?.session.activeOrganizationId) return null;
  const membership = await db().membership.findFirst({
    where: { userId: ctx.user.id, organizationId: ctx.session.activeOrganizationId, role: "OWNER", deactivatedAt: null },
    select: { organization: { select: { id: true, type: true } } },
  });
  if (!membership) return { name: ctx.user.name, email: ctx.user.email, agreement: null };
  const sub = await currentSubscription(db(), membership.organization.id);
  const withdrawn = sub ? (await db().withdrawalRequest.count({ where: { subscriptionId: sub.id } })) > 0 : false;
  const open = sub && isWithdrawalOpen({ orgType: membership.organization.type, status: sub.status, withdrawalDeadlineAt: sub.withdrawalDeadlineAt, alreadyWithdrawn: withdrawn }, new Date());
  return { name: ctx.user.name, email: ctx.user.email, agreement: open && sub ? agreementLabel(sub.planKey, sub.createdAt) : null };
}

async function Form({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().billing.withdrawal;
  const sp = await searchParams;
  const known = await prefill();
  return (
    <>
      {sp.fejl === "invalid" && <Notice tone="error">{t.invalid}</Notice>}
      {sp.fejl === "rate" && <Notice tone="error">{t.rateLimited}</Notice>}
      <form action={submitWithdrawalForm} className="flex flex-col gap-5">
        <Field label={t.name} name="name" required defaultValue={known?.name ?? ""} autoComplete="name" />
        {known?.agreement ? (
          <Select label={t.agreement} name="agreement" defaultValue={known.agreement}>
            <option value={known.agreement}>{known.agreement}</option>
          </Select>
        ) : (
          <Field label={t.agreement} name="agreement" required help={t.agreementHelp} />
        )}
        <Field label={t.email} name="email" type="email" required defaultValue={known?.email ?? ""} autoComplete="email" inputMode="email" />
        <div className="border-t border-line pt-5">
          <SubmitButton className="w-full sm:w-auto">{t.confirm}</SubmitButton>
        </div>
      </form>
    </>
  );
}

export default function WithdrawalPage(props: PageProps<"/fortryd-aftale">) {
  const t = getMessages().billing.withdrawal;
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <PageHeader title={t.title} lead={t.intro} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <Card title={t.formTitle}>
          <Suspense>
            <Form searchParams={props.searchParams as Promise<{ fejl?: string }>} />
          </Suspense>
        </Card>
        <Card title={t.stepsTitle}>
          <ol className="flex flex-col gap-4">
            {t.steps.map((step, i) => (
              <li key={step} className="flex items-start gap-3 text-body-sm text-ink-muted">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line-strong text-caption text-ink tabular-nums">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </main>
  );
}
