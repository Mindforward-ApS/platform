import { Suspense } from "react";
import { Notice, Page } from "@/components/ui/primitives";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { formatDate, formatTime } from "@/server/billing/time";
import { verifyReceiptToken } from "@/server/billing/withdrawal";
import { db } from "@/server/db";

// Receipt with date and time (§ 20 a). Reachable without login through a signed link (HMAC of the id).
async function Content({ searchParams }: { searchParams: Promise<{ id?: string; t?: string }> }) {
  const t = getMessages().billing.withdrawal;
  const { id, t: token } = await searchParams;
  if (!id || !token || !verifyReceiptToken(serverEnv().BETTER_AUTH_SECRET, id, token)) return <Notice tone="error">{t.receiptInvalid}</Notice>;
  const request = await db().withdrawalRequest.findUnique({ where: { id } });
  if (!request) return <Notice tone="error">{t.receiptInvalid}</Notice>;
  return (
    <section className="flex flex-col gap-2" role="status" data-testid="withdrawal-receipt">
      <p>{format(t.receiptBody, { date: formatDate(request.submittedAt), time: formatTime(request.submittedAt) })}</p>
      <p>{format(t.receiptAgreement, { agreement: request.agreementReference })}</p>
      <p>{format(t.receiptName, { name: request.name })}</p>
      <p>{format(t.receiptEmail, { email: request.email })}</p>
      <p>{format(t.receiptNext, { email: request.email })}</p>
    </section>
  );
}

export default function WithdrawalReceiptPage(props: PageProps<"/fortryd-aftale/kvittering">) {
  return (
    <Page title={getMessages().billing.withdrawal.receiptTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ id?: string; t?: string }>} />
      </Suspense>
    </Page>
  );
}
