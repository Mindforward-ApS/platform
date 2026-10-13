import { Suspense } from "react";
import { Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { findPlayableVersion, getPlayerState, latestAttemptId } from "@/server/modules/attempts";
import { playableOptions } from "@/server/modules/deps";
import { ModuleView } from "./module-view";

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const t = getMessages().player;
  const { slug } = await params;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/modul/${slug}`);
  const actor = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };

  const attemptId = await latestAttemptId(db(), actor, slug);
  const playable = await findPlayableVersion(db(), slug, playableOptions());
  if (!playable && !attemptId) {
    return (
      <>
        <Notice tone="error">{t.intro.unavailable}</Notice>
        <a className="underline" href="/moduler">
          {t.intro.back}
        </a>
      </>
    );
  }
  const state = attemptId ? await getPlayerState(db(), actor, attemptId) : null;
  const content = playable?.content;

  return (
    <>
      <h1 className="text-2xl font-semibold">{state?.module.title ?? content?.title}</h1>
      {content && !state && (
        <>
          <p>{content.summary}</p>
          <h2 className="font-semibold">{t.intro.objectives}</h2>
          <ul className="list-disc pl-6">
            {content.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            {format(t.list.minutes, { minutes: content.minutes })} · {format(t.intro.passRule, { pct: Math.round(content.passThreshold * 100) })}
          </p>
        </>
      )}
      <ModuleView slug={slug} initial={state} />
    </>
  );
}

export default function ModulePage(props: PageProps<"/modul/[slug]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </main>
  );
}
