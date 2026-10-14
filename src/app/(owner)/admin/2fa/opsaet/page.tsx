import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { generateURI } from "otplib";
import { CodeBox } from "@/components/admin/admin-ui";
import { Icon } from "@/components/ui/icons";
import { Field, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { serverEnv } from "@/lib/env";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { decryptSecret } from "@/server/auth/secret-box";
import { db } from "@/server/db";
import { beginTwoFactorSetup, confirmTwoFactorSetup } from "../../actions";

/** Base32 key in groups of four, so it can be typed by hand without losing your place. */
const grouped = (secret: string) => secret.match(/.{1,4}/g)?.join(" ") ?? secret;

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-caption font-semibold text-ink-muted ring-1 ring-inset ring-line-strong tabular-nums" aria-hidden="true">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
        <p className="text-label text-ink">{title}</p>
        {children}
      </div>
    </li>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().admin;
  const ctx = await guardPage(() => requireUser(), "/admin/2fa/opsaet");
  const user = await db().user.findUnique({ where: { id: ctx.user.id }, select: { platformRole: true, twoFactorEnabled: true } });
  if (user?.platformRole !== "GREB_ADMIN") redirect("/konto?fejl=adgang");
  if (user.twoFactorEnabled) redirect("/admin/2fa");

  const pending = await db().twoFactor.findFirst({ where: { userId: ctx.user.id } });
  const sp = await searchParams;
  if (!pending) {
    return (
      <>
        <p className="text-center text-body-sm text-ink-muted">{t.setupStart}</p>
        <form action={beginTwoFactorSetup}>
          <SubmitButton className="w-full">{t.setupTitle}</SubmitButton>
        </form>
      </>
    );
  }
  // Shown only to the admin themself while enrollment is pending.
  const secret = decryptSecret(pending.secret, serverEnv().BETTER_AUTH_SECRET);
  return (
    <>
      <p className="text-center text-body-sm text-ink-muted">{t.setupBody}</p>
      <ol className="flex flex-col gap-6">
        <Step n={1} title={t.step1}>
          <div className="flex flex-col gap-1.5">
            <span className="text-caption text-ink-muted">{t.secretLabel}</span>
            <code data-testid="totp-secret" className="block rounded-sm border border-line bg-sunken px-3 py-2.5 text-center font-mono text-mono tracking-[0.06em] text-ink">
              {grouped(secret)}
            </code>
          </div>
          <details className="group/uri">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-body-sm text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
              <Icon name="chevronRight" className="transition-transform duration-[120ms] group-open/uri:rotate-90" />
              {t.uriLabel}
            </summary>
            <CodeBox className="mt-2 text-caption">{generateURI({ issuer: getMessages().brand, label: ctx.user.email, secret })}</CodeBox>
          </details>
        </Step>
        <Step n={2} title={t.step2}>
          {sp.fejl && <Notice tone="error">{t.invalidCode}</Notice>}
          <form action={confirmTwoFactorSetup} className="flex flex-col gap-4">
            <Field
              label={t.codeLabel}
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
              className="h-12 text-center font-mono text-title-3 tracking-[0.4em] tabular-nums"
            />
            <SubmitButton className="w-full">{t.verify}</SubmitButton>
          </form>
        </Step>
      </ol>
    </>
  );
}

export default function SetupTwoFactorPage(props: PageProps<"/admin/2fa/opsaet">) {
  const t = getMessages().admin;
  return (
    <main className="flex flex-1 items-start justify-center px-4 pt-16 pb-20 sm:items-center sm:pt-10">
      <div className="flex w-full max-w-[440px] flex-col gap-6 rounded-lg border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <Icon name="lock" size={22} />
          </span>
          <h1 className="text-title-2 text-ink">{t.setupTitle}</h1>
        </div>
        <Suspense>
          <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}
