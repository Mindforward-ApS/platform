import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ProfileShell, SkipButton } from "@/components/profile/profile-shell";
import { Icon } from "@/components/ui/icons";
import { ButtonLink, cx } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { systemsForProfile } from "@/server/connectors/service";
import { db } from "@/server/db";
import { chooseSystems } from "../actions";

// Step 2: "Hvilke af disse bruger I?" — preselected from the industry, can be added and removed.

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/profil/systemer");
  const data = await systemsForProfile(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId });
  if (!data) redirect("/profil/virksomhed");
  const t = getMessages().profile;
  const industry = data.profile.industry?.name ?? "";
  // Categories with an industry suggestion first.
  const categories = [...data.categories].sort((a, b) => Number(b.systems.some((s) => data.suggestedIds.has(s.id))) - Number(a.systems.some((s) => data.suggestedIds.has(s.id))));
  return (
    <ProfileShell step={2}>
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="text-overline text-ink-subtle uppercase">{t.systems.eyebrow}</p>
        <h1 className="text-title-1 text-ink">{t.systems.title}</h1>
        <p className="text-body-lg text-ink-muted">{format(t.systems.lead, { industry: industry.toLocaleLowerCase("da") })}</p>
      </header>
      <form action={chooseSystems} className="flex flex-col gap-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <fieldset key={c.slug} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
              <legend className="sr-only">{c.name}</legend>
              <p className="text-label text-ink" aria-hidden="true">
                {c.name}
              </p>
              <div className="flex flex-col gap-2">
                {c.systems.map((s) => (
                  <label
                    key={s.id}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 transition-colors hover:border-accent/50 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/40"
                  >
                    <input type="checkbox" name="systemId" value={s.id} defaultChecked={data.selected.has(s.id)} className="size-[18px] shrink-0 cursor-pointer accent-accent" />
                    <span className="flex-1 text-body-sm text-ink">{s.name}</span>
                    {data.suggestedIds.has(s.id) && (
                      <span className={cx("inline-flex items-center gap-1 text-caption text-ink-subtle")} title={t.systems.suggested}>
                        <Icon name="sparkle" size={12} />
                        <span className="sr-only">{t.systems.suggested}</span>
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <p className="flex items-center gap-2 text-caption text-ink-subtle">
          <Icon name="sparkle" size={12} />
          {t.systems.suggested}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton size="lg" trailingIcon="arrowRight">
            {t.systems.save}
          </SubmitButton>
          <ButtonLink href="/profil/branche" variant="ghost" size="lg">
            {t.back}
          </ButtonLink>
        </div>
      </form>
      <SkipButton />
    </ProfileShell>
  );
}

export default function SystemsStepPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
