import { requestMagicLink, signInWithProvider } from "@/app/(auth)/log-ind/actions";
import { Divider, Notice, TextLink } from "@/components/ui/primitives";
import { BezelSubmit, PrimarySubmit } from "./auth-buttons";
import { getMessages } from "@/lib/i18n";
import { AuthCard } from "./auth-shell";

const ERRORS = { email: "invalidEmail", rate: "rateLimited", generel: "generic", udbyder: "providerUnavailable", link: "linkExpired" } as const;

// Magic link is the primary path (navy, like "Kom i gang" on the website); Microsoft/Google are white bezel
// buttons with their logos, same as the website hero. The email field uses the same bezel edge.
const field =
  "h-[52px] w-full rounded-[14px] border-[3px] border-site-bezel bg-surface bg-clip-padding px-4 text-[15.5px] text-site-ink shadow-[inset_0_0_0_1px_var(--color-site-hairline)] transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-ink-subtle hover:border-site-bezel-hover focus:border-site-blue/25 focus:shadow-[inset_0_0_0_1.5px_var(--color-site-blue)] aria-[invalid=true]:border-danger/30";

// Vendor logos as static files (their brand colours stay out of the design tokens).
function BrandIcon({ name }: { name: "google" | "microsoft" }) {
  // eslint-disable-next-line @next/next/no-img-element -- tiny static SVG from /public
  return <img src={`/brands/${name}.svg`} alt="" width={18} height={18} aria-hidden="true" className="size-[18px]" />;
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
        <label className="flex flex-col gap-2">
          <span className="text-[14.5px] font-medium text-site-ink">{t.emailLabel}</span>
          <input
            className={field}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder={t.emailPlaceholder}
            required
            autoFocus={!errorKey}
            aria-invalid={errorKey === "invalidEmail" ? true : undefined}
          />
        </label>
        <PrimarySubmit>{t.sendLink}</PrimarySubmit>
      </form>
      <Divider label={t.or} />
      <form action={signInWithProvider} className="flex flex-col gap-3">
        {next && <input type="hidden" name="next" value={next} />}
        <BezelSubmit name="provider" value="microsoft" icon={<BrandIcon name="microsoft" />}>
          {t.microsoft}
        </BezelSubmit>
        <BezelSubmit name="provider" value="google" icon={<BrandIcon name="google" />}>
          {t.google}
        </BezelSubmit>
      </form>
    </AuthCard>
  );
}
