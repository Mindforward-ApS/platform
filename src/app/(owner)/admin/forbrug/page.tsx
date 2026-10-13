import { Suspense } from "react";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { usageReport } from "@/server/ai/usage-report";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { formatDate } from "@/server/billing/time";
import { formatDkk } from "@/server/billing/vat";
import { db } from "@/server/db";

// Owner cost overview (docs/11 M10, docs/02 § 6). GREB_ADMIN + TOTP only. Neutral tables, aggregates only.

const kr = (dkk: number) => formatDkk(Math.round(dkk * 100));

async function Content() {
  await guardPage(() => requirePlatformAdmin(), "/admin/forbrug");
  const t = getMessages().support;
  const env = serverEnv();
  const r = await usageReport(db(), { limitDkk: env.AI_GLOBAL_MONTHLY_BUDGET_DKK, alertPct: env.AI_BUDGET_ALERT_PCT });
  const status =
    r.budget.level === "BLOCKED"
      ? t.admin.statusBlocked
      : r.budget.level === "DEGRADED"
        ? t.admin.statusDegraded
        : r.budget.level === "ALERT"
          ? format(t.admin.statusAlert, { date: r.alert80SentAt ? formatDate(r.alert80SentAt) : "—" })
          : t.admin.statusNormal;
  return (
    <div className="flex flex-col gap-6" data-testid="cost-overview">
      <dl className="grid grid-cols-2 gap-2">
        <dt>{t.admin.month}</dt>
        <dd>{r.budget.month}</dd>
        <dt>{t.admin.spent}</dt>
        <dd>{kr(r.budget.spentDkk)}</dd>
        <dt>{t.admin.limit}</dt>
        <dd>{kr(r.budget.limitDkk)}</dd>
        <dt>{t.admin.pct}</dt>
        <dd>{Math.floor(r.budget.pct * 100)} %</dd>
        <dt>{t.admin.status}</dt>
        <dd data-testid="budget-status">{status}</dd>
      </dl>
      <p className="text-sm text-muted">{format(t.admin.userCap, { cap: env.AI_USER_DAILY_TOKEN_CAP })}</p>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.admin.byFeature}</h2>
        {r.byFeature.length === 0 ? (
          <p className="text-muted">{t.admin.none}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>{t.admin.feature}</th>
                <th>{t.admin.calls}</th>
                <th>{t.admin.tokens}</th>
                <th>{t.admin.cost}</th>
              </tr>
            </thead>
            <tbody>
              {r.byFeature.map((f) => (
                <tr key={f.feature}>
                  <td>{t.features[f.feature]}</td>
                  <td>{f.calls}</td>
                  <td>{f.tokens}</td>
                  <td>{kr(f.costDkk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.admin.byDay}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>{t.admin.day}</th>
              <th>{t.admin.calls}</th>
              <th>{t.admin.cost}</th>
            </tr>
          </thead>
          <tbody>
            {r.byDay.map((d) => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td>{d.calls}</td>
                <td>{kr(d.costDkk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.admin.topUsers}</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>{t.admin.user}</th>
              <th>{t.admin.tokens}</th>
              <th>{t.admin.cost}</th>
            </tr>
          </thead>
          <tbody>
            {r.topUsersToday.map((u) => (
              <tr key={u.user}>
                <td>{u.user}</td>
                <td>{u.tokens}</td>
                <td>{kr(u.costDkk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{t.admin.blocked}</h2>
        {r.blocked.length === 0 ? <p className="text-muted">{t.admin.none}</p> : r.blocked.map((b) => <p key={b.status}>{format(t.admin.blockedLine, { status: b.status, count: b.count })}</p>)}
      </section>
      <p className="text-sm text-muted">{t.admin.marketing}</p>
    </div>
  );
}

export default function CostOverviewPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">{getMessages().support.admin.costTitle}</h1>
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}
