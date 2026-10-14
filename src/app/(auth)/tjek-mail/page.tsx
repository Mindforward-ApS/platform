import { cookies } from "next/headers";
import { Suspense } from "react";
import { requestMagicLink } from "@/app/(auth)/log-ind/actions";
import { AuthCard, AuthMain } from "@/components/auth/auth-shell";
import { TextLink } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { PENDING_EMAIL_COOKIE } from "@/lib/auth-cookies";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";

async function Content() {
  const t = getMessages().auth;
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  // Show the address in bold inside the sentence: split the template around {email}.
  const [before, after = ""] = format(t.checkMailBody, { minutes: serverEnv().MAGIC_LINK_EXPIRES_MIN }).split("{email}");
  return (
    <AuthCard
      icon="mail"
      title={t.checkMailTitle}
      lead={
        <p role="status">
          {before}
          <strong className="font-semibold text-ink [overflow-wrap:anywhere]">{email ?? t.fallbackEmail}</strong>
          {after}
        </p>
      }
      footer={<TextLink href="/log-ind">{t.otherEmail}</TextLink>}
    >
      <div className="flex flex-col gap-3 rounded-md border border-line bg-sunken px-4 py-4">
        <p className="text-label text-ink">{t.checkMailNextTitle}</p>
        <ol className="flex flex-col gap-2">
          {t.checkMailSteps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-body-sm text-ink-muted">
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong bg-surface text-caption text-ink tabular-nums">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-body-sm text-ink-muted">{t.checkMailSpam}</p>
      {email && (
        <form action={requestMagicLink}>
          <input type="hidden" name="email" value={email} />
          <SubmitButton variant="secondary" className="w-full">
            {t.resend}
          </SubmitButton>
        </form>
      )}
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
