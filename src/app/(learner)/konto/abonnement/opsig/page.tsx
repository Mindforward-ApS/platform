import { Suspense } from "react";
import { Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { subscriptionView } from "@/server/billing/view";
import { db } from "@/server/db";
import { confirmCancellation } from "../actions";

// The ONE confirmation step of the in-app cancellation (§ 28 a). No offers or retention screens.
async function Content() {
  const t = getMessages().billing.cancel;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER"]), "/konto/abonnement/opsig");
  const v = await subscriptionView(db(), ctx.membership.organizationId);
  if (!v.canCancel || !v.endDate) return <Notice>{t.nothing}</Notice>;
  return (
    <>
      <p>{format(t.body, { date: v.endDate })}</p>
      <form action={confirmCancellation}>
        <SubmitButton>{t.confirm}</SubmitButton>
      </form>
      <a className="underline" href="/konto/abonnement">
        {t.back}
      </a>
    </>
  );
}

export default function CancelPage() {
  return (
    <Page title={getMessages().billing.cancel.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
