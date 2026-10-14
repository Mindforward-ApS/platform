import { Suspense } from "react";
import { Card, Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { serverEnv } from "@/lib/env";
import { verifyUnsubscribeToken } from "@/server/email/consent";
import { unsubscribe } from "./actions";

// /afmeld?t=<HMAC token>: one button "Afmeld". GET shows the address only; the POST withdraws (WITHDRAWN + suppression).

async function Content({ searchParams }: { searchParams: Promise<{ t?: string; status?: string }> }) {
  const t = getMessages().placement.unsubscribe;
  const sp = await searchParams;
  if (sp.status === "afmeldt") return <Notice tone="success">{t.done}</Notice>;
  if (sp.status === "fejl") return <Notice tone="error">{t.unavailable}</Notice>;
  const secret = serverEnv().UNSUBSCRIBE_TOKEN_SECRET;
  if (!secret) return <Notice tone="error">{t.unavailable}</Notice>;
  const email = sp.t ? verifyUnsubscribeToken(sp.t, secret) : null;
  if (sp.status === "ugyldig" || !email) return <Notice tone="error">{t.invalid}</Notice>;
  return (
    <Card>
      <p className="text-body text-ink">{format(t.body, { email })}</p>
      <form action={unsubscribe}>
        <input type="hidden" name="t" value={sp.t} />
        <SubmitButton className="w-full">{t.button}</SubmitButton>
      </form>
    </Card>
  );
}

export default function UnsubscribePage(props: PageProps<"/afmeld">) {
  return (
    <Page title={getMessages().placement.unsubscribe.title} width="narrow">
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ t?: string; status?: string }>} />
      </Suspense>
    </Page>
  );
}
