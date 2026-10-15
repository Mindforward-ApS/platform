import "server-only";
import { orgAdminMessages } from "@/lib/i18n/da-admin";
import { rasterTokens } from "@/server/brand/raster-tokens";
import { drawMark } from "@/server/pdf/brand";
import { renderPdf } from "@/server/pdf/render";
import { reportPlainText, type ReportDocument } from "./render";
import { assertReportWording } from "./wording";

// Company report as an A4 PDF in the certificate's visual language (mark, token colors, quiet hierarchy).
// Renders exactly the texts of the document model (wording-checked); only page numbers are added.

const M = 48; // page margin
const FOOT = 40; // reserved for the page number

/** "Label: 7" → ["Label", "7"] (summary lines carry their count last). */
function splitCount(line: string): [string, string] {
  const i = line.lastIndexOf(": ");
  return i < 0 ? [line, ""] : [line.slice(0, i), line.slice(i + 2)];
}

export function reportPdf(doc: ReportDocument): Promise<Buffer> {
  assertReportWording(reportPlainText(doc));
  const t = orgAdminMessages.report;
  const col = rasterTokens();
  return renderPdf({ title: doc.title, margin: 0, bufferPages: true }, (pdf) => {
    const W = pdf.page.width;
    const H = pdf.page.height;
    const inner = W - 2 * M;
    let y = M;

    const ensure = (h: number) => {
      if (y + h <= H - M - FOOT) return;
      pdf.addPage({ size: "A4", margin: 0 });
      y = M;
    };
    const overline = (text: string) => {
      ensure(40);
      y += 10;
      pdf.font("Helvetica-Bold").fontSize(8).fillColor(col.accent).text(text.toUpperCase(), M, y, { characterSpacing: 1.5, lineBreak: false });
      y += 18;
    };
    const para = (text: string, size: number, color: string, font = "Helvetica", width = inner) => {
      pdf.font(font).fontSize(size);
      const h = pdf.heightOfString(text, { width });
      ensure(h);
      pdf.fillColor(color).text(text, M, y, { width });
      y += h;
    };

    // Header: mark + wordmark, trial watermark right.
    drawMark(pdf, M, y, 24, col);
    pdf.font("Helvetica-Bold").fontSize(14).fillColor(col.ink).text("mindforward", M + 32, y + 6, { lineBreak: false });
    if (doc.watermark) {
      pdf.font("Helvetica-Bold").fontSize(8);
      const label = doc.watermark.toUpperCase();
      const w = pdf.widthOfString(label, { characterSpacing: 1 }) + 20;
      pdf.roundedRect(W - M - w, y + 2, w, 20, 10).fill(col["accent-soft"]);
      pdf.fillColor(col.accent).text(label, W - M - w, y + 8, { width: w, align: "center", characterSpacing: 1, lineBreak: false });
    }
    y += 52;

    // Title block.
    para(doc.title, 22, col.ink, "Helvetica-Bold");
    y += 4;
    para(doc.subtitle, 11, col["ink-muted"]);
    y += 12;
    para(doc.intro, 9.5, col["ink-muted"], "Helvetica", inner * 0.82);
    y += 12;
    for (const line of doc.meta) para(line, 8.5, col["ink-subtle"]);
    y += 6;

    // Summary as four figures.
    overline(t.summaryTitle);
    const gap = 10;
    const boxW = (inner - gap * (doc.summary.length - 1)) / doc.summary.length;
    const boxH = 62;
    ensure(boxH);
    doc.summary.forEach((line, i) => {
      const [label, count] = splitCount(line);
      const x = M + i * (boxW + gap);
      pdf.roundedRect(x, y, boxW, boxH, 8).fill(col["surface-sunken"]);
      pdf.font("Helvetica-Bold").fontSize(20).fillColor(col.ink).text(count, x + 12, y + 10, { width: boxW - 24, lineBreak: false });
      pdf.font("Helvetica").fontSize(7.5).fillColor(col["ink-muted"]).text(label, x + 12, y + 36, { width: boxW - 24, height: 22, ellipsis: true });
    });
    y += boxH + 8;

    if (doc.notes) {
      overline(t.notesTitle);
      para(doc.notes, 9.5, col.ink);
    }

    overline(t.contentVersionsTitle);
    para(doc.contentVersions.join(", ") || "—", 8.5, col["ink-muted"]);

    // Employees: one block each, never split across pages.
    overline(t.tableTitle);
    const [, , ...labels] = doc.header;
    const fieldsFor = (row: string[]) => labels.map((label, i) => [label, row[i + 2]] as const).filter(([, v]) => v);
    const labelW = 150;
    const valueW = inner - labelW;
    const blockHeight = (row: string[]) => {
      pdf.font("Helvetica").fontSize(8.5);
      return 34 + fieldsFor(row).reduce((h, [, v]) => h + pdf.heightOfString(v, { width: valueW }) + 3, 0);
    };
    for (const row of doc.rows) {
      ensure(blockHeight(row));
      pdf.moveTo(M, y).lineTo(W - M, y).lineWidth(0.6).stroke(col.line);
      y += 10;
      pdf.font("Helvetica-Bold").fontSize(10.5).fillColor(col.ink).text(row[0], M, y, { continued: true, lineBreak: false })
        .font("Helvetica").fontSize(8.5).fillColor(col["ink-subtle"]).text(`   ${row[1]}`, { lineBreak: false });
      y += 18;
      for (const [label, value] of fieldsFor(row)) {
        pdf.font("Helvetica").fontSize(8.5);
        const h = pdf.heightOfString(value, { width: valueW });
        pdf.fillColor(col["ink-subtle"]).text(label, M, y, { width: labelW - 10, lineBreak: false, height: 11, ellipsis: true });
        pdf.fillColor(col.ink).text(value, M + labelW, y, { width: valueW });
        y += h + 3;
      }
      y += 6;
    }

    // Page numbers.
    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      pdf.font("Helvetica").fontSize(7.5).fillColor(col["ink-subtle"]).text(`${i + 1} / ${range.count}`, M, H - M, { width: inner, align: "right", lineBreak: false });
    }
  });
}
