import { Suspense } from "react";
import { Icon } from "@/components/ui/icons";
import { Field, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { verifyTwoFactor } from "../actions";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string }> }) {
  const t = getMessages().admin;
  const sp = await searchParams;
  return (
    <form action={verifyTwoFactor} className="flex flex-col gap-5">
      {sp.fejl && <Notice tone="error">{t.invalidCode}</Notice>}
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
  );
}

export default function VerifyTwoFactorPage(props: PageProps<"/admin/2fa">) {
  const t = getMessages().admin;
  return (
    <main className="flex flex-1 items-start justify-center px-4 pt-16 pb-20 sm:items-center sm:pt-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6 rounded-lg border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-ink">
            <Icon name="shield" size={22} />
          </span>
          <h1 className="text-title-2 text-ink">{t.verifyTitle}</h1>
          <p className="text-body-sm text-ink-muted">{t.verifyBody}</p>
        </div>
        <Suspense>
          <Content searchParams={props.searchParams as Promise<{ fejl?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}
