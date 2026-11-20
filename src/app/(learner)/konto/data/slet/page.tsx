import { Suspense } from "react";
import { DangerSubmitButton } from "@/components/account/danger-submit-button";
import { ActionForm } from "@/components/admin/action-form";
import { ButtonLink, Card, Notice, Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { confirmDeletion } from "../actions";

// Landing page for the deletion mail. GET never deletes (mail scanners follow links); the button does.

async function Content({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  await guardPage(() => requireUser(), `/konto/data/slet?token=${encodeURIComponent(token ?? "")}`);
  const m = getMessages();
  const t = m.orgAdmin.myData;
  return (
    <Card>
      <Notice tone="danger" icon="alert" title={m.account.data.deleteWarning}>
        {t.confirmBody}
      </Notice>
      <ActionForm action={confirmDeletion} className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token ?? ""} />
        <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
          <ButtonLink href="/konto/data" variant="ghost">
            {m.account.data.keepAccount}
          </ButtonLink>
          <DangerSubmitButton icon="trash">{t.confirmButton}</DangerSubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

export default function ConfirmDeletionPage(props: PageProps<"/konto/data/slet">) {
  return (
    <Page title={getMessages().orgAdmin.myData.confirmTitle}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ token?: string }>} />
      </Suspense>
    </Page>
  );
}
