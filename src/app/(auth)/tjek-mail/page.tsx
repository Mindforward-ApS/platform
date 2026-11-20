import { cookies } from "next/headers";
import { Suspense } from "react";
import { AuthCard, AuthMain } from "@/components/auth/auth-shell";
import { CodeForm } from "@/components/onboarding/forms";
import { TextLink } from "@/components/ui/primitives";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { openPendingLogin, PENDING_LOGIN_COOKIE } from "@/server/auth/login-code";
import { resendCode, verifyCode } from "./actions";

// "Log ind" step 2: type the 6-digit code from the mail (Better Auth emailOTP; replaced the magic link 11 Nov 2026).
async function Content() {
  const m = getMessages();
  const t = m.auth;
  const pending = openPendingLogin((await cookies()).get(PENDING_LOGIN_COOKIE)?.value, serverEnv().BETTER_AUTH_SECRET);
  const back = pending?.next ? `/log-ind?next=${encodeURIComponent(pending.next)}` : "/log-ind";
  // Show the address in bold inside the sentence: split the template around {email}.
  const [before, after = ""] = format(t.checkMailBody, { minutes: serverEnv().MAGIC_LINK_EXPIRES_MIN }).split("{email}");
  return (
    <AuthCard
      icon="mail"
      title={t.checkMailTitle}
      lead={
        <p role="status">
          {before}
          <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{pending?.email ?? t.fallbackEmail}</strong>
          {after}
        </p>
      }
      footer={<TextLink href={back}>{t.otherEmail}</TextLink>}
    >
      <CodeForm t={m.onboarding.code} action={verifyCode} resend={resendCode} />
      <p className="text-body-sm text-ink-muted">{t.checkMailSpam}</p>
    </AuthCard>
  );
}

export default function CheckMailPage() {
  return (
    <AuthMain>
      <Suspense>
        <Content />
      </Suspense>
    </AuthMain>
  );
}
