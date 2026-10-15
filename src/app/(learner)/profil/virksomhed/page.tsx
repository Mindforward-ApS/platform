import Link from "next/link";
import { Suspense } from "react";
import { ProfileShell, SkipButton } from "@/components/profile/profile-shell";
import { AppIcon, Icon } from "@/components/ui/icons";
import { Badge, ButtonLink, buttonClass, cx } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getWorkProfile } from "@/server/connectors/service";
import { db } from "@/server/db";
import { lookupCvr } from "../actions";

// Step 1 of the work profile: CVR → company + industry ("Er det jer?"), or pick the industry by hand.
// DESIGN PREVIEW: three visual variants via ?v=a|b|c until Marco picks one; the others are then deleted.

type Variant = "a" | "b" | "c";
type ErrorKey = keyof ReturnType<typeof getMessages>["profile"]["company"]["errors"];

function CvrForm({ variant, cvr, error, big = false }: { variant: Variant; cvr: string; error?: string; big?: boolean }) {
  const t = getMessages().profile.company;
  return (
    <form action={lookupCvr} className="flex flex-col gap-4">
      <input type="hidden" name="v" value={variant} />
      <label className="flex flex-col gap-2">
        <span className="text-label text-ink">{t.cvrLabel}</span>
        <input
          name="cvr"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          defaultValue={cvr}
          placeholder="12 34 56 78"
          aria-invalid={error ? true : undefined}
          className={cx(
            "w-full rounded-md border border-line-strong/60 bg-surface px-4 font-mono tracking-[0.12em] text-ink shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus:border-accent focus:shadow-ring",
            big ? "h-14 text-title-3" : "h-12 text-body",
          )}
        />
        {error ? (
          <span className="flex items-start gap-1.5 text-body-sm text-danger">
            <Icon name="alert" className="mt-0.5" />
            {error}
          </span>
        ) : (
          <span className="text-body-sm text-ink-muted">{t.cvrHelp}</span>
        )}
      </label>
      <SubmitButton size="lg" trailingIcon="arrowRight" className="w-full sm:w-auto">
        {t.lookup}
      </SubmitButton>
    </form>
  );
}

function Confirm({ name, cvr, industry }: { name: string; cvr: string; industry: string }) {
  const t = getMessages().profile.company;
  return (
    <div className="flex flex-col gap-5" data-testid="profile-confirm">
      <div className="flex items-start gap-4">
        <AppIcon name="building" tone="sky" size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-overline text-ink-subtle uppercase">{t.confirmTitle}</p>
          <p className="text-title-2 break-words text-ink">{name}</p>
          <p className="font-mono text-mono text-ink-muted">CVR {cvr.replace(/(\d{2})(?=\d)/g, "$1 ")}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-sunken px-4 py-3">
        <span className="text-body-sm text-ink-muted">{t.confirmIndustry}</span>
        <Badge tone="accent">{industry}</Badge>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/profil/systemer" size="lg" trailingIcon="arrowRight">
          {t.confirmYes}
        </ButtonLink>
        <ButtonLink href="/profil/branche" size="lg" variant="secondary">
          {t.confirmChange}
        </ButtonLink>
      </div>
    </div>
  );
}

const STEP_ICONS = [
  { icon: "building", tone: "sky" },
  { icon: "grid", tone: "amber" },
  { icon: "sparkle", tone: "mint" },
] as const;

