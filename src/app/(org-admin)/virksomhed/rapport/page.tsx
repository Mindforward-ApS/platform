import { Suspense } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { AdminShell, Section } from "@/components/admin/admin-shell";
import { splitLine } from "@/components/admin/admin-ui";
import { Icon } from "@/components/ui/icons";
import { Badge, Button, Field, Notice, Select, TextArea } from "@/components/ui/primitives";
import { isoDay } from "@/lib/format-date";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { buildReportDocument, type ReportDocument } from "@/server/reports/render";
import { loadReportData } from "@/server/reports/report";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveAiPolicyUrl } from "./actions";

// V7 Rapport: "Dokumentation af AI-kompetencetiltag" — period, filters, own notes, CSV + PDF export, preview.

const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;

/** The preview, laid out as the printed document: title block, meta, summary figures, employee table. */
function ReportPreview({ doc }: { doc: ReportDocument }) {
  const t = getMessages().orgAdmin.report;
  return (
    <article className="flex flex-col gap-8 rounded-card border border-line bg-surface px-6 py-8 sm:px-10 sm:py-12 print:border-0 print:p-0">
      <header className="flex flex-col gap-4 border-b border-line pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-overline text-ink-muted uppercase">{t.documentLabel}</p>
          {doc.watermark && (
            <Badge tone="hint" icon="clock">
              {doc.watermark}
            </Badge>
          )}
        </div>
        <h3 className="text-title-1 text-ink">{doc.title}</h3>
        <p className="text-body-lg text-ink">{doc.subtitle}</p>
        <p className="max-w-read text-body text-ink-muted">{doc.intro}</p>
      </header>

      <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {doc.meta.map((line) => {
          const [k, v] = splitLine(line);
          return (
            <div key={line} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-caption text-ink-muted">{k}</dt>
              <dd className="text-body break-words text-ink">{v}</dd>
            </div>
          );
        })}
      </dl>

      <section className="flex flex-col gap-3">
        <h4 className="text-title-3 text-ink">{t.summaryTitle}</h4>
        <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-line lg:grid-cols-4">
          {doc.summary.map((line, i) => {
            const [k, v] = splitLine(line);
            return (
              <div key={line} className={`flex flex-col justify-between gap-2 p-4 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}>
                <dt className="text-caption text-ink-muted">{k}</dt>
                <dd className="text-title-2 text-ink tabular-nums">{v}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      {doc.notes && (
        <section className="flex flex-col gap-2">
          <h4 className="text-title-3 text-ink">{t.notesTitle}</h4>
          <p className="text-body whitespace-pre-line text-ink">{doc.notes}</p>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h4 className="text-title-3 text-ink">{t.tableTitle}</h4>
        <div className="overflow-x-auto rounded-md border border-line print:overflow-visible">
          <table className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr>
                {doc.header.map((h) => (
                  <th key={h} scope="col" className="bg-sunken px-3 py-2.5 align-bottom text-caption font-semibold tracking-[0.02em] text-ink-muted">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.rows.map((row) => (
                <tr key={row[1]} className="border-t border-line">
                  {row.map((cell, i) => (
                    <td key={i} className={`px-3 py-3 align-top text-ink ${i === 5 || i === 6 ? "text-right tabular-nums" : ""} ${i === 0 ? "whitespace-nowrap" : i === 1 ? "break-all" : "min-w-24"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {doc.contentVersions.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-line pt-6">
          <h4 className="text-label text-ink-muted">{t.contentVersionsTitle}</h4>
          <p className="font-mono text-mono text-ink-muted">{doc.contentVersions.join(" · ")}</p>
        </section>
      )}
    </article>
  );
}

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
      {sp.ko && <Notice tone="success">{t.queued}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start print:hidden">
        <Section title={t.exportTitle} description={t.exportDescription}>
          <form method="post" action="/api/virksomhed/rapport" className="flex flex-col gap-5" data-testid="report-form">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.from} name="from" type="date" defaultValue={isoDay(org.createdAt)} />
              <Field label={t.to} name="to" type="date" defaultValue={isoDay(now)} />
              <Select label={t.track} name="trackId" defaultValue="">
                <option value="">{t.all}</option>
                {tracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.displayName}
                  </option>
                ))}
              </Select>
              <Select label={t.jobRole} name="jobRole" defaultValue="">
                <option value="">{t.all}</option>
                {JOB_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {getMessages().orgAdmin.jobRoles[r]}
                  </option>
                ))}
              </Select>
            </div>
            <TextArea label={t.notes} name="notes" rows={3} maxLength={4000} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" name="format" value="csv" icon="download">
                {t.csv}
              </Button>
              <Button type="submit" name="format" value="pdf" variant="secondary" icon="file">
                {t.pdf}
              </Button>
            </div>
          </form>
        </Section>

        <Section title={t.aiPolicyTitle} description={t.aiPolicyDescription}>
          <ActionForm action={saveAiPolicyUrl}>
            <Field label={t.policyUrl} name="aiPolicyUrl" type="url" defaultValue={org.aiPolicyUrl ?? ""} maxLength={500} />
            <div>
              <SubmitButton variant="secondary">{t.policySave}</SubmitButton>
            </div>
          </ActionForm>
        </Section>
      </div>

      <section className="flex flex-col gap-3" data-testid="report-preview">
        <div className="flex flex-col gap-1 print:hidden">
          <h2 className="text-title-3 text-ink">{t.preview}</h2>
          <p className="flex items-start gap-2 text-body-sm text-ink-muted">
            <Icon name="info" className="mt-0.5" />
            {t.previewNote}
          </p>
        </div>
        <ReportPreview doc={preview} />
      </section>
    </>
  );
}

export default function ReportPage(props: PageProps<"/virksomhed/rapport">) {
  const t = getMessages().orgAdmin.report;
  return (
    <AdminShell title={t.title} lead={t.lead}>
      <Suspense>
        <Content searchParams={props.searchParams as Promise<{ fejl?: string; ko?: string }>} />
      </Suspense>
    </AdminShell>
  );
}
