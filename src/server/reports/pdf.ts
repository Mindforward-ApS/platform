import "server-only";
import { orgAdminMessages } from "@/lib/i18n/da-admin";
import { renderPdf } from "@/server/pdf/render";
import { reportPlainText, type ReportDocument } from "./render";
import { assertReportWording } from "./wording";

/** Company report as PDF. Renders exactly the texts of the document model (wording-checked). */
export function reportPdf(doc: ReportDocument): Promise<Buffer> {
  assertReportWording(reportPlainText(doc));
  const t = orgAdminMessages.report;
  return renderPdf({ title: doc.title }, (pdf) => {
    if (doc.watermark) pdf.font("Helvetica-Bold").fontSize(14).text(doc.watermark.toUpperCase(), { align: "right" });
    pdf.font("Helvetica-Bold").fontSize(20).text(doc.title);
    pdf.font("Helvetica").fontSize(12).text(doc.subtitle).moveDown();
    pdf.fontSize(10).text(doc.intro).moveDown();
    for (const line of doc.meta) pdf.text(line);
    pdf.moveDown().font("Helvetica-Bold").fontSize(12).text(t.summaryTitle);
    pdf.font("Helvetica").fontSize(10);
    for (const line of doc.summary) pdf.text(line);
    if (doc.notes) {
      pdf.moveDown().font("Helvetica-Bold").fontSize(12).text(t.notesTitle);
      pdf.font("Helvetica").fontSize(10).text(doc.notes);
    }
    pdf.moveDown().font("Helvetica-Bold").fontSize(12).text(t.contentVersionsTitle);
    pdf.font("Helvetica").fontSize(10).text(doc.contentVersions.join(", ") || "—");
    pdf.moveDown().font("Helvetica-Bold").fontSize(12).text(t.tableTitle);
    for (const row of doc.rows) {
      pdf.moveDown(0.5).font("Helvetica-Bold").fontSize(10).text(`${row[0]} (${row[1]})`);
      pdf.font("Helvetica").fontSize(9);
      doc.header.slice(2).forEach((label, i) => {
        const value = row[i + 2];
        if (value) pdf.text(`${label}: ${value}`);
      });
    }
  });
}
