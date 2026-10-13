import { Suspense } from "react";
import { Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { db } from "@/server/db";
import { confirmationState } from "@/server/email/consent";
import { confirmConsent } from "./actions";

// Double opt-in landing (docs/09 § 2). GET only shows state; consent turns CONFIRMED on the button click (POST),
// so link scanners in mail clients cannot confirm on the user's behalf.

const MESSAGE = { bekraeftet: "confirmed", udloebet: "expired", afmeldt: "withdrawn", ugyldig: "invalid" } as const;

async function Content({ searchParams }: { searchParams: Promise<{ t?: string; status?: string }> }) {
  const t = getMessages().placement.confirm;
  const sp = await searchParams;
  if (sp.status && sp.status in MESSAGE) {
    const key = MESSAGE[sp.status as keyof typeof MESSAGE];
    return <Notice tone={key === "confirmed" ? "info" : "error"}>{t[key]}</Notice>;
  }
  const state = sp.t ? await confirmationState(db(), sp.t) : "INVALID";
  if (state === "CONFIRMED") return <Notice>{t.confirmed}</Notice>;
  if (state !== "VALID") return <Notice tone="error">{t[state === "EXPIRED" ? "expired" : state === "WITHDRAWN" ? "withdrawn" : "invalid"]}</Notice>;
  return (
    <>
      <p>{t.body}</p>
      <form action={confirmConsent}>
        <input type="hidden" name="t" value={sp.t} />
        <SubmitButton>{t.button}</SubmitButton>
      </form>
    </>
  );
}

export default function ConfirmConsentPage(props: PageProps<"/samtykke/bekraeft">) {
  return (
    <Page title={getMessages().placement.confirm.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ t?: string; status?: string }>} />
      </Suspense>
    </Page>
  );
}
