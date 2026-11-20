import { Suspense } from "react";
import { AuthCard, AuthMain } from "@/components/auth/auth-shell";
import { CheckoutRow } from "@/components/billing/checkout-parts";
import { Notice } from "@/components/ui/primitives";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { formatDate, formatTime } from "@/server/billing/time";
import { verifyReceiptToken } from "@/server/billing/withdrawal";
import { db } from "@/server/db";

// Receipt with date and time (§ 20 a). Reachable without login through a signed link (HMAC of the id).
async function Content({ searchParams }: { searchParams: Promise<{ id?: string; t?: string }> }) {
  const t = getMessages().billing.withdrawal;
  const { id, t: token } = await searchParams;
  const request = id && token && verifyReceiptToken(serverEnv().BETTER_AUTH_SECRET, id, token) ? await db().withdrawalRequest.findUnique({ where: { id } }) : null;
  if (!request) {
    return (
      <AuthCard icon="file" iconTone="neutral" title={t.receiptTitle}>
        <Notice tone="error">{t.receiptInvalid}</Notice>
      </AuthCard>
    );
  }
  const date = formatDate(request.submittedAt);
  const time = formatTime(request.submittedAt);
  return (
    <section role="status" data-testid="withdrawal-receipt">
      <AuthCard icon="check" iconTone="success" title={t.receiptTitle} lead={<p className="text-body-lg text-ink">{format(t.receiptBody, { date, time })}</p>}>
        <dl className="flex flex-col gap-2.5 rounded-md border border-line bg-sunken px-4 py-4">
          <CheckoutRow label={t.receivedLabel} value={format(t.receivedValue, { date, time })} />
          <CheckoutRow label={t.agreementLabel} value={request.agreementReference} />
          <CheckoutRow label={t.name} value={request.name} />
          <CheckoutRow label={t.email} value={request.email} />
        </dl>
        <p className="text-body-sm text-ink-muted">{format(t.receiptNext, { email: request.email })}</p>
      </AuthCard>
    </section>
  );
}

export default function WithdrawalReceiptPage(props: PageProps<"/fortryd-aftale/kvittering">) {
  return (
    <AuthMain>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ id?: string; t?: string }>} />
      </Suspense>
    </AuthMain>
  );
}
