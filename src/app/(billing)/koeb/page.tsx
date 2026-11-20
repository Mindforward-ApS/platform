import { Suspense } from "react";
import { BuyForm } from "@/components/billing/buy-form";
import { CheckoutRow, PlanChoice } from "@/components/billing/checkout-parts";
import { Icon, type IconName } from "@/components/ui/icons";
import { ButtonLink, Card, Notice, PageHeader, TextLink } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { checkoutConsent } from "@/server/billing/consent-text";
import { currentSubscription } from "@/server/billing/entitlements";
import { describePrice, loadDisplayPlan } from "@/server/billing/plans";
import { formatDkk, splitInclusive } from "@/server/billing/vat";
import { db } from "@/server/db";
import { buyB2C } from "./actions";

const ERRORS = {
  CONSENTS_REQUIRED: "consentsRequired",
  NOT_PERSONAL: "notPersonal",
  ALREADY_SUBSCRIBED: "alreadySubscribed",
  RATE_LIMITED: "rateLimited",
} as const;

// Page order follows docs/07 § 8.1: plan → information before purchase → declarations → bold price → "Køb".
// On wide screens the declarations and button sit in a summary column to the right; on phones they stack in that order.
async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; afbrudt?: string }> }) {
  const m = getMessages().billing;
  const t = m.checkout;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/koeb");
  const sp = await searchParams;
  const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.membership.organizationId }, select: { type: true } });
  if (org.type !== "PERSONAL" || ctx.membership.role !== "OWNER") return <Notice>{t.notPersonal}</Notice>;
  const sub = await currentSubscription(db(), ctx.membership.organizationId);
  if (sub && ["ACTIVE", "TRIALING", "PAST_DUE"].includes(sub.status)) {
    return (
      <Card>
        <Notice>{t.alreadySubscribed}</Notice>
        <div>
          <ButtonLink href="/konto/abonnement" variant="secondary" trailingIcon="arrowRight">
            {m.account.title}
          </ButtonLink>
        </div>
      </Card>
    );
  }
  const plan = await loadDisplayPlan(db(), "B2C_MONTHLY");
  const price = describePrice(plan);
  const interval = plan.interval ? m.interval[plan.interval] : "";
  const errorKey = sp.fejl && sp.fejl in ERRORS ? ERRORS[sp.fejl as keyof typeof ERRORS] : undefined;
  const info: [IconName, string][] = [
    ["check", t.what],
    ["clock", t.renews],
    ["shield", t.cancelAnyTime],
    ["lock", t.payment],
  ];

  return (
    <>
      {(errorKey || sp.afbrudt) && (
        <div className="flex flex-col gap-3">
          {errorKey && <Notice tone="error">{t[errorKey]}</Notice>}
          {sp.afbrudt && <Notice>{t.canceled}</Notice>}
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="plan-heading" className="flex flex-col gap-3">
            <h2 id="plan-heading" className="text-overline text-ink-muted uppercase">
              {t.planTitle}
            </h2>
            <PlanChoice
              name={m.planNames.B2C_MONTHLY}
              amount={formatDkk(price.grossOre)}
              unit={format(m.price.inclVat, { amount: "", interval }).trim()}
              selectedLabel={t.selected}
            />
          </section>
          <Card title={t.infoTitle}>
            <div className="flex flex-col gap-5" data-testid="pre-purchase-info">
              <ul className="flex flex-col gap-4">
                {info.map(([icon, text]) => (
                  <li key={icon} className="flex items-start gap-3 text-body text-ink">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-sm bg-sunken text-ink-muted">
                      <Icon name={icon} size={14} />
                    </span>
                    <p>{text}</p>
                  </li>
                ))}
              </ul>
              <p className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-body-sm">
                <TextLink href="/vilkaar/forbruger">{t.termsLink}</TextLink>
                <TextLink href="/privatliv">{t.privacyLink}</TextLink>
              </p>
            </div>
          </Card>
        </div>
        <section aria-labelledby="summary-heading" className="flex flex-col gap-3 lg:sticky lg:top-6">
          <h2 id="summary-heading" className="text-overline text-ink-muted uppercase">
            {t.summaryTitle}
          </h2>
          <Card>
            <dl className="flex flex-col gap-2.5">
              <CheckoutRow label={t.planTitle} value={m.planNames.B2C_MONTHLY} />
              {plan.interval && <CheckoutRow label={t.summaryBilled} value={m.intervalPaid[plan.interval]} />}
              <CheckoutRow label={t.summaryBinding} value={t.summaryNoBinding} />
              <CheckoutRow label={t.summaryVat} value={formatDkk(splitInclusive(price.grossOre).vatOre)} />
            </dl>
            <div className="border-t border-line pt-5">
              <BuyForm
                action={buyB2C}
                immediateAccessText={checkoutConsent.immediateAccess}
                withdrawalLossAckText={checkoutConsent.withdrawalLossAck}
                renewLine={t.renewLine}
                price={price.headline}
                buyLabel={t.buy}
                requiredHint={t.consentsRequired}
                legend={t.declarationsTitle}
              />
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}

export default function BuyPage(props: PageProps<"/koeb">) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <PageHeader title={getMessages().billing.checkout.title} />
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; afbrudt?: string }>} />
      </Suspense>
    </main>
  );
}
