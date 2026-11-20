import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { resendCode, verifyCode } from "@/app/(auth)/tjek-mail/actions";
import { CodeForm } from "@/components/onboarding/forms";
import { OnboardingFrame } from "@/components/onboarding/frame";
import { progressPct } from "@/lib/config/onboarding";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { openPendingLogin, PENDING_LOGIN_COOKIE } from "@/server/auth/login-code";

// "Bekræft din e-mail": the 6-digit code from the sign-up mail. The address comes from the sealed pending cookie.

async function Content() {
  const t = getMessages().onboarding;
  const pending = openPendingLogin((await cookies()).get(PENDING_LOGIN_COOKIE)?.value, serverEnv().BETTER_AUTH_SECRET);
  const kind = pending?.kind ?? null;
  const back = kind ? `/opret?type=${kind}` : pending?.next ? `/opret?next=${encodeURIComponent(pending.next)}` : "/opret";
  const [before, after = ""] = format(t.code.lead, { email: "{email}" }).split("{email}");
  return (
    <OnboardingFrame
      kind={kind}
      pct={progressPct(kind ?? "privat", "kode", null)}
      backHref={back}
      title={t.code.title}
      lead={
        <p>
          {before}
          <strong className="font-semibold text-web-ink [overflow-wrap:anywhere]">{pending?.email ?? t.code.fallbackEmail}</strong>
          {after}
        </p>
      }
    >
      <CodeForm t={t.code} action={verifyCode} resend={resendCode} />
      <p className="mt-4 text-center text-[0.8125rem]">
        <Link href={back} className="text-web-muted underline">
          {t.code.otherEmail}
        </Link>
      </p>
    </OnboardingFrame>
  );
}

export default function SignupCodePage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
