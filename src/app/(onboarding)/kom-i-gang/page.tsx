import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CompanyForm, InviteForm, MembershipForm, StartForm, ToolForm } from "@/components/onboarding/forms";
import { OnboardingFrame } from "@/components/onboarding/frame";
import { SoftNote } from "@/components/onboarding/parts";
import { BrandIcon } from "@/components/ui/brand-icon";
import { Icon } from "@/components/ui/icons";
import {
  formatKroner,
  isPostAuthStep,
  onboardingPrices,
  onboardingSteps,
  progressPct,
  type OnboardingKind,
  type OnboardingRole,
  type StepId,
} from "@/lib/config/onboarding";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { loadOnboarding, nextStepFor, OnboardingError, planPreview, slugOfTrack, type OnboardingContext } from "@/server/onboarding/service";
import { finishOnboarding, inviteTeam, makeInviteLink, saveCompanyStep, saveMembership, saveStart, saveTool } from "./actions";

// Onboarding after the code (approved preview, Marco 11 Nov 2026): one question per screen with a progress bar.
// The step comes from ?trin= but never jumps past the first unanswered step; answers are prefilled when going back.

type Search = { trin?: string; type?: string };

const PRIMARY_LINK = "grid h-12 w-full place-items-center rounded-[10px] bg-web-stage text-[0.9375rem] font-semibold text-web-white transition hover:bg-web-stage-raised";

function kindOf(role: OnboardingRole): OnboardingKind {
  return role === "privat" ? "privat" : "virksomhed";
}

function hrefFor(step: StepId, noOrg: boolean) {
  return `/kom-i-gang?trin=${step}${noOrg ? "&type=virksomhed" : ""}`;
}

/** The previous screen inside the signed-in part (sign-up, code and the external test are not revisited). */
function backFor(steps: StepId[], step: StepId, noOrg: boolean): string | null {
  const visible: StepId[] = steps.filter((s) => s !== "tilmeld" && s !== "kode" && s !== "test" && s !== "velkommen");
  const i = visible.indexOf(step);
  const prev = i > 0 ? visible[i - 1] : undefined;
  return prev ? hrefFor(prev, noOrg) : null;
}

