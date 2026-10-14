import { Suspense } from "react";
import { ButtonLink, EmptyState } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { findPlayableVersion, getPlayerState, latestAttemptId } from "@/server/modules/attempts";
import { playableOptions } from "@/server/modules/deps";
import { ModuleView, type ModuleIntro } from "./module-view";

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const t = getMessages().player;
  const { slug } = await params;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/modul/${slug}`);
  const actor = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };

  const attemptId = await latestAttemptId(db(), actor, slug);
  const playable = await findPlayableVersion(db(), slug, playableOptions());
  if (!playable && !attemptId) {
    return (
      <div className="mx-auto flex w-full max-w-read flex-col px-4 pt-14 pb-20 sm:px-6">
        <EmptyState
          icon="alert"
          title={t.intro.unavailable}
          action={
            <ButtonLink href="/moduler" variant="secondary" icon="arrowLeft">
              {t.intro.back}
            </ButtonLink>
          }
        />
      </div>
    );
  }
  const state = attemptId ? await getPlayerState(db(), actor, attemptId) : null;
  const content = playable?.content;
  const intro: ModuleIntro | null = content
    ? {
        title: content.title,
        summary: content.summary,
        objectives: content.objectives,
        minutes: content.minutes,
        steps: content.steps.length,
        passPct: Math.round(content.passThreshold * 100),
      }
    : null;

  return <ModuleView slug={slug} initial={state} intro={intro} />;
}

export default function ModulePage(props: PageProps<"/modul/[slug]">) {
  return (
    <main className="flex w-full flex-1 flex-col">
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </main>
  );
}
