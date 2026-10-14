import { Suspense } from "react";
import { num } from "@/components/player/kit";
import { Icon } from "@/components/ui/icons";
import { Badge, ButtonLink, cx, EmptyState, Page, ProgressBar, TextLink } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { latestUserResult, resultView } from "@/server/placement/service";
import type { PlanGroup, PlanItem } from "@/server/placement/plan-generator";

// L1 "Min plan" (docs/01 § 4.1 step 6): the plan from the latest placement result in the active organization,
// with Assignment status for modules that exist; modules not yet published show "Kommer snart".

type Status = "ASSIGNED" | "IN_PROGRESS" | "PASSED" | "REMOVED";

function StatusBadge({ status }: { status: Status | undefined }) {
  const t = getMessages().placement.plan;
  if (!status)
    return (
      <Badge tone="neutral" icon="clock">
        {t.comingSoon}
      </Badge>
    );
  if (status === "PASSED")
    return (
      <Badge tone="success" icon="check">
        {t.status.PASSED}
      </Badge>
    );
  if (status === "IN_PROGRESS") return <Badge tone="accent">{t.status.IN_PROGRESS}</Badge>;
  return <Badge tone="neutral">{t.status[status]}</Badge>;
}

function Marker({ n, status, current }: { n: number; status: Status | undefined; current: boolean }) {
  const base = "relative z-10 grid size-8 shrink-0 place-items-center rounded-full font-mono text-mono tabular-nums";
  if (status === "PASSED")
    return (
      <span className={cx(base, "bg-success-soft text-success ring-1 ring-success/30")}>
        <Icon name="check" strokeWidth={2.25} />
      </span>
    );
  if (current) return <span className={cx(base, "bg-accent text-on-accent shadow-ring")}>{n}</span>;
  return <span className={cx(base, status ? "bg-surface text-ink-muted ring-1 ring-line-strong" : "bg-sunken text-ink-subtle ring-1 ring-line")}>{n}</span>;
}

