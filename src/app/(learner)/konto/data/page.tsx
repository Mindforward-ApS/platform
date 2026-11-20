import { Suspense } from "react";
import { DangerSubmitButton } from "@/components/account/danger-submit-button";
import { ActionForm } from "@/components/admin/action-form";
import { SupportLauncher } from "@/components/support/support-widget";
import { Icon } from "@/components/ui/icons";
import { Card, DescriptionList, Page, buttonClass } from "@/components/ui/primitives";
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
  const m = getMessages();
  const t = m.orgAdmin;
  const a = m.account.data;
  const orgId = ctx.session.activeOrganizationId;
  const org = orgId ? await db().organization.findUnique({ where: { id: orgId }, select: { name: true, type: true } }) : null;
  const detail = org?.type === "BUSINESS" && orgId ? await employeeDetail(db(), orgId, { userId: ctx.user.id }) : null;
  const none = <span className="text-ink-subtle">{t.members.none}</span>;
  return (
    <>
      <section data-testid="admin-sees" className="flex flex-col gap-6">
        {detail && org ? (
          <>
            <Card title={format(t.myData.adminSeesTitle, { organization: org.name })}>
              <DescriptionList
                items={[
                  [
                    t.members.columns.name,
                    <span key="name" className="break-words">
                      {detail.row.name} · {detail.row.email}
                    </span>,
                  ],
                  [t.members.columns.role, t.roles[detail.row.role]],
                  [t.members.columns.jobRole, detail.row.jobRole ? t.jobRoles[detail.row.jobRole] : none],
                  [t.members.columns.track, detail.row.tracks.map((x) => x.name).join(", ") || none],
                  [t.members.columns.status, t.members.status[detail.row.status]],
                  [
                    t.members.columns.score,
                    detail.row.avgBestScorePct === null ? none : <span key="score" className="tabular-nums">{`${detail.row.avgBestScorePct} %`}</span>,
                  ],
                  [t.members.columns.lastActivity, formatDateDa(detail.row.lastActivityAt) || none],
                ]}
              />
            </Card>

            {(detail.modules.length > 0 || detail.row.certificates.length > 0) && (
              <Card padded={false}>
                {detail.modules.length > 0 && (
                  <div>
                    <h3 className="border-b border-line bg-sunken px-6 py-2.5 text-caption font-semibold text-ink-muted">{a.modulesTitle}</h3>
                    <ul className="divide-y divide-line">
                      {detail.modules.map((mod) => (
                        <li key={mod.slug} className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <span className="text-body text-ink">{mod.title}</span>
                          <span className="flex flex-wrap items-center gap-x-3 text-body-sm text-ink-muted">
                            <span>{t.detail.assignmentStatus[mod.status as keyof typeof t.detail.assignmentStatus] ?? mod.status}</span>
                            {mod.bestScorePct !== null && <span>{`${mod.bestScorePct} %`}</span>}
                            {mod.passedAt && <span>{formatDateDa(mod.passedAt)}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.row.certificates.length > 0 && (
                  <div className={detail.modules.length > 0 ? "border-t border-line" : undefined}>
                    <h3 className="border-b border-line bg-sunken px-6 py-2.5 text-caption font-semibold text-ink-muted">{a.certificatesTitle}</h3>
                    <ul className="divide-y divide-line">
                      {detail.row.certificates.map((c) => (
                        <li key={`${c.trackName}-${c.level}`} className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                          <span className="text-body text-ink">
                            {t.members.columns.certificates}: {c.trackName} · {c.levelLabel}
                          </span>
                          <span className="text-body-sm text-ink-muted">{formatDateDa(c.issuedAt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            <Card title={t.firstLogin.cannotSeeTitle}>
              <ul className="flex flex-col gap-2.5">
                {t.firstLogin.cannotSee.map((line) => (
                  <li key={line} className="flex items-start gap-3 text-body text-ink">
                    <Icon name="lock" className="mt-1 shrink-0 text-ink-muted" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-3 border-t border-line pt-4 text-body-sm text-ink-muted">
                <Icon name="clock" className="mt-0.5 shrink-0" />
                {t.myData.promptRetention}
              </p>
            </Card>
          </>
        ) : (
          <Card title={a.visibilityTitle}>
            <p className="flex items-start gap-3 text-body text-ink">
              <Icon name="shield" className="mt-1 shrink-0 text-success" />
              {t.myData.noAdmin}
            </p>
            <p className="flex items-start gap-3 border-t border-line pt-4 text-body-sm text-ink-muted">
              <Icon name="clock" className="mt-0.5 shrink-0" />
              {t.myData.promptRetention}
            </p>
          </Card>
        )}
      </section>

      <Card
        title={t.myData.exportTitle}
        description={t.myData.exportBody}
        footer={
          <a className={buttonClass("secondary")} href="/api/me/export" download>
            <Icon name="download" />
            {t.myData.exportButton}
          </a>
        }
      />

      <Card
        title={t.myData.deleteTitle}
        description={t.myData.deleteBody}
        footer={
          <ActionForm action={requestDeletion} className="flex w-full flex-col items-end gap-3">
            <DangerSubmitButton icon="trash">{t.myData.deleteButton}</DangerSubmitButton>
          </ActionForm>
        }
      />
    </>
  );
}

export default function MyDataPage() {
  const m = getMessages();
  return (
    <Page title={m.orgAdmin.myData.title} lead={m.account.data.lead}>
      <Suspense>
        <Content />
      </Suspense>
      <SupportLauncher t={m.support.widget} />
    </Page>
  );
}
