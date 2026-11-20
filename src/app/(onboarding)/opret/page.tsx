import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignupForm } from "@/components/onboarding/forms";
import { OnboardingFrame } from "@/components/onboarding/frame";
import { ChoiceLinkBody, choiceLinkClass, IconCircle } from "@/components/onboarding/parts";
import { Icon } from "@/components/ui/icons";
import { onboardingKind, progressPct } from "@/lib/config/onboarding";
import { getMessages } from "@/lib/i18n";
import { safeNextPath } from "@/lib/safe-next";
import { getAuthContext } from "@/server/auth/authz";
import { requestSignupCode } from "./actions";

// "Tilmeld" (approved preview, Marco 11 Nov 2026). The website's "Tilmeld dig" / "Tilmeld jer" buttons link here
// with ?type=privat / ?type=virksomhed, which skips the first choice. With ?next= (invitation, saved test
// result) the choice is skipped too: the existing post-login landing takes over after the code.

type Search = { type?: string; next?: string };

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getAuthContext()) redirect(next ? `/start?next=${encodeURIComponent(next)}` : "/kom-i-gang");
  const kind = onboardingKind.safeParse(sp.type).data ?? null;
  const t = getMessages().onboarding;

  if (!kind && !next) {
    return (
      <OnboardingFrame kind={null} pct={0} title={t.type.title} lead={t.type.lead}>
        <div className="grid gap-3">
          <Link href="/opret?type=privat" className={choiceLinkClass}>
            <ChoiceLinkBody
              title={t.type.privat}
              sub={t.type.privatSub}
              icon={
                <IconCircle>
                  <Icon name="user" />
                </IconCircle>
              }
            />
          </Link>
          <Link href="/opret?type=virksomhed" className={choiceLinkClass}>
            <ChoiceLinkBody
              title={t.type.virksomhed}
              sub={t.type.virksomhedSub}
              icon={
                <IconCircle>
                  <Icon name="building" />
                </IconCircle>
              }
            />
          </Link>
        </div>
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      kind={kind}
      pct={progressPct(kind ?? "privat", "tilmeld", null)}
      backHref={kind && !next ? "/opret" : null}
      title={kind === "virksomhed" ? t.signup.titleVirksomhed : t.signup.titlePrivat}
      lead={t.signup.lead}
    >
      <SignupForm t={t.signup} kind={kind} next={next} action={requestSignupCode} />
    </OnboardingFrame>
  );
}

export default function SignupPage(props: PageProps<"/opret">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams as Promise<Search>} />
    </Suspense>
  );
}
