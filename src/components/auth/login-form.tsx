import { requestMagicLink, signInWithProvider } from "@/app/(auth)/log-ind/actions";
import { Divider, Field, Notice, TextLink } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { AuthCard } from "./auth-shell";

const ERRORS = { email: "invalidEmail", rate: "rateLimited", generel: "generic", udbyder: "providerUnavailable", link: "linkExpired" } as const;

// Magic link is the primary path (navy, like "Kom i gang" on the website); Microsoft/Google are white buttons
// with their logos, same as the website hero.
const primary = "h-12! w-full rounded-xl! bg-[#0e1a3d]! text-[15px]! font-semibold! text-white! hover:bg-[#1b2a5c]!";
const social = "h-12! w-full gap-3! rounded-xl! border-neutral-900/15! bg-white! text-[15px]! font-medium! text-[#14161c]! hover:bg-[#f6f8fe]!";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export function LoginForm({ mode, error, next }: { mode: "log-ind" | "opret"; error?: string; next?: string }) {
  const t = getMessages().auth;
  const errorKey = error && error in ERRORS ? ERRORS[error as keyof typeof ERRORS] : undefined;
  const isLogin = mode === "log-ind";
  return (
    <AuthCard
      title={isLogin ? t.loginTitle : t.signupTitle}
      lead={isLogin ? t.loginLead : t.signupLead}
      footer={<TextLink href={isLogin ? "/opret" : "/log-ind"}>{isLogin ? t.toSignup : t.toLogin}</TextLink>}
    >
      {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      <form action={requestMagicLink} className="flex flex-col gap-4">
        <input type="hidden" name="from" value={mode} />
        {next && <input type="hidden" name="next" value={next} />}
        <Field
          label={t.emailLabel}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t.emailPlaceholder}
          required
          autoFocus={!errorKey}
          aria-invalid={errorKey === "invalidEmail" ? true : undefined}
        />
        <SubmitButton className={primary}>{t.sendLink}</SubmitButton>
      </form>
      <Divider label={t.or} />
      <form action={signInWithProvider} className="flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <SubmitButton name="provider" value="microsoft" variant="secondary" className={social}>
          <MicrosoftIcon />
          {t.microsoft}
        </SubmitButton>
        <SubmitButton name="provider" value="google" variant="secondary" className={social}>
          <GoogleIcon />
          {t.google}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
