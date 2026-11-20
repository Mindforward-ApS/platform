import { Suspense } from "react";
import { AuthCard, AuthMain } from "@/components/auth/auth-shell";
import { ButtonLink, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { acceptInvitation, rejectInvitation } from "./actions";

// The invitation id is an unguessable token from Better Auth; the page shows only org and inviter name.
async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().invitation;
  const brand = getMessages().brand;
  const [{ id }, sp, ctx] = await Promise.all([params, searchParams, getAuthContext()]);
  const invitation = await db().invitation.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, expiresAt: true, organization: { select: { name: true } }, inviter: { select: { name: true } } },
  });
  const valid = invitation && invitation.status === "pending" && invitation.expiresAt > new Date();
  if (!valid) {
    return (
      <AuthCard icon="mail" iconTone="neutral" eyebrow={t.overline} title={brand}>
        <Notice tone="error">{t.expired}</Notice>
      </AuthCard>
    );
  }

  const card = (children: React.ReactNode) => (
    <AuthCard icon="users" eyebrow={brand} title={format(t.title, { organization: invitation.organization.name })} lead={format(t.invitedBy, { inviter: invitation.inviter.name })}>
      {children}
    </AuthCard>
  );

  if (!ctx) {
    return card(
      <ButtonLink href={`/log-ind?next=${encodeURIComponent(`/invitation/${id}`)}`} trailingIcon="arrowRight" className="w-full">
        {t.loginToAccept}
      </ButtonLink>,
    );
  }

  const wrongEmail = ctx.user.email.toLowerCase() !== invitation.email.toLowerCase();
  return card(
    <>
      {(wrongEmail || sp.fejl) && <Notice tone="error">{wrongEmail ? t.wrongEmail : t.expired}</Notice>}
      {!wrongEmail && (
        <div className="flex flex-col gap-3">
          <form action={acceptInvitation}>
            <input type="hidden" name="invitationId" value={id} />
            <SubmitButton className="w-full">{t.accept}</SubmitButton>
          </form>
          <form action={rejectInvitation}>
            <input type="hidden" name="invitationId" value={id} />
            <SubmitButton variant="secondary" className="w-full">
              {t.reject}
            </SubmitButton>
          </form>
        </div>
      )}
    </>,
  );
}

export default function InvitationPage(props: PageProps<"/invitation/[id]">) {
  return (
    <AuthMain>
      <Suspense>
        <Content params={props.params} searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </AuthMain>
  );
}
