import { Suspense } from "react";
import { BuyForm } from "@/components/billing/buy-form";
import { Notice, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { checkoutConsent } from "@/server/billing/consent-text";
import { currentSubscription } from "@/server/billing/entitlements";
import { describePrice, loadDisplayPlan } from "@/server/billing/plans";
import { db } from "@/server/db";
import { buyB2C } from "./actions";

const ERRORS = {
  CONSENTS_REQUIRED: "consentsRequired",
  NOT_PERSONAL: "notPersonal",
  ALREADY_SUBSCRIBED: "alreadySubscribed",
  RATE_LIMITED: "rateLimited",
} as const;

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; afbrudt?: string }> }) {
  const t = getMessages().billing.checkout;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/koeb");
  const sp = await searchParams;
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { type: true } });
  if (org.type !== "PERSONAL" || ctx.membership.role !== "OWNER") return <Notice>{t.notPersonal}</Notice>;
  const sub = await currentSubscription(db(), ctx.membership.organizationId);
  if (sub && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(sub.status)) {
    return (
      <>
        <Notice>{t.alreadySubscribed}</Notice>
        <a className="underline" href="/konto/abonnement">
          {getMessages().billing.account.title}
        </a>
      </>
    );
  }
  const plan = await loadDisplayPlan(db(), "B2C_MONTHLY");
  const errorKey = sp.fejl && sp.fejl in ERRORS ? ERRORS[sp.fejl as keyof typeof ERRORS] : undefined;

  return (
    <>
      {errorKey && <Notice tone="error">{t[errorKey]}</Notice>}
      {sp.afbrudt && <Notice>{t.canceled}</Notice>}
      <section className="flex flex-col gap-2" data-testid="pre-purchase-info">
        <p>{t.what}</p>
        <p>{t.renews}</p>
        <p>{t.cancelAnyTime}</p>
        <p>{t.payment}</p>
        <p className="flex gap-4 text-sm">
          <a className="underline" href="/vilkaar/forbruger">
            {t.termsLink}
          </a>
          <a className="underline" href="/privatliv">
            {t.privacyLink}
          </a>
        </p>
      </section>
      <BuyForm
        action={buyB2C}
        immediateAccessText={checkoutConsent.immediateAccess}
        withdrawalLossAckText={checkoutConsent.withdrawalLossAck}
        renewLine={t.renewLine}
        price={describePrice(plan).headline}
        buyLabel={t.buy}
        requiredHint={t.consentsRequired}
      />
    </>
  );
}

export default function BuyPage(props: PageProps<"/koeb">) {
  return (
    <Page title={getMessages().billing.checkout.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; afbrudt?: string }>} />
      </Suspense>
    </Page>
  );
}
