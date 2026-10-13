import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { Notice, Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { findOrgByJoinToken } from "@/server/orgs/invitations";
import { joinWithLink } from "./actions";

// Invitation link (docs/01 § 4.2.3). The token is unguessable; the page shows only the organization's name.

async function Content({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = getMessages().orgAdmin.join;
  const [org, ctx] = await Promise.all([findOrgByJoinToken(db(), token), getAuthContext()]);
  if (!org) return <Notice tone="error">{t.invalid}</Notice>;
  return (
    <>
      <h2 className="text-xl font-semibold">{format(t.title, { organization: org.name })}</h2>
      <p>{format(t.body, { organization: org.name })}</p>
      {ctx ? (
        <ActionForm action={joinWithLink}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton>{t.button}</SubmitButton>
        </ActionForm>
      ) : (
        <a className="rounded-md bg-accent px-4 py-2 text-center text-accent-fg" href={`/log-ind?next=${encodeURIComponent(`/deltag/${token}`)}`}>
          {t.login}
        </a>
      )}
    </>
  );
}

export default function JoinPage(props: PageProps<"/deltag/[token]">) {
  return (
    <Page title={getMessages().brand}>
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </Page>
  );
}
