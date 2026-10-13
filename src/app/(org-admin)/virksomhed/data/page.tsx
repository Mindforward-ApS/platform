import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { Field } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { eraseEmployeeData } from "./actions";

// /virksomhed/data (§ 10a): export the org's training data and delete an employee's data, as the controller's
// instruction to Mindforward (processor). Exports go through the same allow-listed report data (no free text).

async function Content() {
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, "/virksomhed/data");
  const t = getMessages().orgAdmin.orgData;
  const members = await db().membership.findMany({
    where: { organizationId: ctx.membership.organizationId, role: { not: "OWNER" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, user: { select: { name: true, email: true } } },
  });
  return (
    <>
      <p>{t.intro}</p>
      <p className="text-sm">{t.retention}</p>
      <Section title={t.exportTitle}>
        <form method="post" action="/api/virksomhed/rapport">
          <input type="hidden" name="format" value="csv" />
          <button type="submit" className="rounded-md bg-accent px-4 py-2 text-accent-fg">
            {t.exportButton}
          </button>
        </form>
      </Section>
      <Section title={t.deleteTitle}>
        <p className="text-sm">{t.deleteBody}</p>
        <ActionForm action={eraseEmployeeData} testId="erase-form">
          <label className="flex flex-col gap-1 text-sm">
            {t.deleteLabel}
            <select name="memberId" required className="rounded-md border border-border bg-bg px-2 py-1">
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name} · {m.user.email}
                </option>
              ))}
            </select>
          </label>
          <Field label={t.deleteConfirm} name="confirm" required autoComplete="off" />
          <SubmitButton variant="secondary">{t.deleteButton}</SubmitButton>
        </ActionForm>
      </Section>
    </>
  );
}

export default function OrgDataPage() {
  return (
    <AdminShell title={getMessages().orgAdmin.orgData.title}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