async function Content({ searchParams }: { searchParams: Promise<Search> }) {
  const ctx = await guardPage(() => requireUser(), "/kom-i-gang");
  const sp = await searchParams;
  const t = getMessages().onboarding;

  let o: OnboardingContext | null = null;
  if (ctx.session.activeOrganizationId) {
    try {
      o = await loadOnboarding(db(), { userId: ctx.user.id, organizationId: ctx.session.activeOrganizationId });
    } catch (err) {
      if (!(err instanceof OnboardingError)) throw err;
    }
  }
  // No organization yet: only a new company admin (the company is created on "Om jeres virksomhed").
  const noOrg = !o;
  if (noOrg && sp.type !== "virksomhed") redirect("/start");

  const role: OnboardingRole = o?.role ?? "virksomhed";
  const kind = kindOf(role);
  const path = o?.profile?.startPath ?? null;
  const steps = onboardingSteps(role, path);
  const open: StepId = o ? nextStepFor(o) : "firma";
  const requested = isPostAuthStep(sp.trin) && steps.includes(sp.trin) ? sp.trin : open;
  // Never past the first open step ("velkommen" and "inviter" are always reachable before it).
  let step: StepId = steps.indexOf(requested) <= steps.indexOf(open) || requested === "inviter" ? requested : open;
  if (noOrg && step !== "velkommen") step = "firma";
  if (step === "inviter" && (noOrg || role !== "virksomhed")) step = open;
  if (step === "test" && o?.trackKey) redirect(`/niveautest/${slugOfTrack(o.trackKey) ?? ""}?fra=kom-i-gang`);

  const frame = { kind, pct: progressPct(role, step, path), backHref: backFor(steps, step, noOrg) };
  const afterWelcome = steps[steps.indexOf("velkommen") + 1] ?? open;

  switch (step) {
    case "velkommen": {
      const user = await db().user.findUnique({ where: { id: ctx.user.id }, select: { firstName: true, name: true } });
      const name = user?.firstName || user?.name.split(" ")[0] || t.welcome.fallbackName;
      return (
        <OnboardingFrame {...frame} backHref={null} title={format(t.welcome.title, { name })} lead={t.welcome.lead}>
          <div className="grid gap-5">
            <div className="grid place-items-center rounded-[16px] bg-web-surface py-8 ring-1 ring-web-line">
              <span className="grid size-16 place-items-center rounded-full bg-web-coral text-[1.75rem] text-web-white">
                <Icon name="check" />
              </span>
            </div>
            <Link href={hrefFor(afterWelcome, noOrg)} className={PRIMARY_LINK}>
              {t.continue}
            </Link>
          </div>
        </OnboardingFrame>
      );
    }
    case "medlemskab": {
      const p = onboardingPrices.personal;
      return (
        <OnboardingFrame {...frame} title={t.membership.title} lead={t.membership.lead}>
          <MembershipForm
            t={t.membership}
            continueLabel={t.continue}
            prices={{ single: formatKroner(p.SINGLE.totalOre), friend: formatKroner(p.FRIEND.totalOre), friendEach: formatKroner(p.FRIEND.perPersonOre), student: formatKroner(p.STUDENT.totalOre) }}
            initial={{ plan: o?.profile?.personalPlan ?? "", friendEmail: o?.profile?.friendEmail ?? "", studentEmail: o?.profile?.studentEmail ?? "" }}
            action={saveMembership}
          />
        </OnboardingFrame>
      );
    }
    case "firma": {
      const p = onboardingPrices.team;
      return (
        <OnboardingFrame {...frame} backHref={noOrg ? null : frame.backHref} title={t.company.title} lead={t.company.lead}>
          <CompanyForm
            t={t.company}
            continueLabel={t.continue}
            prices={{ small: formatKroner(p.SIZE_1_9.perUserOre), large: formatKroner(p.SIZE_10_PLUS.perUserOre) }}
            initial={{ name: o?.orgType === "BUSINESS" ? o.organizationName : "", band: o?.profile?.teamSizeBand ?? "" }}
            action={saveCompanyStep}
          />
        </OnboardingFrame>
      );
    }
    case "inviter": {
      const org = await db().organization.findUniqueOrThrow({ where: { id: ctx.session.activeOrganizationId ?? "" }, select: { dpaAcceptedAt: true } });
      const canInvite = Boolean(org.dpaAcceptedAt);
      const isOwner = o?.membershipRole === "OWNER";
      return (
        <OnboardingFrame {...frame} title={t.invite.title} lead={t.invite.lead}>
          <InviteForm
            t={t.invite}
            canInvite={canInvite}
            // The data processing agreement must be accepted before the first invitation (docs/10 § 1.2).
            dpaNotice={
              <SoftNote>
                {getMessages().orgAdmin.invite.dpaRequired}{" "}
                {isOwner && (
                  <Link href="/virksomhed/databehandleraftale" className="font-semibold text-web-ink underline">
                    {t.invite.dpaLink}
                  </Link>
                )}
              </SoftNote>
            }
            action={inviteTeam}
            linkAction={makeInviteLink}
            skipHref={hrefFor("start", false)}
            linkPlaceholder={`${new URL(serverEnv().APP_URL).host}/deltag/…`}
          />
        </OnboardingFrame>
      );
    }
    case "start":
      return (
        <OnboardingFrame {...frame} title={t.start.title} lead={t.start.lead}>
          <StartForm t={t.start} continueLabel={t.continue} initial={o?.profile?.startPath ?? ""} action={saveStart} />
        </OnboardingFrame>
      );
    case "vaerktoej": {
      const lead = role === "privat" ? t.tool.leadPrivat : t.tool.leadVirksomhed;
      const active = await db().track.findMany({ where: { isActive: true, key: { in: ["CHATGPT", "COPILOT", "CLAUDE"] } }, select: { key: true } });
      const order = ["chatgpt", "copilot", "claude"] as const;
      const tools = order.filter((s) => active.some((a) => slugOfTrack(a.key) === s)).map((slug) => ({ slug, name: t.tool.names[slug] }));
      return (
        <OnboardingFrame {...frame} title={t.tool.title} lead={lead}>
          <ToolForm t={t.tool} tools={tools} lead={lead} initial={o?.trackKey ? (slugOfTrack(o.trackKey) ?? "") : ""} action={saveTool} continueLabel={t.continue} />
        </OnboardingFrame>
      );
    }
    default: {
      // "plan"
      if (!o) redirect(hrefFor("firma", true));
      const plan = await planPreview(db(), o);
      const fromTest = o.profile?.startPath === "PLACEMENT_TEST";
      const personal = o.profile?.personalPlan;
      const band = o.profile?.teamSizeBand;
      return (
        <OnboardingFrame {...frame} title={t.plan.title} lead={fromTest ? t.plan.leadTest : t.plan.leadScratch}>
          <div className="grid gap-4">
            {plan && (
              <div className="rounded-[16px] bg-web-stage p-5" data-testid="onboarding-plan">
                <div className="flex items-center gap-3">
                  <BrandIcon brand={plan.trackSlug} size={36} className="rounded-[9px]" />
                  <p className="font-semibold text-web-white">{format(t.plan.level, { tool: t.tool.names[plan.trackSlug], level: plan.levelName })}</p>
                </div>
                <ol className="mt-4 grid gap-2 text-[0.9375rem] text-web-white/80">
                  {plan.lessons.map((x, k) => (
                    <li key={x} className="flex items-center gap-3">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-[0.75rem] font-bold ${k === 0 ? "bg-web-coral text-web-ink" : "bg-web-stage-glass text-web-white"}`}
                      >
                        {k + 1}
                      </span>
                      {x}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {role === "virksomhed" && (
              <SoftNote>
                {t.plan.adminNote.split("{team}")[0]}
                <b className="text-web-ink">{t.plan.team}</b>
                {t.plan.adminNote.split("{team}")[1]}
              </SoftNote>
            )}
            {role === "privat" && personal && (
              <p className="text-center text-[0.8125rem] text-web-muted" data-testid="onboarding-membership">
                {format(t.plan.payNote, { plan: t.membership[personal === "SINGLE" ? "single" : personal === "FRIEND" ? "friend" : "student"] })}{" "}
                {/* Only Enkelt bruger has a checkout today (B2C_MONTHLY); the others wait for Stripe prices. */}
                {onboardingPrices.personal[personal].billingPlanKey && (
                  <Link href="/koeb" className="font-semibold text-web-ink underline">
                    {t.plan.toCheckout}
                  </Link>
                )}
              </p>
            )}
            {role === "virksomhed" && band && onboardingPrices.team[band].billingPlanKey && (
              <p className="text-center text-[0.8125rem] text-web-muted">
                {t.plan.trialNote}{" "}
                <Link href="/virksomhed/abonnement" className="font-semibold text-web-ink underline">
                  {t.plan.toTrial}
                </Link>
              </p>
            )}
            <form action={finishOnboarding}>
              <button type="submit" className="grid h-12 w-full place-items-center rounded-[10px] bg-web-coral text-[0.9375rem] font-semibold text-web-ink">
                {t.plan.startLesson}
              </button>
            </form>
          </div>
        </OnboardingFrame>
      );
    }
  }
}

export default function OnboardingPage(props: PageProps<"/kom-i-gang">) {
  return (
    <Suspense>
      <Content searchParams={props.searchParams as Promise<Search>} />
    </Suspense>
  );
}
