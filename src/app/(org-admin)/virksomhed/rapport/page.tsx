import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { Field, Notice } from "@/components/ui/primitives";
import { isoDay } from "@/lib/format-date";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { buildReportDocument } from "@/server/reports/render";
import { loadReportData } from "@/server/reports/report";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveAiPolicyUrl } from "./actions";

// V7 Rapport: "Dokumentation af AI-kompetencetiltag" — period, filters, own notes, CSV + PDF export, preview.

const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;
const select = "rounded-md border border-border bg-bg px-2 py-1";

async function Content({ searchParams }: { searchParams: Promise<{ fejl?: string; ko?: string }> }) {
  const ctx = await guardPage(async () => {
    const c = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(c.membership.organizationId);
    return c;
  }, "/virksomhed/rapport");
  const sp = await searchParams;
  const t = getMessages().orgAdmin.report;
  const orgId = ctx.membership.organizationId;
  const now = new Date();
  const [org, tracks] = await Promise.all([
    db().organization.findUniqueOrThrow({ where: { id: orgId }, select: { createdAt: true, aiPolicyUrl: true } }),
    db().track.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, displayName: true } }),
  ]);
  const preview = buildReportDocument(await loadReportData(db(), { organizationId: orgId, from: org.createdAt, to: now }, now));

  return (
    <>
      {sp.fejl === "noter" && <Notice tone="error">{getMessages().orgAdmin.errors.reportNotesBanned}</Notice>}
      {sp.fejl === "input" && <Notice tone="error">{t.inputError}</Notice>}
      {sp.ko && <Notice>{t.queued}</Notice>}

      <Section title={t.exportTitle}>
        <form method="post" action="/api/virksomhed/rapport" className="flex flex-col gap-3" data-testid="report-form">
          <div className="flex flex-wrap gap-2">
            <Field label={t.from} name="from" type="date" defaultValue={isoDay(org.createdAt)} />
            <Field label={t.to} name="to" type="date" defaultValue={isoDay(now)} />
            <label className="flex flex-col gap-1 text-sm">
              {t.track}
              <select name="trackId" defaultValue="" className={select}>
                <option value="">{t.all}</option>
                {tracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t.jobRole}
              <select name="jobRole" defaultValue="" className={select}>
                <option value="">{t.all}</option>
                {JOB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {getMessages().orgAdmin.jobRoles[r]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm">{t.notes}</span>
            <textarea name="notes" rows={3} maxLength={4000} className="rounded-md border border-border bg-bg px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="submit" name="format" value="csv" className="rounded-md bg-accent px-4 py-2 text-accent-fg">
              {t.csv}
            </button>
            <button type="submit" name="format" value="pdf" className="rounded-md border border-border bg-surface px-4 py-2">
              {t.pdf}
            </button>
          </div>
        </form>
      </Section>

      <Section title={t.aiPolicyTitle}>
        <ActionForm action={saveAiPolicyUrl}>
          <Field label={t.policyUrl} name="aiPolicyUrl" type="url" defaultValue={org.aiPolicyUrl ?? ""} maxLength={500} />
          <SubmitButton variant="secondary">{t.policySave}</SubmitButton>
        </ActionForm>
      </Section>

      <Section title={t.preview} testId="report-preview">
        <p className="text-sm">{t.previewNote}</p>
        {preview.watermark && <p className="font-semibold">{preview.watermark}</p>}
        <h3 className="text-lg font-semibold">{preview.title}</h3>
        <p>{preview.subtitle}</p>
        <p className="text-sm">{preview.intro}</p>
        <ul className="text-sm">
          {[...preview.meta, ...preview.summary].map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {preview.header.map((h) => (
                  <th key={h} className="pr-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row[1]}>
                  {row.map((cell, i) => (
                    <td key={i} className="pr-3 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

export default function ReportPage(props: PageProps<"/virksomhed/rapport">) {
  return (
    <AdminShell title={getMessages().orgAdmin.report.title}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; ko?: string }>} />
      </Suspense>
    </AdminShell>
  );
}
