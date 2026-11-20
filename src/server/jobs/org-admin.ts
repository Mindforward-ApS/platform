import "server-only";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/env";
import { formatDateDa, isoDay } from "@/lib/format-date";
import { checkAndIssueCertificates } from "@/server/certificates/service";
import { db } from "@/server/db";
import { sendServiceEmail } from "@/server/email/send";
import { eraseUser } from "@/server/gdpr/service";
import { logger } from "@/server/observability/logger";
import { reportPdf } from "@/server/reports/pdf";
import { loadReportData } from "@/server/reports/report";
import { buildReportDocument, reportCsv } from "@/server/reports/render";
import { writeAudit } from "@/server/audit/log";
import { inngest } from "./client";

// M7 jobs: certificate/check, gdpr/erase-user, report/generate. With JOBS_INLINE=1 (tests/e2e, no Inngest
// Dev Server) the bodies run in-process; otherwise an Inngest event is sent. Every body is idempotent.

export const CERTIFICATE_CHECK = "certificate/check";
export const GDPR_ERASE_USER = "gdpr/erase-user";
export const REPORT_GENERATE = "report/generate";

const certificateCheckData = z.object({ userId: z.string().min(1), organizationId: z.string().min(1) });
const eraseData = z.object({ userId: z.string().min(1) });
const reportData = z.object({
  organizationId: z.string().min(1),
  requestedByUserId: z.string().min(1),
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  trackId: z.string().optional(),
  jobRole: z.enum(["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"]).optional(),
  notes: z.string().max(4000).nullable().optional(),
});

// ── Bodies ────────────────────────────────────────────────────────────────

export async function runCertificateCheck(client: PrismaClient, data: z.infer<typeof certificateCheckData>) {
  const appUrl = serverEnv().APP_URL;
  const issued = await checkAndIssueCertificates(client, data, {
    onIssued: async (cert) => {
      const [user, track] = await Promise.all([
        client.user.findUniqueOrThrow({ where: { id: cert.userId }, select: { email: true } }),
        client.track.findUniqueOrThrow({ where: { id: cert.trackId }, select: { displayName: true } }),
      ]);
      await sendServiceEmail(client, {
        template: "certificate-issued",
        to: user.email,
        vars: { url: `${appUrl}/certifikater`, trackName: track.displayName, levelLabel: cert.levelLabel },
        idempotencyKey: `certificate-issued:${cert.id}`,
        userId: cert.userId,
        organizationId: cert.organizationId,
      });
    },
  });
  return { issued: issued.map((c) => c.id) };
}

export async function runReportGenerate(client: PrismaClient, raw: z.infer<typeof reportData>) {
  const data = await loadReportData(client, {
    organizationId: raw.organizationId,
    from: new Date(raw.from),
    to: new Date(raw.to),
    filter: { trackId: raw.trackId, jobRole: raw.jobRole },
    notes: raw.notes ?? null,
  });
  const doc = buildReportDocument(data);
  const [csv, pdf] = [reportCsv(doc), await reportPdf(doc)];
  const requester = await client.user.findUniqueOrThrow({ where: { id: raw.requestedByUserId }, select: { email: true } });
  const name = `mindforward-rapport-${isoDay(data.period.from)}-${isoDay(data.period.to)}`;
  await sendServiceEmail(client, {
    template: "report-ready",
    to: requester.email,
    vars: { url: `${serverEnv().APP_URL}/virksomhed/rapport`, organizationName: data.organization.name, from: formatDateDa(data.period.from), to: formatDateDa(data.period.to) },
    idempotencyKey: `report:${raw.organizationId}:${raw.requestedByUserId}:${raw.from}:${raw.to}:${Date.now()}`,
    userId: raw.requestedByUserId,
    organizationId: raw.organizationId,
    attachments: [
      { filename: `${name}.csv`, contentBase64: Buffer.from(csv, "utf8").toString("base64") },
      { filename: `${name}.pdf`, contentBase64: pdf.toString("base64") },
    ],
  });
  await writeAudit(client, { action: "REPORT_GENERATED", actorUserId: raw.requestedByUserId, organizationId: raw.organizationId, targetType: "organization", targetId: raw.organizationId, metadata: { mode: "job", employees: data.employees.length } });
  return { employees: data.employees.length };
}

// ── Dispatch ──────────────────────────────────────────────────────────────

async function dispatch(name: string, id: string, data: Record<string, unknown>, inline: () => Promise<unknown>): Promise<void> {
  if (serverEnv().JOBS_INLINE) {
    await inline();
    return;
  }
  await inngest.send({ name, id, data });
}

/** After a passed attempt (deduplicated per attempt; the check itself is idempotent). */
export async function requestCertificateCheck(args: { userId: string; organizationId: string; attemptId: string }): Promise<void> {
  const data = { userId: args.userId, organizationId: args.organizationId };
  try {
    await dispatch(CERTIFICATE_CHECK, `certificate-check-${args.attemptId}`, data, () => runCertificateCheck(db(), data));
  } catch (err) {
    // Never fail the learner's "finish" because of the certificate side effect; the next pass retries.
    logger.error("certificate.check_dispatch_failed", { err });
  }
}

export async function requestUserErase(userId: string): Promise<void> {
  await dispatch(GDPR_ERASE_USER, `gdpr-erase-${userId}`, { userId }, () => eraseUser(db(), userId));
}

export async function requestReportJob(data: z.infer<typeof reportData>): Promise<void> {
  const parsed = reportData.parse(data);
  await dispatch(REPORT_GENERATE, `report-${parsed.organizationId}-${Date.now()}`, parsed, () => runReportGenerate(db(), parsed));
}

// ── Inngest functions ─────────────────────────────────────────────────────

export const certificateCheckJob = inngest.createFunction(
  { id: "certificate.check", retries: 5, concurrency: { key: "event.data.userId", limit: 1 }, triggers: { event: CERTIFICATE_CHECK } },
  async ({ event, step }) => {
    const data = certificateCheckData.parse(event.data);
    return step.run("check-and-issue", () => runCertificateCheck(db(), data));
  },
);

export const gdprEraseUserJob = inngest.createFunction(
  { id: "gdpr.erase-user", retries: 5, idempotency: "event.data.userId", triggers: { event: GDPR_ERASE_USER } },
  async ({ event, step }) => {
    const { userId } = eraseData.parse(event.data);
    const result = await step.run("erase", () => eraseUser(db(), userId));
    logger.info("gdpr.erase_user", { erased: result.erased, reason: result.reason ?? null });
    return result;
  },
);

export const reportGenerateJob = inngest.createFunction(
  { id: "report.generate", retries: 3, concurrency: { key: "event.data.organizationId", limit: 1 }, triggers: { event: REPORT_GENERATE } },
  async ({ event, step }) => {
    const data = reportData.parse(event.data);
    return step.run("generate-and-mail", () => runReportGenerate(db(), data));
  },
);
