import { Suspense } from "react";
import { Button, Field, Notice, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { verifyTwoFactor } from "../actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().admin;
  const sp = await searchParams;
  return (
    <form action={verifyTwoFactor} className="flex flex-col gap-3">
      {sp.fejl && <Notice tone="error">{t.invalidCode}</Notice>}
      <Field label={t.codeLabel} name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" required />
      <Button type="submit">{t.verify}</Button>
    </form>
  );
}

export default function VerifyTwoFactorPage(props: PageProps<"/admin/2fa">) {
  return (
    <Page title={getMessages().admin.verifyTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
