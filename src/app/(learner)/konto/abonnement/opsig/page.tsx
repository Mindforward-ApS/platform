import { Suspense } from "react";
import { ButtonLink, Card, DescriptionList, Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { subscriptionView } from "@/server/billing/view";
import { db } from "@/server/db";
import { confirmCancellation } from "../actions";

// The ONE confirmation step of the in-app cancellation (§ 28 a). No offers or retention screens.
async function Content() {
  const m = getMessages();
  const t = m.billing.cancel;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER"]), "/konto/abonnement/opsig");
  const v = await subscriptionView(db(), ctx.membership.organizationId);
  if (!v.canCancel || !v.endDate) {
    return (
      <Card
        footer={
          <ButtonLink href="/konto/abonnement" variant="secondary" icon="arrowLeft">
            {t.back}
          </ButtonLink>
        }
      >
        <Notice>{t.nothing}</Notice>
      </Card>
    );
  }
  return (
    <Card
      footer={
        <>
          <ButtonLink href="/konto/abonnement" variant="ghost" icon="arrowLeft">
            {t.back}
          </ButtonLink>
          <form action={confirmCancellation}>
            <SubmitButton>{t.confirm}</SubmitButton>
          </form>
        </>
      }
    >
      <p className="text-body-lg text-ink">{format(t.body, { date: v.endDate })}</p>
      <DescriptionList
        items={[
          [m.billing.account.plan, v.planName],
          [m.account.subscription.accessUntil, <span key="end" className="tabular-nums">{v.endDate}</span>],
        ]}
      />
      <p className="text-body-sm text-ink-muted">{m.account.subscription.cancelPageNote}</p>
    </Card>
  );
}

export default function CancelPage() {
  const m = getMessages();
  return (
    <Page title={m.billing.cancel.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
