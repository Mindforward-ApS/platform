import { format, getMessages } from "@/lib/i18n";
import { requireOrgAdmin } from "@/server/auth/authz";
import { db } from "@/server/db";
import { monthRange } from "@/server/modules/monthly-clock";
import { orgMonthlyStatus } from "@/server/modules/monthly-queries";

// Self-contained server component for the customer admin dashboard (M7 mounts it on /virksomhed).
// Authorizes itself (OWNER/ADMIN of this org) and shows status per employee — never prompt texts or answers.

const monthFmt = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", month: "long", year: "numeric" });
const dateFmt = new Intl.DateTimeFormat("da-DK", { timeZone: "Europe/Copenhagen", day: "numeric", month: "short" });

export async function OrgMonthlyStatus({ organizationId, month }: { organizationId: string; month?: string }) {
  await requireOrgAdmin(organizationId);
  const t = getMessages().monthly.orgStatus;
  const status = await orgMonthlyStatus(db(), organizationId, { month });
  const label = monthFmt.format(monthRange(status.month).start);

  return (
    <section className="flex flex-col gap-2" data-testid="org-monthly-status">
      <h2 className="font-semibold">{format(t.heading, { month: label })}</h2>
      {status.total === 0 ? <p className="text-muted">{t.empty}</p> : <p>{format(t.summary, { done: status.done, total: status.total })}</p>}
      {status.rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th scope="col">{t.columns.name}</th>
              <th scope="col">{t.columns.status}</th>
              <th scope="col">{t.columns.modules}</th>
              <th scope="col">{t.columns.minutes}</th>
              <th scope="col">{t.columns.completedAt}</th>
            </tr>
          </thead>
          <tbody>
            {status.rows.map((r) => (
              <tr key={r.userId} className="border-t border-border" data-status={r.status}>
                <td>{r.name}</td>
                <td>{t.status[r.status]}</td>
                <td>{r.status === "NONE" ? "" : r.moduleCount}</td>
                <td>{r.status === "NONE" ? "" : format(t.minutes, { minutes: r.estimatedMinutes })}</td>
                <td>{r.completedAt ? dateFmt.format(r.completedAt) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-sm text-muted">{t.note}</p>
    </section>
  );
}
