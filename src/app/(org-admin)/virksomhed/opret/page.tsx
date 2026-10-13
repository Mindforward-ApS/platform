import { Suspense } from "react";
import { Button, Field, Notice, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { createBusiness } from "./actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  await guardPage(() => requireUser(), "/virksomhed/opret");
  const t = getMessages().business;
  const sp = await searchParams;
  return (
    <form action={createBusiness} className="flex flex-col gap-3">
      {sp.fejl && <Notice tone="error">{getMessages().auth.errors.generic}</Notice>}
      <Field label={t.nameLabel} name="name" required minLength={2} maxLength={120} />
      <Button type="submit">{t.create}</Button>
    </form>
  );
}

export default function CreateBusinessPage(props: PageProps<"/virksomhed/opret">) {
  return (
    <Page title={getMessages().business.createTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
