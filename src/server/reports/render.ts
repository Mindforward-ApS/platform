import type { JobRole, MembershipRole } from "@/generated/prisma/enums";
import { formatDateDa } from "@/lib/format-date";
import { format } from "@/lib/i18n";
import { orgAdminMessages } from "@/lib/i18n/da-admin";
import { assertReportWording } from "./wording";

// Pure company report ("Dokumentation af AI-kompetencetiltag", docs/01 § 4.2.7). One document model feeds both
// the CSV and the PDF, so the wording test covers exactly what customers receive. No scores and no ranking:
// the report documents what was offered and completed (docs/10 § 1.6).

export interface ReportEmployee {
  name: string;
  email: string;
  role: MembershipRole;
  jobRole: JobRole | null;
  tracks: string[];
  offered: number;
  passedModules: { slug: string; title: string; version: number; passedAt: Date }[];
  certificates: { track: string; levelLabel: string; issuedAt: Date }[];
}

export interface ReportData {
  organization: { name: string; aiPolicyUrl: string | null };
  period: { from: Date; to: Date };
  generatedAt: Date;
  trial: boolean;
  notes: string | null;
  employees: ReportEmployee[];
  contentVersions: { slug: string; version: number }[];
}

export interface ReportDocument {
  title: string;
  subtitle: string;
  watermark: string | null;
  intro: string;
  meta: string[];
  summary: string[];
  notes: string | null;
  contentVersions: string[];
  header: string[];
  rows: string[][];
}

export function buildReportDocument(data: ReportData): ReportDocument {
  const t = orgAdminMessages.report;
  const employees = [...data.employees].sort((a, b) => a.name.localeCompare(b.name, "da") || a.email.localeCompare(b.email));
  const passedCount = employees.reduce((n, e) => n + e.passedModules.length, 0);
  const certCount = employees.reduce((n, e) => n + e.certificates.length, 0);

  const doc: ReportDocument = {
    title: t.docTitle,
    subtitle: t.subtitle,
    watermark: data.trial ? t.trialWatermark : null,
    intro: t.intro,
    meta: [
      format(t.organization, { name: data.organization.name }),
      format(t.period, { from: formatDateDa(data.period.from), to: formatDateDa(data.period.to) }),
      format(t.generated, { date: formatDateDa(data.generatedAt) }),
      ...(data.organization.aiPolicyUrl ? [format(t.aiPolicy, { url: data.organization.aiPolicyUrl })] : []),
    ],
    summary: [
      format(t.summary.employees, { count: employees.length }),
      format(t.summary.withPassed, { count: employees.filter((e) => e.passedModules.length > 0).length }),
      format(t.summary.passedModules, { count: passedCount }),
      format(t.summary.certificates, { count: certCount }),
    ],
    notes: data.notes?.trim() ? data.notes.trim() : null,
    contentVersions: data.contentVersions.map((v) => `${v.slug} v${v.version}`),
    header: Object.values(t.columns),
    rows: employees.map((e) => [
      e.name,
      e.email,
      orgAdminMessages.roles[e.role],
      e.jobRole ? orgAdminMessages.jobRoles[e.jobRole] : "",
      e.tracks.join(", "),
      String(e.offered),
      String(e.passedModules.length),
      e.passedModules.map((p) => `${p.title} (v${p.version}, ${formatDateDa(p.passedAt)})`).join("; "),
      e.certificates.map((c) => `${c.track} · ${c.levelLabel} (${formatDateDa(c.issuedAt)})`).join("; "),
    ]),
  };
  assertReportWording(reportPlainText(doc));
  return doc;
}

function csvCell(value: string): string {
  // Also neutralise spreadsheet formula injection (cells starting with = + - @).
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Semicolon-separated (Danish Excel default) with BOM so æøå open correctly. */
export function reportCsv(doc: ReportDocument): string {
  const lines: string[][] = [
    [doc.title],
    [doc.subtitle],
    ...(doc.watermark ? [[doc.watermark]] : []),
    ...doc.meta.map((m) => [m]),
    ...doc.summary.map((s) => [s]),
    ...(doc.notes ? [[`${orgAdminMessages.report.notesTitle}: ${doc.notes}`]] : []),
    [`${orgAdminMessages.report.contentVersionsTitle}: ${doc.contentVersions.join(", ")}`],
    [],
    doc.header,
    ...doc.rows,
  ];
  const csv = lines.map((l) => l.map(csvCell).join(";")).join("\r\n");
  assertReportWording(csv);
  return `﻿${csv}\r\n`;
}

/** Every text that the PDF renders, in order (used by the PDF renderer and the wording test). */
export function reportPlainText(doc: ReportDocument): string {
  return [
    doc.watermark ?? "",
    doc.title,
    doc.subtitle,
    doc.intro,
    ...doc.meta,
    orgAdminMessages.report.summaryTitle,
    ...doc.summary,
    ...(doc.notes ? [orgAdminMessages.report.notesTitle, doc.notes] : []),
    orgAdminMessages.report.contentVersionsTitle,
    doc.contentVersions.join(", "),
    orgAdminMessages.report.tableTitle,
    doc.header.join(" | "),
    ...doc.rows.map((r) => r.join(" | ")),
  ].join("\n");
}
