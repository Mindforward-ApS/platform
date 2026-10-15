import { Suspense } from "react";
import { IndustryPicker } from "@/components/profile/industry-picker";
import { ProfileShell, SkipButton } from "@/components/profile/profile-shell";
import { Notice } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getWorkProfile, listIndustries } from "@/server/connectors/service";
import { db } from "@/server/db";
import { chooseIndustry } from "../actions";

// Step 1b: pick the industry by hand (fallback when there is no CVR, or to correct the CVR match).

async function Content({ searchParams }: { searchParams: Promise<{ ukendt?: string }> }) {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/profil/branche");
  const sp = await searchParams;
  const t = getMessages().profile;
  const scope = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  const [industries, profile] = await Promise.all([listIndustries(db()), getWorkProfile(db(), scope)]);
  return (
    <ProfileShell step={1}>
      <header className="flex max-w-2xl flex-col gap-3">
        <p className="text-overline text-ink-subtle uppercase">{t.industry.eyebrow}</p>
        <h1 className="text-title-1 text-ink">{t.industry.title}</h1>
        <p className="text-body-lg text-ink-muted">{t.industry.lead}</p>
      </header>
      {sp.ukendt && <Notice>{t.company.unmatched}</Notice>}
      <IndustryPicker industries={industries} current={profile?.industryId ?? null} action={chooseIndustry} t={t.industry} />
      <SkipButton />
    </ProfileShell>
  );
}

export default function IndustryStepPage(props: PageProps<"/profil/branche">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams as Promise<{ ukendt?: string }>} />
    </Suspense>
  );
}
