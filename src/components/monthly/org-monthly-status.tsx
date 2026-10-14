import { Icon } from "@/components/ui/icons";
import { Badge, Card, ProgressBar, Table, type Tone } from "@/components/ui/primitives";
import type { IconName } from "@/components/ui/icons";
import { format, getMessages } from "@/lib/i18n";
import { requireOrgAdmin } from "@/server/auth/authz";
import { db } from "@/server/db";
import { monthRange } from "@/server/modules/monthly-clock";
import { orgMonthlyStatus } from "@/server/modules/monthly-queries";

// Self-contained server component for the customer admin dashboard (M7 mounts it on /virksomhed).
// Authorizes itself (OWNER/ADMIN of this org) and shows status per employee — never prompt texts or answers.

const monthFmt = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", month: "long", year: "numeric" });
const dateFmt = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", day: "numeric", month: "short" });

const statusLook: Record<"PENDING" | "IN_PROGRESS" | "COMPLETED" | "NONE", { tone: Tone; icon: IconName }> = {
  COMPLETED: { tone: "success", icon: "check" },
  IN_PROGRESS: { tone: "accent", icon: "clock" },
  PENDING: { tone: "neutral", icon: "dash" },
  NONE: { tone: "neutral", icon: "x" },
};

export async function OrgMonthlyStatus({ organizationId, month }: { organizationId: string; month?: string }) {
  await requireOrgAdmin(organizationId);
  const t = getMessages().monthly.orgStatus;
  const status = await orgMonthlyStatus(db(), organizationId, { month });
  const label = monthFmt.format(monthRange(status.month).start);

  return (
    <section className="flex flex-col gap-6" data-testid="org-monthly-status">
      <Card title={format(t.heading, { month: label })} description={t.description}>
        {status.total === 0 ? (
          <p className="text-body-sm text-ink-muted">{t.empty}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-body text-ink tabular-nums">{format(t.summary, { done: status.done, total: status.total })}</p>
            <ProgressBar value={status.done} max={status.total} tone="success" label={t.progressLabel} />
          </div>
        )}
      </Card>
      {status.rows.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <th scope="col">{t.columns.name}</th>
              <th scope="col">{t.columns.status}</th>
              <th scope="col" className="text-right">
                {t.columns.modules}
              </th>
              <th scope="col" className="text-right">
                {t.columns.minutes}
              </th>
              <th scope="col" className="text-right">
                {t.columns.completedAt}
              </th>
            </tr>
          </thead>
          <tbody>
            {status.rows.map((r) => (
              <tr key={r.userId} data-status={r.status}>
                <td className="font-medium">{r.name}</td>
                <td>
                  <Badge tone={statusLook[r.status].tone} icon={statusLook[r.status].icon}>
                    {t.status[r.status]}
                  </Badge>
                </td>
                <td className="text-right tabular-nums">{r.status === "NONE" ? "" : r.moduleCount}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{r.status === "NONE" ? "" : format(t.minutes, { minutes: r.estimatedMinutes })}</td>
                <td className="text-right whitespace-nowrap tabular-nums">{r.completedAt ? dateFmt.format(r.completedAt) : ""}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}
      <p className="flex items-start gap-2 text-body-sm text-ink-muted">
        <Icon name="lock" className="mt-0.5 shrink-0" />
        {t.note}
      </p>
    </section>
  );
}
