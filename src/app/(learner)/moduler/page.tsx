import { Suspense } from "react";
import { ModuleCard } from "@/components/player/module-card";
import { ButtonLink, EmptyState, Page, ProgressBar } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { listModulesForLearner, type CatalogEntry } from "@/server/modules/catalog";
import { playableOptions } from "@/server/modules/deps";

const GRID = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 min-[1700px]:grid-cols-4";

async function Content() {
  const t = getMessages().player.list;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/moduler");
  const modules = await listModulesForLearner(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, playableOptions());
  if (modules.length === 0) {
    return (
      <EmptyState
        icon="grid"
        title={t.empty}
        action={
          <ButtonLink href="/plan" variant="secondary">
            {getMessages().shell.learner.plan}
          </ButtonLink>
        }
      >
        {t.emptyBody}
      </EmptyState>
    );
  }

  const numbered = modules.map((m, i) => ({ m, n: i + 1 }));
  const levels = [...new Set(modules.map((m) => m.level))].sort((a, b) => a - b);
  const passed = modules.filter((m) => m.status === "PASSED").length;
  const progress = format(t.passedCount, { passed, total: modules.length });
  const cards = (items: { m: CatalogEntry; n: number }[], testId?: string) => (
    <ul className={GRID} data-testid={testId}>
      {items.map(({ m, n }) => (
        <ModuleCard key={m.slug} entry={m} number={n} />
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <p className="flex items-center justify-between gap-4 text-body-sm text-ink-muted">
          <span>{progress}</span>
          <span className="font-mono text-mono tabular-nums">{format(getMessages().player.result.score, { pct: Math.round((passed / modules.length) * 100) })}</span>
        </p>
        <ProgressBar value={passed} max={modules.length} tone="success" label={progress} />
      </div>
      {levels.length <= 1 ? (
        cards(numbered, "module-list")
      ) : (
        <div className="flex flex-col gap-12" data-testid="module-list">
          {levels.map((level) => {
            const items = numbered.filter(({ m }) => m.level === level);
            return (
              <section key={level} aria-labelledby={`level-${level}`} className="flex flex-col gap-4">
                <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
                  <h2 id={`level-${level}`} className="text-title-3 text-ink">
                    {t.level[level as 1 | 2 | 3] ?? level}
                  </h2>
                  <span className="font-mono text-mono text-ink-muted tabular-nums">{format(t.groupCount, { count: items.length })}</span>
                </div>
                {cards(items)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ModulesPage() {
  const t = getMessages().player.list;
  return (
    <Page title={t.title} lead={t.intro} width="app">
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
