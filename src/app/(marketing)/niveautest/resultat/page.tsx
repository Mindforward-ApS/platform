import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Field, Notice } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { placementConfig } from "@/lib/config/placement";
import { MARKETING_CONSENT } from "@/lib/legal/marketing-consent";
import { format, getMessages } from "@/lib/i18n";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { findAnonymousResult, latestUserResult, resultView, type ResultView } from "@/server/placement/service";
import { PLACEMENT_COOKIE } from "@/server/placement/tokens";
import { giveMarketingConsent } from "./actions";

// P5: the result is shown WITHOUT email or consent. Below it: the voluntary, UNTICKED consent checkbox (MFL § 10)
// and, separately, "Gem resultat og fortsæt gratis" → signup (the anonymous result travels in an httpOnly cookie).

const CONSENT_ERRORS = { "fejl-kryds": "notTicked", "fejl-email": "invalidEmail", "fejl-graense": "rateLimited", "fejl-generel": "generic" } as const;

function ResultBody({ view }: { view: ResultView }) {
  const t = getMessages().placement.result;
  const { score } = view.plan;
  const preview = view.plan.items.slice(0, placementConfig.planPreviewCount);
  const more = view.plan.items.length - preview.length;
  return (
    <>
      <section className="flex flex-col gap-1" data-testid="result-overall">
        <p className="text-xl font-semibold">{format(t.overall, { level: score.level, label: t.levelLabels[score.level] })}</p>
        <p className="text-muted">{format(t.score, { correct: score.correct, total: score.total })}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.areasTitle}</h2>
        <ul className="flex flex-col gap-1" data-testid="result-areas">
          {score.areas.map((a) => (
            <li key={a.id} className="flex justify-between gap-2 rounded-md border border-border p-2">
              <span>{a.label}</span>
              <span>
                {t.areaStates[a.state]} · {format(t.areaScore, { correct: a.correct, total: a.total })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.recommendationsTitle}</h2>
        <ol className="list-decimal pl-6" data-testid="result-recommendations">
          {score.recommendations.map((r) => (
            <li key={r.areaId}>{r.text}</li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.planTitle}</h2>
        <p className="text-sm text-muted">{t.planIntro}</p>
        <ol className="flex flex-col gap-1" data-testid="result-plan">
          {preview.map((i) => (
            <li key={i.moduleId} className="flex justify-between gap-2 rounded-md border border-border p-2">
              <span>
                {i.title}
                {i.prioritized && <span className="ml-2 text-sm font-semibold">{t.prioritized}</span>}
                {i.skippable && <span className="ml-2 text-sm text-muted">{t.skippable}</span>}
              </span>
              <span className="text-sm text-muted">{format(t.minutes, { minutes: i.minutes })}</span>
            </li>
          ))}
        </ol>
        {more > 0 && <p className="text-sm text-muted">{format(t.planMore, { count: more })}</p>}
        {view.plan.excludedForTier.length > 0 && (
          <div className="flex flex-col gap-1">
            <h3 className="font-semibold">{t.excludedTitle}</h3>
            <p className="text-sm text-muted">{t.excludedIntro}</p>
          </div>
        )}
      </section>
    </>
  );
}

function ConsentForm({ status, email }: { status?: string; email?: string }) {
  const t = getMessages().placement.consent;
  const errorKey = status && status in CONSENT_ERRORS ? CONSENT_ERRORS[status as keyof typeof CONSENT_ERRORS] : undefined;
  return (
    <section id="samtykke" className="flex flex-col gap-3 rounded-md border border-border p-4">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="text-sm text-muted">{t.intro}</p>
      {status === "sendt" && <Notice>{t.sent}</Notice>}
      {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      <form action={giveMarketingConsent} className="flex flex-col gap-3">
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {/* Never pre-ticked (no defaultChecked) and never a condition for the result. */}
        <label className="flex items-start gap-2">
          <input type="checkbox" name="consent" value="yes" className="mt-1" data-testid="marketing-consent" />
          <span>{MARKETING_CONSENT.text}</span>
        </label>
        <Field label={t.emailLabel} name="email" type="email" autoComplete="email" defaultValue={email} required />
        <SubmitButton variant="secondary">{t.submit}</SubmitButton>
      </form>
      <Link className="text-sm underline" href="/privatliv">
        {t.privacyLink}
      </Link>
    </section>
  );
}

async function Content({ searchParams }: { searchParams: Promise<{ samtykke?: string }> }) {
  const t = getMessages().placement.result;
  const [sp, jar, ctx] = await Promise.all([searchParams, cookies(), getAuthContext()]);
  const token = jar.get(PLACEMENT_COOKIE)?.value;
  const result = (token ? await findAnonymousResult(db(), token) : null) ?? (ctx ? await latestUserResult(db(), ctx.user.id, ctx.session.activeOrganizationId) : null);
  const view = result ? await resultView(db(), result) : null;

  if (!view) {
    return (
      <>
        <Notice>{t.notFound}</Notice>
        <Link className="underline" href="/niveautest">
          {t.retake}
        </Link>
      </>
    );
  }

  const saved = Boolean(view.result.userId);
  return (
    <>
      <ResultBody view={view} />
      <section className="flex flex-col gap-2 rounded-md border border-border p-4">
        {saved ? (
          <Link className="rounded-md bg-accent px-4 py-2 text-center text-accent-fg" href="/plan">
            {t.toPlan}
          </Link>
        ) : (
          <>
            <h2 className="text-lg font-semibold">{t.saveTitle}</h2>
            <p>{t.saveBody}</p>
            <Link className="rounded-md bg-accent px-4 py-2 text-center text-accent-fg" href="/opret?next=/plan">
              {t.saveButton}
            </Link>
          </>
        )}
      </section>
      <ConsentForm status={sp.samtykke} email={ctx?.user.email} />
      <Link className="text-sm underline" href="/niveautest">
        {t.retake}
      </Link>
    </>
  );
}

export default function PlacementResultPage(props: PageProps<"/niveautest/resultat">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{getMessages().placement.result.title}</h1>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ samtykke?: string }>} />
      </Suspense>
    </main>
  );
}
