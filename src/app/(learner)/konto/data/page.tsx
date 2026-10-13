import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { Page } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { employeeDetail } from "@/server/admin/queries";
import { requireUser } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { requestDeletion } from "./actions";

// L10 Mine data: exactly what the admin sees (same query module as the admin screens), export, delete account.

async function Content() {
  const ctx = await guardPage(() => requireUser(), "/konto/data");
  const t = getMessages().orgAdmin;
  const orgId = ctx.session.activeOrganizationId;
  const org = orgId ? await db().organization.findUnique({ where: { id: orgId }, select: { name: true, type: true } }) : null;
  const detail = org?.type === "BUSINESS" && orgId ? await employeeDetail(db(), orgId, { userId: ctx.user.id }) : null;
  return (
    <>
      <section className="flex flex-col gap-2" data-testid="admin-sees">
        {detail && org ? (
          <>
            <h2 className="font-semibold">{format(t.myData.adminSeesTitle, { organization: org.name })}</h2>
            <dl className="grid grid-cols-2 gap-1 text-sm">
              <dt>{t.members.columns.name}</dt>
              <dd>{detail.row.name} · {detail.row.email}</dd>
              <dt>{t.members.columns.role}</dt>
              <dd>{t.roles[detail.row.role]}</dd>
              <dt>{t.members.columns.jobRole}</dt>
              <dd>{detail.row.jobRole ? t.jobRoles[detail.row.jobRole] : t.members.none}</dd>
              <dt>{t.members.columns.track}</dt>
              <dd>{detail.row.tracks.map((x) => x.name).join(", ") || t.members.none}</dd>
              <dt>{t.members.columns.status}</dt>
              <dd>{t.members.status[detail.row.status]}</dd>
              <dt>{t.members.columns.score}</dt>
              <dd>{detail.row.avgBestScorePct === null ? t.members.none : `${detail.row.avgBestScorePct} %`}</dd>
              <dt>{t.members.columns.lastActivity}</dt>
              <dd>{formatDateDa(detail.row.lastActivityAt) || t.members.none}</dd>
            </dl>
            <ul className="text-sm">
              {detail.modules.map((m) => (
                <li key={m.slug}>
                  {m.title} · {t.detail.assignmentStatus[m.status as keyof typeof t.detail.assignmentStatus] ?? m.status}
                  {m.bestScorePct !== null ? ` · ${m.bestScorePct} %` : ""}
                  {m.passedAt ? ` · ${formatDateDa(m.passedAt)}` : ""}
                </li>
              ))}
              {detail.row.certificates.map((c) => (
                <li key={`${c.trackName}-${c.level}`}>
                  {t.members.columns.certificates}: {c.trackName} · {c.levelLabel} · {formatDateDa(c.issuedAt)}
                </li>
              ))}
            </ul>
            <p className="text-sm">{t.firstLogin.cannotSeeTitle}: {t.firstLogin.cannotSee.join(" · ")}</p>
          </>
        ) : (
          <p>{t.myData.noAdmin}</p>
        )}
        <p className="text-sm">{t.myData.promptRetention}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.myData.exportTitle}</h2>
        <p className="text-sm">{t.myData.exportBody}</p>
        <a className="underline" href="/api/me/export" download>
          {t.myData.exportButton}
        </a>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">{t.myData.deleteTitle}</h2>
        <p className="text-sm">{t.myData.deleteBody}</p>
        <ActionForm action={requestDeletion}>
          <SubmitButton variant="secondary">{t.myData.deleteButton}</SubmitButton>
        </ActionForm>
      </section>
    </>
  );
}

export default function MyDataPage() {
  return (
    <Page title={getMessages().orgAdmin.myData.title}>
      <Suspense>
        <Content />
      </Suspense>
    </Page>
  );
}
