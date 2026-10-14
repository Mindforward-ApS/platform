import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { OrgMonthlyStatus } from "@/components/monthly/org-monthly-status";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";

// M8: monthly package status per employee (status only, never prompt texts). M7 can mount the same component
// on its /virksomhed dashboard; this page keeps it reachable until then.
async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(ADMIN_ROLES), "/virksomhed/maanedspakke");
  return (
    <div className="rounded-lg border border-line bg-surface p-6">
      <OrgMonthlyStatus organizationId={ctx.membership.organizationId} />
    </div>
  );
}

export default function MonthlyStatusPage() {
  return (
    <AdminShell title={getMessages().monthly.orgStatus.pageTitle}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
