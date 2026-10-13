import { z } from "zod";

// Report form input (V7): period, filters, the company's own notes. Shared by the page preview and the export route.

const JOB_ROLES = ["SALES", "HR", "FINANCE", "CUSTOMER_SERVICE", "LEADERSHIP", "OPERATIONS", "OTHER"] as const;
const blank = (v: unknown) => (v === "" || v === null ? undefined : v);
const day = z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

export const reportFormSchema = z.object({
  from: day,
  to: day,
  trackId: z.preprocess(blank, z.string().max(64).optional()),
  jobRole: z.preprocess(blank, z.enum(JOB_ROLES).optional()),
  notes: z.preprocess(blank, z.string().max(4000).optional()),
  format: z.enum(["csv", "pdf"]).default("csv"),
});

export type ReportForm = z.infer<typeof reportFormSchema>;

/** Period bounds: from 00:00 of `from` to the end of `to` (UTC days; default: org start → now). */
export function reportPeriod(form: Pick<ReportForm, "from" | "to">, fallbackFrom: Date, now = new Date()): { from: Date; to: Date } {
  const from = form.from ? new Date(`${form.from}T00:00:00.000Z`) : fallbackFrom;
  const to = form.to ? new Date(`${form.to}T23:59:59.999Z`) : now;
  return from <= to ? { from, to } : { from: to, to: from };
}
