import { Suspense } from "react";
import { Icon } from "@/components/ui/icons";
import { Badge, EmptyState, Page, ProgressBar, Stat, Table, TextLink, type Tone } from "@/components/ui/primitives";
import { serverEnv } from "@/lib/env";
import { format, getMessages } from "@/lib/i18n";
import { usageReport } from "@/server/ai/usage-report";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { formatDate } from "@/server/billing/time";
import { formatDkk } from "@/server/billing/vat";
import { db } from "@/server/db";

// Owner cost overview (docs/11 M10, docs/02 § 6). GREB_ADMIN + TOTP only. Aggregates only.

const kr = (dkk: number) => formatDkk(Math.round(dkk * 100));
const num = (n: number) => new Intl.NumberFormat("da-DK").format(n);

function TableCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <h2 className="text-title-3 text-ink">{title}</h2>
      {children}
    </section>
  );
}

async function Content() {
  await guardPage(() => requirePlatformAdmin(), "/admin/forbrug");
  const t = getMessages().support;
  const env = serverEnv();
  const r = await usageReport(db(), { limitDkk: env.AI_GLOBAL_MONTHLY_BUDGET_DKK, alertPct: env.AI_BUDGET_ALERT_PCT });
  const level = r.budget.level;
  const status =
    level === "BLOCKED"
      ? t.admin.statusBlocked
      : level === "DEGRADED"
        ? t.admin.statusDegraded
        : level === "ALERT"
          ? format(t.admin.statusAlert, { date: r.alert80SentAt ? formatDate(r.alert80SentAt) : "—" })
          : t.admin.statusNormal;
  const statusLook: { tone: Tone; icon: "check" | "alert" | "x" } =
    level === "BLOCKED" ? { tone: "danger", icon: "x" } : level === "DEGRADED" || level === "ALERT" ? { tone: "hint", icon: "alert" } : { tone: "success", icon: "check" };
  const pct = Math.floor(r.budget.pct * 100);
  return (
    <div className="flex flex-col gap-10" data-testid="cost-overview">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-sm text-ink-muted">
            {t.admin.month} <span className="font-mono text-mono text-ink">{r.budget.month}</span>
          </p>
          <p className="flex items-center gap-2 text-body-sm text-ink-muted">
            {t.admin.status}
            <Badge tone={statusLook.tone} icon={statusLook.icon}>
              <span data-testid="budget-status">{status}</span>
            </Badge>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Stat label={t.admin.spent} value={<span className="normal-nums">{kr(r.budget.spentDkk)}</span>} icon="chart" />
          <Stat label={t.admin.limit} value={<span className="normal-nums">{kr(r.budget.limitDkk)}</span>} icon="target" />
          <div className="col-span-2 flex flex-col gap-2 rounded-lg border border-line bg-surface p-5 lg:col-span-1">
            <p className="text-label text-ink-muted">{t.admin.pct}</p>
            <p className="text-title-1 text-ink tabular-nums">{pct} %</p>
            <ProgressBar value={Math.min(pct, 100)} max={100} tone={level === "NORMAL" ? "accent" : "ink"} label={getMessages().admin.budgetUsed} />
          </div>
        </div>
        <p className="flex items-center gap-2 text-body-sm text-ink-muted">
          <Icon name="info" />
          {format(t.admin.userCap, { cap: num(env.AI_USER_DAILY_TOKEN_CAP) })}
        </p>
      </section>

      <TableCard title={t.admin.byFeature}>
        {r.byFeature.length === 0 ? (
          <EmptyState icon="chart" title={t.admin.none} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th scope="col">{t.admin.feature}</th>
                <th scope="col" className="text-right">
                  {t.admin.calls}
                </th>
                <th scope="col" className="text-right">
                  {t.admin.tokens}
                </th>
                <th scope="col" className="text-right">
                  {t.admin.cost}
                </th>
              </tr>
            </thead>
            <tbody>
              {r.byFeature.map((f) => (
                <tr key={f.feature}>
                  <td>{t.features[f.feature]}</td>
                  <td className="text-right tabular-nums">{num(f.calls)}</td>
                  <td className="text-right tabular-nums">{num(f.tokens)}</td>
                  <td className="text-right whitespace-nowrap">{kr(f.costDkk)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-6">
        <TableCard title={t.admin.byDay}>
          {r.byDay.length === 0 ? (
            <EmptyState icon="chart" title={t.admin.none} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th scope="col">{t.admin.day}</th>
                  <th scope="col" className="text-right">
                    {t.admin.calls}
                  </th>
                  <th scope="col" className="text-right">
                    {t.admin.cost}
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.byDay.map((d) => (
                  <tr key={d.day}>
                    <td className="font-mono text-mono">{d.day}</td>
                    <td className="text-right tabular-nums">{num(d.calls)}</td>
                    <td className="text-right whitespace-nowrap">{kr(d.costDkk)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </TableCard>

        <TableCard title={t.admin.topUsers}>
          {r.topUsersToday.length === 0 ? (
            <EmptyState icon="users" title={t.admin.none} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th scope="col">{t.admin.user}</th>
                  <th scope="col" className="text-right">
                    {t.admin.tokens}
                  </th>
                  <th scope="col" className="text-right">
                    {t.admin.cost}
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.topUsersToday.map((u) => (
                  <tr key={u.user}>
                    <td className="font-mono text-mono">{u.user}</td>
                    <td className="text-right tabular-nums">{num(u.tokens)}</td>
                    <td className="text-right whitespace-nowrap">{kr(u.costDkk)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </TableCard>
      </div>

      <TableCard title={t.admin.blocked}>
        {r.blocked.length === 0 ? (
          <p className="text-body-sm text-ink-muted">{t.admin.none}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-lg border border-line bg-surface">
            {r.blocked.map((b) => (
              <li key={b.status} className="flex items-center gap-2 px-4 py-3 text-body-sm text-ink">
                <Icon name="alert" className="text-danger" />
                {format(t.admin.blockedLine, { status: b.status, count: b.count })}
              </li>
            ))}
          </ul>
        )}
      </TableCard>

      <p className="flex items-start gap-2 border-t border-line pt-6 text-body-sm text-ink-muted">
        <Icon name="info" className="mt-0.5" />
        {t.admin.marketing}
      </p>
    </div>
  );
}

export default function CostOverviewPage() {
  const m = getMessages();
  return (
    <Page
      title={m.support.admin.costTitle}
      lead={m.admin.usageLead}
      width="app"
      eyebrow={
        <TextLink href="/admin" className="inline-flex items-center gap-1.5 normal-case tracking-normal">
          <Icon name="arrowLeft" />
          {m.contentEngine.admin.back}
        </TextLink>
      }
    >
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
