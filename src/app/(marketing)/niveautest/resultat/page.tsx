import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { Badge, ButtonLink, Card, Check, cx, EmptyState, Field, Notice, ProgressBar, TextLink } from "@/components/ui/primitives";
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

const AREA_LOOK = {
  SECURE: { tone: "success", icon: "check", bar: "success" },
  PARTIAL: { tone: "neutral", icon: "dash", bar: "ink" },
  UNCERTAIN: { tone: "hint", icon: "alert", bar: "accent" },
} as const;

function ResultBody({ view, save }: { view: ResultView; save: ReactNode }) {
  const t = getMessages().placement.result;
  const { score } = view.plan;
  const preview = view.plan.items.slice(0, placementConfig.planPreviewCount);
  const more = view.plan.items.length - preview.length;
  return (
    <>
      <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6" data-testid="result-overall">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-title-2 text-ink">{format(t.overall, { level: score.level, label: t.levelLabels[score.level] })}</p>
          <span className="flex items-center gap-1" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cx("h-2 w-8 rounded-full", n <= score.level ? "bg-accent" : "bg-sunken ring-1 ring-line ring-inset")} />
            ))}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <ProgressBar value={score.correct} max={score.total} label={format(t.score, { correct: score.correct, total: score.total })} />
          <p className="flex justify-between gap-3 text-body-sm text-ink-muted tabular-nums">
            <span>{format(t.score, { correct: score.correct, total: score.total })}</span>
            <span>{format(t.levelOf, { level: score.level })}</span>
          </p>
        </div>
      </section>

      {save}

      <Card title={t.areasTitle} padded={false}>
        <ul className="divide-y divide-line" data-testid="result-areas">
          {score.areas.map((a) => {
            const look = AREA_LOOK[a.state];
            return (
              <li key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-6 py-4 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                <span className="text-body text-ink">{a.label}</span>
                <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                  <ProgressBar value={a.correct} max={a.total} tone={look.bar} label={a.label} />
                </span>
                <span className="col-start-2 row-start-1 flex items-center gap-3 sm:col-start-auto sm:row-start-auto">
                  <span className="w-12 text-right font-mono text-mono text-ink-muted tabular-nums">{format(t.areaScore, { correct: a.correct, total: a.total })}</span>
                  <span className="flex w-[84px] justify-end">
                    <Badge tone={look.tone} icon={look.icon}>
                      {t.areaStates[a.state]}
                    </Badge>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title={t.recommendationsTitle}>
        <ol className="flex flex-col gap-4" data-testid="result-recommendations">
          {score.recommendations.map((r, i) => (
            <li key={r.areaId} className="flex gap-4 text-body text-ink">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-mono text-accent-ink" aria-hidden="true">
                {i + 1}
              </span>
              <span className="pt-0.5">{r.text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card title={t.planTitle} description={t.planIntro} padded={false}>
        <ol className="divide-y divide-line" data-testid="result-plan">
          {preview.map((i, n) => (
            <li key={i.moduleId} className="flex items-start gap-4 px-6 py-4">
              <span className="w-6 shrink-0 pt-0.5 font-mono text-mono text-ink-subtle tabular-nums">{String(n + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="flex flex-wrap items-center gap-2 text-body text-ink">
                  {i.title}
                  {i.prioritized && <Badge tone="accent">{t.prioritized}</Badge>}
                  {i.skippable && <Badge tone="neutral">{t.skippable}</Badge>}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-body-sm text-ink-muted tabular-nums">
                  <Icon name="clock" />
                  {format(t.minutes, { minutes: i.minutes })}
                </span>
              </span>
            </li>
          ))}
        </ol>
        {(more > 0 || view.plan.excludedForTier.length > 0) && (
          <div className="flex flex-col gap-4 border-t border-line bg-sunken px-6 py-4">
            {more > 0 && <p className="text-body-sm text-ink-muted">{format(t.planMore, { count: more })}</p>}
            {view.plan.excludedForTier.length > 0 && (
              <div className="flex flex-col gap-1">
                <h3 className="text-label text-ink">{t.excludedTitle}</h3>
                <p className="text-body-sm text-ink-muted">{t.excludedIntro}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

function ConsentForm({ status, email }: { status?: string; email?: string }) {
  const t = getMessages().placement.consent;
  const errorKey = status && status in CONSENT_ERRORS ? CONSENT_ERRORS[status as keyof typeof CONSENT_ERRORS] : undefined;
  return (
    <section id="samtykke" className="flex scroll-mt-20 flex-col gap-4 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-title-3 text-ink">{t.title}</h2>
        <p className="text-body-sm text-ink-muted">{t.intro}</p>
      </div>
      {status === "sendt" && <Notice tone="success">{t.sent}</Notice>}
      {errorKey && <Notice tone="error">{t.errors[errorKey]}</Notice>}
      <form action={giveMarketingConsent} className="flex flex-col gap-4">
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        {/* Never pre-ticked (no defaultChecked) and never a condition for the result. */}
        <Check name="consent" value="yes" data-testid="marketing-consent" label={<span className="text-body-sm">{MARKETING_CONSENT.text}</span>} />
        <Field label={t.emailLabel} name="email" type="email" autoComplete="email" defaultValue={email} required />
        <SubmitButton variant="secondary" className="self-start">
          {t.submit}
        </SubmitButton>
      </form>
      <TextLink className="text-body-sm" href="/privatliv">
        {t.privacyLink}
      </TextLink>
    </section>
  );
}

/** "Gem resultat" call to action. Rendered twice: under the level on phones, in the sticky aside on desktop. */
function SaveCard({ saved, className }: { saved: boolean; className: string }) {
  const t = getMessages().placement.result;
  return (
    <section className={cx("flex-col gap-4 rounded-lg border border-accent bg-surface p-6 shadow-ring", className)}>
      {saved ? (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-title-3 text-ink">{t.savedTitle}</h2>
            <p className="text-body-sm text-ink-muted">{t.savedBody}</p>
          </div>
          <ButtonLink href="/plan" trailingIcon="arrowRight" className="w-full">
            {t.toPlan}
          </ButtonLink>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-title-3 text-ink">{t.saveTitle}</h2>
            <p className="text-body-sm text-ink-muted">{t.saveBody}</p>
          </div>
          <ButtonLink href="/opret?next=/plan" className="w-full">
            {t.saveButton}
          </ButtonLink>
        </>
      )}
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
      <EmptyState icon="target" title={t.notFoundTitle} action={<ButtonLink href="/niveautest" trailingIcon="arrowRight">{t.retake}</ButtonLink>}>
        {t.notFound}
      </EmptyState>
    );
  }

  const saved = Boolean(view.result.userId);
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <ResultBody view={view} save={<SaveCard saved={saved} className="flex lg:hidden" />} />
      </div>
      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <SaveCard saved={saved} className="hidden lg:flex" />
        <ConsentForm status={sp.samtykke} email={ctx?.user.email} />
        <TextLink href="/niveautest" className="self-start text-body-sm">
          {t.retake}
        </TextLink>
      </aside>
    </div>
  );
}

export default function PlacementResultPage(props: PageProps<"/niveautest/resultat">) {
  return (
    <main className="mx-auto flex w-full max-w-app flex-1 flex-col gap-8 px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <header className="flex flex-col gap-2">
        <p className="text-overline text-accent uppercase">{getMessages().placement.pick.eyebrow}</p>
        <h1 className="text-title-1 text-ink">{getMessages().placement.result.title}</h1>
      </header>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ samtykke?: string }>} />
      </Suspense>
    </main>
  );
}
