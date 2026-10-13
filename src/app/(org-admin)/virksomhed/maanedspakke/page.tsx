import { Suspense } from "react";
import { OrgMonthlyStatus } from "@/components/monthly/org-monthly-status";
import { Page } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";

// M8: monthly package status per employee (status only, never prompt texts). M7 can mount the same component
// on its /virksomhed dashboard; this page keeps it reachable until then.
async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(ADMIN_ROLES), "/virksomhed/maanedspakke");
  return <OrgMonthlyStatus organizationId={ctx.membership.organizationId} />;
}

export default function MonthlyStatusPage() {
  return (
    <Page title={getMessages().monthly.orgStatus.pageTitle}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