async function Content({ searchParams }: { searchParams: Promise<{ v?: string; fejl?: string; cvr?: string; bekraeft?: string }> }) {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/profil/virksomhed");
  const sp = await searchParams;
  const variant: Variant = sp.v === "b" || sp.v === "c" ? sp.v : "a";
  const t = getMessages().profile;
  const profile = sp.bekraeft ? await getWorkProfile(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }) : null;
  const confirm = profile?.industry && profile.companyName && profile.cvr ? <Confirm name={profile.companyName} cvr={profile.cvr} industry={profile.industry.name} /> : null;
  const error = sp.fejl && sp.fejl in t.company.errors ? t.company.errors[sp.fejl as ErrorKey] : undefined;
  const cvr = (sp.cvr ?? "").slice(0, 12);
  const pickInstead = (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-muted">
      {t.company.noCvr}
      <Link href="/profil/branche" className="font-medium text-accent underline decoration-accent/30 underline-offset-[3px] hover:text-accent-hover">
        {t.company.pickInstead}
      </Link>
    </p>
  );

  // A — Fokus: one calm, centered card.
  if (variant === "a") {
    return (
      <ProfileShell step={1} align="center">
        <section className="mx-auto flex w-full max-w-xl flex-col gap-8 rounded-2xl border border-line bg-surface p-6 shadow-md sm:p-10">
          {confirm ?? (
            <>
              <div className="flex flex-col items-center gap-4 text-center">
                <AppIcon name="building" tone="sky" size="xl" />
                <p className="text-overline text-ink-subtle uppercase">{t.company.eyebrow}</p>
                <h1 className="text-title-1 text-ink">{t.company.title}</h1>
                <p className="max-w-md text-body text-ink-muted">{t.company.lead}</p>
              </div>
              <CvrForm variant="a" cvr={cvr} error={error} big />
              <div className="flex items-center gap-3 text-caption text-ink-subtle">
                <span className="h-px flex-1 bg-line" />
                {t.company.or}
                <span className="h-px flex-1 bg-line" />
              </div>
              <Link href="/profil/branche" className={buttonClass("secondary", "lg", "w-full")}>
                {t.company.pickInstead}
              </Link>
            </>
          )}
        </section>
        <div className="flex justify-center">
          <SkipButton />
        </div>
      </ProfileShell>
    );
  }

  // B — Overblik: what happens (3 steps) on the left, the form on the right.
  if (variant === "b") {
    return (
      <ProfileShell step={1}>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-overline text-ink-subtle uppercase">{t.company.eyebrow}</p>
              <h1 className="text-title-1 text-ink">{t.company.title}</h1>
              <p className="max-w-lg text-body-lg text-ink-muted">{t.company.lead}</p>
            </div>
            <ol className="flex flex-col">
              {t.company.steps.map((s, i) => (
                <li key={s.title} className="relative flex gap-4 pb-7 last:pb-0">
                  {i < t.company.steps.length - 1 && <span aria-hidden="true" className="absolute top-12 left-[1.25rem] h-[calc(100%-3rem)] w-px bg-line" />}
                  <AppIcon name={STEP_ICONS[i]?.icon ?? "sparkle"} tone={STEP_ICONS[i]?.tone ?? "mint"} size="md" />
                  <div className="flex flex-col gap-0.5 pt-1.5">
                    <p className={cx("text-label", i === 0 ? "text-ink" : "text-ink-muted")}>
                      {i + 1}. {s.title}
                    </p>
                    <p className="text-body-sm text-ink-subtle">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <section className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 shadow-md sm:p-8">
            {confirm ?? (
              <>
                <CvrForm variant="b" cvr={cvr} error={error} />
                {pickInstead}
              </>
            )}
          </section>
        </div>
        <SkipButton />
      </ProfileShell>
    );
  }

  // C — Forhåndsvisning: the form plus a quiet preview of what you will get.
  return (
    <ProfileShell step={1}>
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="text-overline text-ink-subtle uppercase">{t.company.eyebrow}</p>
            <h1 className="text-title-1 text-ink">{t.company.title}</h1>
            <p className="max-w-lg text-body-lg text-ink-muted">{t.company.lead}</p>
          </div>
          {confirm ?? (
            <div className="flex flex-col gap-5">
              <CvrForm variant="c" cvr={cvr} error={error} big />
              {pickInstead}
            </div>
          )}
        </div>
        <aside aria-hidden="true" className="relative overflow-hidden rounded-2xl border border-line bg-sunken p-6 sm:p-8">
          <p className="text-overline text-ink-subtle uppercase">{t.company.preview.eyebrow}</p>
          <p className="mt-2 text-title-3 text-ink">{t.company.preview.title}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <li key={i} className={cx("flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs", i > 0 && "opacity-70", i > 1 && "opacity-40")}>
                <span className="size-9 shrink-0 rounded-lg bg-accent-soft" />
                <span className="flex flex-1 flex-col gap-2 pt-1">
                  <span className="h-3 w-2/5 rounded-full bg-line" />
                  <span className="h-2.5 w-4/5 rounded-full bg-sunken" />
                  <span className="h-2.5 w-3/5 rounded-full bg-sunken" />
                </span>
                <span className="mt-1 h-6 w-16 rounded-full bg-accent-soft" />
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-center gap-2 text-body-sm text-ink-muted">
            <Icon name="shield" />
            {t.company.preview.note}
          </p>
        </aside>
      </div>
      <SkipButton />
    </ProfileShell>
  );
}

export default function CompanyStepPage(props: PageProps<"/profil/virksomhed">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams as Promise<{ v?: string; fejl?: string; cvr?: string; bekraeft?: string }>} />
    </Suspense>
  );
}