async function Content() {
  const t = getMessages().placement;
  const v = getMessages().player.planView;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/plan");
  const organizationId = ctx.membership.organizationId;
  const result = await latestUserResult(db(), ctx.user.id, organizationId);
  const view = result ? await resultView(db(), result) : null;
  if (!view) {
    return (
      <EmptyState
        icon="plan"
        title={t.plan.empty}
        action={
          <ButtonLink href="/niveautest" trailingIcon="arrowRight">
            {t.plan.takeTest}
          </ButtonLink>
        }
      >
        {v.emptyBody}
      </EmptyState>
    );
  }

  const assignments = await db().assignment.findMany({
    where: { organizationId, userId: ctx.user.id },
    select: { status: true, module: { select: { slug: true } } },
  });
  // Playable modules without an Assignment yet are "Ikke startet" (same label as ASSIGNED) and can be opened.
  const statusOf = new Map<string, Status>(view.plan.items.filter((i) => view.available.has(i.moduleId)).map((i) => [i.moduleId, "ASSIGNED"]));
  for (const a of assignments) statusOf.set(a.module.slug, a.status as Status);
  const groups = (["LEVEL_1", "ROLE", "LEVEL_2", "LEVEL_3"] as PlanGroup[])
    .map((g) => ({ g, items: view.plan.items.filter((i) => i.group === g) }))
    .filter((x) => x.items.length > 0);
  const ordered = groups.flatMap((x) => x.items);
  const numberOf = new Map(ordered.map((i, n) => [i.moduleId, n + 1]));
  const level = view.plan.score.level;

  // Where the learner is now: the module already started, else the first one waiting.
  const next: PlanItem | undefined = ordered.find((i) => statusOf.get(i.moduleId) === "IN_PROGRESS") ?? ordered.find((i) => statusOf.get(i.moduleId) === "ASSIGNED");
  const nextStatus = next ? statusOf.get(next.moduleId) : undefined;
  const available = ordered.filter((i) => statusOf.has(i.moduleId) && statusOf.get(i.moduleId) !== "REMOVED");
  const passed = available.filter((i) => statusOf.get(i.moduleId) === "PASSED").length;
  const progress = format(v.progress, { passed, total: available.length });

  return (
    <div className="flex flex-col gap-12">
      <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-line bg-surface sm:grid-cols-[1fr_1fr_1.2fr] sm:divide-x sm:divide-line">
        <div className="flex flex-col gap-1 border-b border-line px-6 py-4 sm:border-b-0">
          <p className="text-caption text-ink-muted">{v.trackLabel}</p>
          <p className="text-body text-ink" data-testid="plan-track">
            {t.tracks[view.track]}
          </p>
        </div>
        <div className="flex flex-col gap-1 border-b border-line px-6 py-4 sm:border-b-0">
          <p className="text-caption text-ink-muted">{v.levelLabel}</p>
          <p className="text-body text-ink">{format(v.levelValue, { level, label: t.result.levelLabels[level] })}</p>
        </div>
        <div className="flex flex-col justify-center gap-2 px-6 py-4">
          <p className="flex items-center justify-between gap-3 text-caption text-ink-muted">
            <span>{progress}</span>
          </p>
          <ProgressBar value={passed} max={Math.max(1, available.length)} tone="success" label={progress} />
        </div>
      </div>

      {next ? (
        <section aria-labelledby="next-title" className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-overline text-accent uppercase">{v.next}</p>
            <h2 id="next-title" className="text-title-2 text-ink">
              {next.title}
            </h2>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5 font-mono text-mono tabular-nums">
                <Icon name="clock" size={14} />
                {format(t.result.minutes, { minutes: num(next.minutes) })}
              </span>
              <span>{t.plan.groups[next.group]}</span>
            </p>
          </div>
          <ButtonLink href={`/modul/${next.moduleId}`} size="lg" trailingIcon="arrowRight" className="shrink-0">
            {nextStatus === "IN_PROGRESS" ? v.resume : v.start}
          </ButtonLink>
        </section>
      ) : (
        available.length > 0 && (
          <EmptyState icon="award" title={v.allDone}>
            {v.allDoneBody}
          </EmptyState>
        )
      )}

      <div className="flex flex-col gap-10">
        <h2 className="sr-only">{v.route}</h2>
        {groups.map(({ g, items }) => (
          <section key={g} aria-labelledby={`group-${g}`} className="flex flex-col gap-5">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <h3 id={`group-${g}`} className="text-title-3 text-ink">
                {t.plan.groups[g]}
              </h3>
              <span className="font-mono text-mono text-ink-muted tabular-nums">{items.length}</span>
            </div>
            <ol className="flex flex-col" data-testid={`plan-${g}`}>
              {items.map((i, idx) => {
                const status = statusOf.get(i.moduleId);
                const current = next?.moduleId === i.moduleId;
                const last = idx === items.length - 1;
                return (
                  <li key={i.moduleId} aria-current={current ? "step" : undefined} className={cx("relative flex gap-4", !last && "pb-6")}>
                    {!last && <span aria-hidden="true" className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-line" />}
                    <Marker n={numberOf.get(i.moduleId) ?? idx + 1} status={status} current={current} />
                    <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <p className={cx("text-body", status ? "text-ink" : "text-ink-muted", current && "font-semibold")}>{i.title}</p>
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-mono text-ink-muted tabular-nums">{format(t.result.minutes, { minutes: num(i.minutes) })}</span>
                          <StatusBadge status={status} />
                          {current && (
                            <Badge tone="accent" icon="target">
                              {v.youAreHere}
                            </Badge>
                          )}
                          {i.skippable && <Badge tone="neutral">{t.result.skippable}</Badge>}
                        </p>
                      </div>
                      {status && (
                        <TextLink href={`/modul/${i.moduleId}`} className="shrink-0 text-label sm:pt-0.5">
                          {t.plan.open}
                        </TextLink>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <p className="border-t border-line pt-6 text-body-sm text-ink-muted">
        <TextLink href="/niveautest">{t.result.retake}</TextLink>
      </p>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Page title={getMessages().placement.plan.title} lead={getMessages().player.planView.lead}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
