import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { confirmDeletion } from "../actions";

// Landing page for the deletion mail. GET never deletes (mail scanners follow links); the button does.

async function Content({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  await guardPage(() => requireUser(), `/konto/data/slet?token=${encodeURIComponent(token ?? "")}`);
  const t = getMessages().orgAdmin.myData;
  return (
    <>
      <p>{t.confirmBody}</p>
      <ActionForm action={confirmDeletion}>
        <input type="hidden" name="token" value={token ?? ""} />
        <SubmitButton>{t.confirmButton}</SubmitButton>
      </ActionForm>
    </>
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
