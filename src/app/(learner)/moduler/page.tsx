import { Suspense } from "react";
import { Page } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { listModulesForLearner } from "@/server/modules/catalog";
import { playableOptions } from "@/server/modules/deps";

async function Content() {
  const t = getMessages().player.list;
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/moduler");
  const modules = await listModulesForLearner(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, playableOptions());
  if (modules.length === 0) return <p>{t.empty}</p>;
  return (
    <ul className="flex flex-col gap-3" data-testid="module-list">
      {modules.map((m) => (
        <li key={m.slug} className="flex flex-col gap-1 rounded-md border border-border p-3">
          <h2 className="font-semibold">{m.title}</h2>
          <p className="text-sm">{m.summary}</p>
          <p className="text-sm text-muted">
            {t.level[m.level as 1 | 2 | 3] ?? ""} · {format(t.minutes, { minutes: m.minutes })} · {t.status[m.status]}
            {m.bestScorePct !== null && ` · ${format(t.best, { pct: Math.round(m.bestScorePct) })}`}
          </p>
          <a className="underline" href={`/modul/${m.slug}`}>
            {t.open}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default function ModulesPage() {
  const t = getMessages().player.list;
  return (
    <Page title={t.title}>
      <p>{t.intro}</p>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
