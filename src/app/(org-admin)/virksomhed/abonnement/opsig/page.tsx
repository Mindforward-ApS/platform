import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Icon } from "@/components/ui/icons";
import { Card, Notice, TextLink } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { subscriptionView } from "@/server/billing/view";
import { db } from "@/server/db";
import { confirmCancellation } from "../../../../(learner)/konto/abonnement/actions";

// B2B: same one-step confirmation as B2C, OWNER only.
async function Content() {
  const t = getMessages().billing.cancel;
  const ctx = await guardPage(() => requireActiveMembership(ADMIN_ROLES), "/virksomhed/abonnement/opsig");
  const v = await subscriptionView(db(), ctx.membership.organizationId);
  const back = (
    <TextLink href="/virksomhed/abonnement" className="inline-flex items-center gap-1.5 text-body-sm">
      <Icon name="arrowLeft" />
      {t.back}
    </TextLink>
  );
  if (!v.canCancel || !v.endDate)
    return (
      <>
        <Notice>{t.nothing}</Notice>
        <div>{back}</div>
      </>
    );
  return (
    <Card className="max-w-read" footer={<form action={confirmCancellation} className="contents"><input type="hidden" name="from" value="virksomhed" /><SubmitButton>{t.confirm}</SubmitButton></form>}>
      <p className="text-body-lg text-ink">{format(t.body, { date: v.endDate })}</p>
      <div>{back}</div>
    </Card>
  );
}

export default function BusinessCancelPage() {
  return (
    <AdminShell title={getMessages().billing.cancel.title}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
