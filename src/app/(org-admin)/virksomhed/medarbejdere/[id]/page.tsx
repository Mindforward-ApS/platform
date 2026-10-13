import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { employeeDetail } from "@/server/admin/queries";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";

// V4: one employee's progress — modules (status, best score, date) and certificates. No answers, no prompts.

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, `/virksomhed/medarbejdere/${id}`);
  const detail = await employeeDetail(db(), ctx.membership.organizationId, { memberId: id });
  if (!detail) notFound();
  const t = getMessages().orgAdmin;
  const { row, modules } = detail;
  return (
    <>
      <h2 className="text-xl font-semibold">{format(t.detail.title, { name: row.name || row.email })}</h2>
      <p className="text-sm">{t.detail.privacyNote}</p>
      <Section title={t.detail.modules} testId="employee-modules">
        {modules.length === 0 ? (
          <p>{t.detail.noModules}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>{t.detail.module}</th>
                <th>{t.detail.status}</th>
                <th>{t.detail.bestScore}</th>
                <th>{t.detail.passedAt}</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.slug}>
                  <td>{m.title}</td>
                  <td>{t.detail.assignmentStatus[m.status as keyof typeof t.detail.assignmentStatus] ?? m.status}</td>
                  <td>{m.bestScorePct === null ? t.members.none : `${m.bestScorePct} %`}</td>
                  <td>{formatDateDa(m.passedAt) || t.members.none}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
      <Section title={t.detail.certificates}>
        <ul>
          {row.certificates.length === 0 && <li>{t.members.none}</li>}
          {row.certificates.map((c) => (
            <li key={`${c.trackName}-${c.level}`}>
              {c.trackName} · {c.levelLabel} · {formatDateDa(c.issuedAt)}
            </li>
          ))}
        </ul>
      </Section>
      <a className="underline" href="/virksomhed/medarbejdere">
        {t.detail.back}
      </a>
    </>
  );
}

export default function EmployeeDetailPage(props: PageProps<"/virksomhed/medarbejdere/[id]">) {
  return (
    <AdminShell title={getMessages().orgAdmin.members.title}>
      <Suspense>
        <Content params={props.params} />
      </Suspense>
    </AdminShell>
  );
}
