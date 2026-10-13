import { Suspense } from "react";
import { Field, Notice, Page } from "@/components/ui/primitives";
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

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().billing.withdrawal;
  const sp = await searchParams;
  const known = await prefill();
  return (
    <>
      <p>{t.intro}</p>
      {sp.fejl === "invalid" && <Notice tone="error">{t.invalid}</Notice>}
      {sp.fejl === "rate" && <Notice tone="error">{t.rateLimited}</Notice>}
      <form action={submitWithdrawalForm} className="flex flex-col gap-3">
        <Field label={t.name} name="name" required defaultValue={known?.name ?? ""} autoComplete="name" />
        {known?.agreement ? (
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t.agreement}</span>
            <select name="agreement" defaultValue={known.agreement} className="rounded-md border border-border bg-bg px-3 py-2">
              <option value={known.agreement}>{known.agreement}</option>
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t.agreement}</span>
            <input name="agreement" required className="rounded-md border border-border bg-bg px-3 py-2" />
            <span className="text-sm text-muted">{t.agreementHelp}</span>
          </label>
        )}
        <Field label={t.email} name="email" type="email" required defaultValue={known?.email ?? ""} autoComplete="email" />
        <SubmitButton>{t.confirm}</SubmitButton>
      </form>
    </>
  );
}

export default function WithdrawalPage(props: PageProps<"/fortryd-aftale">) {
  return (
    <Page title={getMessages().billing.withdrawal.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
