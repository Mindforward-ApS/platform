import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { serverEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { payMockCheckout } from "./actions";

// Stand-in for Stripe's hosted Checkout page when STRIPE_MOCK=1 (tests, e2e, offline dev). 404 otherwise;
// env validation forbids STRIPE_MOCK in production.
async function Content({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  const { session } = await searchParams;
  if (!serverEnv().STRIPE_MOCK || !session) notFound();
  await guardPage(() => requireUser());
  const t = getMessages().billing.mock;
  return (
    <>
      <p>{t.body}</p>
      <form action={payMockCheckout}>
        <input type="hidden" name="session" value={session} />
        <SubmitButton>{t.pay}</SubmitButton>
      </form>
    </>
  );
}

export default function MockCheckoutPage(props: PageProps<"/dev/stripe-mock">) {
  return (
    <Page title={getMessages().billing.mock.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ session?: string }>} />
      </Suspense>
    </Page>
  );
}
