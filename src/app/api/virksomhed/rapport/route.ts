import { NextResponse } from "next/server";
import { isoDay } from "@/lib/format-date";
import { serverEnv } from "@/lib/env";
import { assertBusinessOrg } from "@/server/admin/context";
import { writeAudit } from "@/server/audit/log";
import { AuthzError, requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { db } from "@/server/db";
import { requestReportJob } from "@/server/jobs/org-admin";
import { reportFormSchema, reportPeriod } from "@/server/reports/params";
import { reportPdf } from "@/server/reports/pdf";
import { buildReportDocument, reportCsv } from "@/server/reports/render";
import { countReportEmployees, loadReportData, REPORT_INLINE_MAX_EMPLOYEES, ReportNotesError } from "@/server/reports/report";

// V7 export (CSV + PDF). POST (form) so the company's notes never travel in a URL. Org-scoped to the admin's
// active organization; > REPORT_INLINE_MAX_EMPLOYEES employees → Inngest job that mails the files.

export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await requireActiveMembership(ADMIN_ROLES);
    await assertBusinessOrg(ctx.membership.organizationId);
  } catch (err) {
    if (err instanceof AuthzError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
  const orgId = ctx.membership.organizationId;
  const parsed = reportFormSchema.safeParse(Object.fromEntries(await request.formData()));
  const back = (q: string) => NextResponse.redirect(new URL(`/virksomhed/rapport?${q}`, serverEnv().APP_URL), 303);
  if (!parsed.success) return back("fejl=input");
  const form = parsed.data;
  const org = await db().organization.findUniqueOrThrow({ where: { id: orgId }, select: { createdAt: true } });
  const period = reportPeriod(form, org.createdAt);
  const filter = { trackId: form.trackId, jobRole: form.jobRole };

  try {
    if ((await countReportEmployees(db(), orgId, filter)) > REPORT_INLINE_MAX_EMPLOYEES) {
      await requestReportJob({ organizationId: orgId, requestedByUserId: ctx.user.id, from: period.from.toISOString(), to: period.to.toISOString(), ...filter, notes: form.notes ?? null });
      return back("ko=1");
    }
    const data = await loadReportData(db(), { organizationId: orgId, ...period, filter, notes: form.notes ?? null });
    const doc = buildReportDocument(data);
    await writeAudit(db(), { action: "REPORT_GENERATED", actorUserId: ctx.user.id, organizationId: orgId, targetType: "organization", targetId: orgId, metadata: { mode: "inline", format: form.format, employees: data.employees.length } });
    const name = `mindforward-rapport-${isoDay(period.from)}-${isoDay(period.to)}`;
    if (form.format === "pdf") {
      const pdf = await reportPdf(doc);
      return new Response(new Uint8Array(pdf), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"`, "cache-control": "no-store" } });
    }
    return new Response(reportCsv(doc), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"`, "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof ReportNotesError) return back("fejl=noter");
    throw err;
  }
}
