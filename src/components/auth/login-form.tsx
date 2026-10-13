import { requestMagicLink, signInWithProvider } from "@/app/(auth)/log-ind/actions";
import { Field, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";

const ERRORS = { email: "invalidEmail", rate: "rateLimited", generel: "generic", udbyder: "providerUnavailable", link: "linkExpired" } as const;

export function LoginForm({ mode, error, next }: { mode: "log-ind" | "opret"; error?: string; next?: string }) {
  const t = getMessages().auth;
  const errorKey = error && error in ERRORS ? ERRORS[error as keyof typeof ERRORS] : undefined;
  return (
    <div className="flex flex-col gap-4">
      {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      <form action={requestMagicLink} className="flex flex-col gap-3">
        <input type="hidden" name="from" value={mode} />
        {next && <input type="hidden" name="next" value={next} />}
        <Field label={t.emailLabel} name="email" type="email" autoComplete="email" required />
        <SubmitButton>{t.sendLink}</SubmitButton>
      </form>
      <p className="text-center text-sm text-muted">{t.or}</p>
      <form action={signInWithProvider} className="flex flex-col gap-2">
        {next && <input type="hidden" name="next" value={next} />}
        <SubmitButton name="provider" value="microsoft" variant="secondary">
          {t.microsoft}
        </SubmitButton>
        <SubmitButton name="provider" value="google" variant="secondary">
          {t.google}
        </SubmitButton>
      </form>
      <a className="text-sm underline" href={mode === "log-ind" ? "/opret" : "/log-ind"}>
        {mode === "log-ind" ? t.toSignup : t.toLogin}
      </a>
    </div>
  );
}
