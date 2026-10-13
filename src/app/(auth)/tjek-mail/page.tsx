import { cookies } from "next/headers";
import { Suspense } from "react";
import { requestMagicLink } from "@/app/(auth)/log-ind/actions";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth-cookies";
import { Button, Notice, Page } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { serverEnv } from "@/lib/env";

async function Content() {
  const t = getMessages().auth;
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  return (
    <>
      <Notice>{format(t.checkMailBody, { email: email ?? "din email", minutes: serverEnv().MAGIC_LINK_EXPIRES_MIN })}</Notice>
      {email && (
        <form action={requestMagicLink}>
          <input type="hidden" name="email" value={email} />
          <Button type="submit" variant="secondary">
            {t.resend}
          </Button>
        </form>
      )}
      <a className="text-sm underline" href="/log-ind">
        {t.otherEmail}
      </a>
    </>
  );
}

export default function CheckMailPage() {
  return (
    <Page title={getMessages().auth.checkMailTitle}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
