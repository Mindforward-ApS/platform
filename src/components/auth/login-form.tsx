import { requestMagicLink, signInWithProvider } from "@/app/(auth)/log-ind/actions";
import { Divider, Field, Notice, TextLink } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { AuthCard } from "./auth-shell";

const ERRORS = { email: "invalidEmail", rate: "rateLimited", generel: "generic", udbyder: "providerUnavailable", link: "linkExpired" } as const;

// Magic link is the primary path (navy, like "Kom i gang" on the website); Microsoft/Google are white buttons
// with their logos, same as the website hero.
const primary = "h-12! w-full rounded-xl! bg-site-navy! text-[15px]! font-semibold! text-on-sidebar! hover:bg-site-navy-hover!";
const social = "h-12! w-full gap-3! rounded-xl! border-line! bg-surface! text-[15px]! font-medium! text-site-ink! hover:bg-site-soft!";

// Vendor logos as static files (their brand colours stay out of the design tokens).
function BrandIcon({ name }: { name: "google" | "microsoft" }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG from /public
  return <img src={`/brands/${name}.svg`} alt="" width={20} height={20} aria-hidden="true" className="size-5" />;
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
          <BrandIcon name="microsoft" />
          {t.microsoft}
        </SubmitButton>
        <SubmitButton name="provider" value="google" variant="secondary" className={social}>
          <BrandIcon name="google" />
          {t.google}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
