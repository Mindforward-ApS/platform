import { Suspense } from "react";
import { Button, Notice, Page } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { acceptInvitation, rejectInvitation } from "./actions";

// The invitation id is an unguessable token from Better Auth; the page shows only org and inviter name.
async function Content({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().invitation;
  const [{ id }, sp, ctx] = await Promise.all([params, searchParams, getAuthContext()]);
  const invitation = await db().invitation.findUnique({
    where: { id },
    select: { id: true, email: true, status: true, expiresAt: true, organization: { select: { name: true } }, inviter: { select: { name: true } } },
  });
  const valid = invitation && invitation.status === "pending" && invitation.expiresAt > new Date();
  if (!valid) return <Notice tone="error">{t.expired}</Notice>;

  const header = (
    <>
      <h2 className="text-xl font-semibold">{format(t.title, { organization: invitation.organization.name })}</h2>
      <p>{format(t.invitedBy, { inviter: invitation.inviter.name })}</p>
    </>
  );

  if (!ctx) {
    return (
      <>
        {header}
        <a className="rounded-md bg-accent px-4 py-2 text-center text-accent-fg" href={`/log-ind?next=${encodeURIComponent(`/invitation/${id}`)}`}>
          {t.loginToAccept}
        </a>
      </>
    );
  }

  const wrongEmail = ctx.user.email.toLowerCase() !== invitation.email.toLowerCase();
  return (
    <>
      {header}
      {(wrongEmail || sp.fejl) && <Notice tone="error">{wrongEmail ? t.wrongEmail : t.expired}</Notice>}
      {!wrongEmail && (
        <div className="flex gap-2">
          <form action={acceptInvitation}>
            <input type="hidden" name="invitationId" value={id} />
            <Button type="submit">{t.accept}</Button>
          </form>
          <form action={rejectInvitation}>
            <input type="hidden" name="invitationId" value={id} />
            <Button type="submit" variant="secondary">
              {t.reject}
            </Button>
          </form>
        </div>
      )}
    </>
  );
}

export default function InvitationPage(props: PageProps<"/invitation/[id]">) {
  return (
    <Page title={getMessages().brand}>
      <Suspense>
        <Content params={props.params} searchParams={props.searchParams as Promise<{ fejl?: string }>} />
      </Suspense>
    </Page>
  );
}
