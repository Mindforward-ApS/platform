import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { AdminSubmit } from "@/components/admin/danger-submit";
import { Button, Field, Notice, Select } from "@/components/ui/primitives";
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
      <Notice tone="info" icon="clock">
        {t.retention}
      </Notice>
      <Section title={t.exportTitle} description={t.exportBody}>
        <form method="post" action="/api/virksomhed/rapport">
          <input type="hidden" name="format" value="csv" />
          <Button type="submit" icon="download">
            {t.exportButton}
          </Button>
        </form>
      </Section>
      <Section title={t.deleteTitle} description={t.deleteBody}>
        <ActionForm action={eraseEmployeeData} testId="erase-form" className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t.deleteLabel} name="memberId" required>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user.name} · {m.user.email}
                </option>
              ))}
            </Select>
            <Field label={t.deleteConfirm} name="confirm" required autoComplete="off" className="font-mono" />
          </div>
          <div className="flex justify-end border-t border-line pt-5">
            <AdminSubmit icon="trash">{t.deleteButton}</AdminSubmit>
          </div>
        </ActionForm>
      </Section>
    </>
  );
}

export default function OrgDataPage() {
  const t = getMessages().orgAdmin.orgData;
  return (
    <AdminShell title={t.title} lead={t.intro}>
      <Suspense>
        <Content />
      </Suspense>
    </AdminShell>
  );
}
