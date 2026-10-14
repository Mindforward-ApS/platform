import { requestMagicLink, signInWithProvider } from "@/app/(auth)/log-ind/actions";
import { Divider, Field, Notice, TextLink } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { AuthCard } from "./auth-shell";

const ERRORS = { email: "invalidEmail", rate: "rateLimited", generel: "generic", udbyder: "providerUnavailable", link: "linkExpired" } as const;

// Magic link is the primary path; Microsoft/Google are plain secondary buttons (no vendor logos or colors).
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
        <SubmitButton className="w-full">{t.sendLink}</SubmitButton>
      </form>
      <Divider label={t.or} />
      <form action={signInWithProvider} className="flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <SubmitButton name="provider" value="microsoft" variant="secondary" className="w-full">
          {t.microsoft}
        </SubmitButton>
        <SubmitButton name="provider" value="google" variant="secondary" className="w-full">
          {t.google}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
