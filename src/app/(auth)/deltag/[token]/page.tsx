import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AuthCard, AuthMain } from "@/components/auth/auth-shell";
import { ButtonLink, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { findOrgByJoinToken } from "@/server/orgs/invitations";
import { joinWithLink } from "./actions";

// Invitation link (docs/01 § 4.2.3). The token is unguessable; the page shows only the organization's name.

async function Content({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brand = getMessages().brand;
  const t = getMessages().orgAdmin.join;
  const [org, ctx] = await Promise.all([findOrgByJoinToken(db(), token), getAuthContext()]);
  if (!org) {
    return (
      <AuthCard icon="users" iconTone="neutral" eyebrow={getMessages().invitation.overline} title={brand}>
        <Notice tone="error">{t.invalid}</Notice>
      </AuthCard>
    );
  }
  return (
    <AuthCard icon="users" eyebrow={brand} title={format(t.title, { organization: org.name })} lead={format(t.body, { organization: org.name })}>
      {ctx ? (
        <ActionForm action={joinWithLink}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton className="w-full">{t.button}</SubmitButton>
        </ActionForm>
      ) : (
        <ButtonLink href={`/log-ind?next=${encodeURIComponent(`/deltag/${token}`)}`} trailingIcon="arrowRight" className="w-full">
          {t.login}
        </ButtonLink>
      )}
    </AuthCard>
  );
}

export default function JoinPage(props: PageProps<"/deltag/[token]">) {
  return (
    <AuthMain>
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </AuthMain>
  );
}
