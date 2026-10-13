import Link from "next/link";
import { Suspense } from "react";
import { Notice } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { latestUserResult, resultView } from "@/server/placement/service";
import type { PlanGroup } from "@/server/placement/plan-generator";

// L1 "Min plan" (docs/01 § 4.1 step 6): the plan from the latest placement result in the active organization,
// with Assignment status for modules that exist; modules not yet published show "Kommer snart".

async function Content() {
  const t = getMessages().placement;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/plan");
  const organizationId = ctx.membership.organizationId;
  const result = await latestUserResult(db(), ctx.user.id, organizationId);
  const view = result ? await resultView(db(), result) : null;
  if (!view) {
    return (
      <>
        <Notice>{t.plan.empty}</Notice>
        <Link className="rounded-md bg-accent px-4 py-2 text-center text-accent-fg" href="/niveautest">
          {t.plan.takeTest}
        </Link>
      </>
    );
  }

  const assignments = await db().assignment.findMany({
    where: { organizationId, userId: ctx.user.id },
    select: { status: true, module: { select: { slug: true } } },
  });
  const statusOf = new Map(assignments.map((a) => [a.module.slug, a.status]));
  const groups = (["LEVEL_1", "ROLE", "LEVEL_2", "LEVEL_3"] as PlanGroup[])
    .map((g) => ({ g, items: view.plan.items.filter((i) => i.group === g) }))
    .filter((x) => x.items.length > 0);
  const level = view.plan.score.level;

  return (
    <>
      <p data-testid="plan-track">{format(t.plan.track, { track: t.tracks[view.track] })}</p>
      <p>{format(t.plan.level, { level, label: t.result.levelLabels[level] })}</p>
      {groups.map(({ g, items }) => (
        <section key={g} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.plan.groups[g]}</h2>
          <ol className="flex flex-col gap-1" data-testid={`plan-${g}`}>
            {items.map((i) => {
              const status = statusOf.get(i.moduleId);
              return (
                <li key={i.moduleId} className="flex flex-wrap justify-between gap-2 rounded-md border border-border p-2">
                  <span>
                    {i.title}
                    {i.skippable && <span className="ml-2 text-sm text-muted">{t.result.skippable}</span>}
                  </span>
                  <span className="text-sm text-muted">
                    {format(t.result.minutes, { minutes: i.minutes })} · {status ? t.plan.status[status] : t.plan.comingSoon}
                    {status && (
                      <Link className="ml-2 underline" href={`/modul/${i.moduleId}`}>
                        {t.plan.open}
                      </Link>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <Link className="text-sm underline" href="/niveautest">
        {t.result.retake}
      </Link>
    </>
  );
}

export default function PlanPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{getMessages().placement.plan.title}</h1>
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}
