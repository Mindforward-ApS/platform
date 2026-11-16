import { Suspense, type ReactNode } from "react";
import { LiveRefresh } from "@/components/admin/live-refresh";
import { ownerDashboard } from "@/lib/config/owner-dashboard";
import { format, getMessages } from "@/lib/i18n";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import type { CustomerStatus } from "@/server/owner/customer-metrics";
import { customerOverview } from "@/server/owner/customers";

// Owner customer overview — layout direction "A: kontrolrum" chosen by Marco 16 Nov 2026: KPIs on top, every
// customer in one list. GREB_ADMIN + TOTP only. Neutral placeholder tokens (final look comes with the design pass).
// Live: <LiveRefresh> re-renders this page every `refreshSeconds` while it is open; the data is read fresh each time.

const krFormat = new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK", maximumFractionDigits: 0 });
const kr = (ore: number) => krFormat.format(Math.round(ore / 100));
const clock = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Copenhagen" });

type Tone = "success" | "accent" | "warning" | "danger" | "muted";

const PILL: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  accent: "bg-accent/10 text-accent",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-surface text-muted",
};
const FILL: Record<Tone, string> = {
  success: "bg-success",
  accent: "bg-accent",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-muted",
};

const STATUS_TONE: Record<CustomerStatus["kind"], Tone> = {
  ACTIVE: "success",
  ONBOARDING: "accent",
  TRIAL: "accent",
  NO_SUBSCRIPTION: "warning",
  CANCELING: "warning",
  INACTIVE: "danger",
  PAYMENT_ISSUE: "danger",
  CANCELED: "muted",
};

function completionTone(pct: number | null): Tone {
  if (pct === null) return "muted";
  if (pct >= 60) return "success";
  if (pct >= 30) return "accent";
  if (pct >= 10) return "warning";
  return "danger";
}

function statusLabel(status: CustomerStatus): string {
  const t = getMessages().ownerCustomers.status;
  if (status.kind === "INACTIVE") return status.days === null ? t.INACTIVE_NEVER : format(t.INACTIVE, { days: status.days });
  return t[status.kind];
}

function Bar({ pct, tone, label }: { pct: number; tone: Tone; label: string }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-border"
      role="progressbar"
      aria-valuenow={width}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={`h-full ${FILL[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  testId,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  testId: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-md bg-surface p-4" data-testid={testId}>
      <p className="text-sm text-muted">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      {children}
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-sm px-2 py-0.5 text-xs ${PILL[tone]}`}>{children}</span>;
}

function CompletionCell({ pct, label }: { pct: number | null; label: string }) {
  const t = getMessages().ownerCustomers;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 sm:w-32">
        <Bar pct={pct ?? 0} tone={completionTone(pct)} label={label} />
      </div>
      <span className="tabular-nums text-muted">{pct === null ? t.none : `${pct} %`}</span>
    </div>
  );
}

async function Content() {
  await guardPage(() => requirePlatformAdmin(), "/admin/kunder");
  const t = getMessages().ownerCustomers;
  const o = await customerOverview(db());
  const { totals, companies, privateCustomers } = o;
  const hasCustomers = companies.length > 0 || privateCustomers.count > 0;
  const th = "py-2 pr-4 font-normal";

  return (
    <>
      <LiveRefresh
        seconds={ownerDashboard.refreshSeconds}
        label={format(t.live, { time: clock.format(o.generatedAt) })}
        hint={format(t.liveHint, { seconds: ownerDashboard.refreshSeconds })}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label={t.title}>
        <Kpi
          label={t.kpi.arr}
          value={kr(totals.arrOre)}
          sub={format(t.kpi.arrGoal, { pct: totals.goalPct, goal: kr(totals.goalOre) })}
          testId="kpi-arr"
        >
          <Bar pct={totals.goalPct} tone="accent" label={t.kpi.arr} />
        </Kpi>
        <Kpi label={t.kpi.mrr} value={kr(totals.mrrOre)} sub={format(t.kpi.seats, { count: totals.paidSeats })} testId="kpi-mrr" />
        <Kpi
          label={t.kpi.companies}
          value={String(totals.companies)}
          sub={format(t.kpi.privateCustomers, { count: totals.privateCustomers })}
          testId="kpi-companies"
        />
        <Kpi
          label={t.kpi.completion}
          value={totals.completionPct === null ? t.none : `${totals.completionPct} %`}
          sub={t.kpi.completionHint}
          testId="kpi-completion"
        />
      </section>

      {hasCustomers ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm" data-testid="customer-table">
            <caption className="sr-only">{t.table.caption}</caption>
            <thead className="text-muted">
              <tr>
                <th scope="col" className={th}>
                  {t.table.company}
                </th>
                <th scope="col" className={th}>
                  {t.table.seats}
                </th>
                <th scope="col" className={th}>
                  {t.table.completion}
                </th>
                <th scope="col" className={`${th} text-right`}>
                  {t.table.mrr}
                </th>
                <th scope="col" className="py-2 font-normal">
                  {t.table.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.organizationId} className="border-t border-border" data-testid="customer-row">
                  <td className="py-3 pr-4">
                    <span className="font-medium">{c.name}</span> <span className="text-muted">· {c.country}</span>
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{format(t.table.seatsValue, { active: c.activeMembers, limit: c.seatLimit })}</td>
                  <td className="py-3 pr-4">
                    <CompletionCell pct={c.completionPct} label={`${t.table.completion}: ${c.name}`} />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{kr(c.mrrOre)}</td>
                  <td className="py-3">
                    <Pill tone={STATUS_TONE[c.status.kind]}>{statusLabel(c.status)}</Pill>
                  </td>
                </tr>
              ))}
              {privateCustomers.count > 0 ? (
                <tr className="border-t border-border" data-testid="private-customers-row">
                  <td className="py-3 pr-4 font-medium">{format(t.table.privateRow, { count: privateCustomers.count })}</td>
                  <td className="py-3 pr-4 tabular-nums">{privateCustomers.activeMembers}</td>
                  <td className="py-3 pr-4">
                    <CompletionCell
                      pct={privateCustomers.completionPct}
                      label={`${t.table.completion}: ${format(t.table.privateRow, { count: privateCustomers.count })}`}
                    />
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">{kr(privateCustomers.mrrOre)}</td>
                  <td className="py-3">
                    {privateCustomers.paymentIssues > 0 ? (
                      <Pill tone="danger">{format(t.table.privatePaymentIssues, { count: privateCustomers.paymentIssues })}</Pill>
                    ) : (
                      <Pill tone="success">{t.table.privateOk}</Pill>
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted" data-testid="customers-empty">
          {t.empty}
        </p>
      )}
    </>
  );
}

export default function CustomersPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{getMessages().ownerCustomers.title}</h1>
      <Suspense>
        <Content />
      </Suspense>
    </main>
  );
}
