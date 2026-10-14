import { Suspense } from "react";
import { Icon } from "@/components/ui/icons";
import { Card, Field, Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { createBusiness } from "./actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  await guardPage(() => requireUser(), "/virksomhed/opret");
  const t = getMessages().business;
  const sp = await searchParams;
  return (
    <Card>
      <form action={createBusiness} className="flex flex-col gap-5">
        {sp.fejl && <Notice tone="error">{getMessages().auth.errors.generic}</Notice>}
        <Field label={t.nameLabel} name="name" autoComplete="off" required minLength={2} maxLength={120} />
        <SubmitButton className="w-full">{t.create}</SubmitButton>
      </form>
      <p className="flex items-start gap-2 border-t border-line pt-4 text-body-sm text-ink-muted">
        <Icon name="info" className="mt-0.5" />
        {getMessages().orgAdmin.business.createNext}
      </p>
    </Card>
  );
}

export default function CreateBusinessPage(props: PageProps<"/virksomhed/opret">) {
  return (
    <Page title={getMessages().business.createTitle} lead={getMessages().orgAdmin.business.createLead} width="narrow">
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
