import "server-only";
import QRCode from "qrcode";
import { CERTIFICATE_DISCLAIMER } from "@/lib/config/certificates";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { rasterTokens } from "@/server/brand/raster-tokens";
import { drawMark } from "@/server/pdf/brand";
import { renderPdf, type PdfDoc } from "@/server/pdf/render";
import type { CertificateDetails } from "./service";

/** Text lines of the certificate in print order (also used by tests). No vendor logos, no "certificeret af". */
export function certificateLines(c: CertificateDetails, verifyUrl: string): { heading: string; lines: string[]; modules: string[]; footer: string[] } {
  const t = getMessages().orgAdmin.certificatePdf;
  return {
    heading: t.heading,
    lines: [c.holderName, t.hasCompleted, format(t.trackPrefix, { track: c.trackName }), c.levelLabel],
    modules: c.modules.map((m) => `${m.title} — ${formatDateDa(m.passedAt)}`),
    footer: [
      format(t.learningTime, { minutes: c.totalMinutes }),
      ...(c.averageScorePct !== null ? [format(t.averageScore, { score: c.averageScorePct })] : []),
      format(t.issued, { date: formatDateDa(c.issuedAt) }),
      format(t.contentVersion, { version: c.contentVersion }),
      format(t.id, { code: c.verificationCode }),
      format(t.verify, { url: verifyUrl }),
      t.practiceNote,
      CERTIFICATE_DISCLAIMER,
    ],
  };
}

/** QR code as vector squares (no image embedding). */
function drawQr(pdf: PdfDoc, text: string, x: number, y: number, size: number, color: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const cell = size / n;
  pdf.save();
  for (let r = 0; r < n; r++) for (let col = 0; col < n; col++) if (qr.modules.get(r, col)) pdf.rect(x + col * cell, y + r * cell, cell + 0.2, cell + 0.2);
  pdf.fill(color);
  pdf.restore();
}

/** A4 landscape certificate meant to look good attached to a CV. */
export function certificatePdf(c: CertificateDetails, verifyUrl: string): Promise<Buffer> {
  const l = certificateLines(c, verifyUrl);
  const t = getMessages().orgAdmin.certificatePdf;
  const col = rasterTokens();
  return renderPdf({ title: `${l.heading} ${c.verificationCode}`, layout: "landscape", margin: 0 }, (pdf) => {
    const W = pdf.page.width;
    const H = pdf.page.height;
    const M = 40;
    const P = 64; // inner padding
    pdf.rect(0, 0, W, H).fill(col.bg);
    pdf.roundedRect(M, M, W - 2 * M, H - 2 * M, 14).fillAndStroke(col.surface, col.line);

    // Header: mark + wordmark, ID right.
    drawMark(pdf, P + M - 24, M + 30, 26, col);
    pdf.font("Helvetica-Bold").fontSize(15).fillColor(col.ink).text("mindforward", P + M + 10, M + 36, { lineBreak: false });
    pdf.font("Helvetica").fontSize(8).fillColor(col["ink-subtle"]).text(t.idLabel.toUpperCase(), W - M - P - 160, M + 32, { width: 160, align: "right", characterSpacing: 1 });
    pdf.font("Courier-Bold").fontSize(12).fillColor(col.ink).text(c.verificationCode, W - M - P - 160, M + 44, { width: 160, align: "right" });

    // Title block.
    const left = M + P - 24;
    let y = M + 112;
    pdf.font("Helvetica-Bold").fontSize(9).fillColor(col.accent).text(t.overline.toUpperCase(), left, y, { characterSpacing: 2 });
    y += 22;
    pdf.font("Helvetica-Bold").fontSize(38).fillColor(col.ink).text(c.holderName, left, y, { width: W - 2 * left - 150 });
    y = pdf.y + 6;
    pdf.font("Helvetica").fontSize(13).fillColor(col["ink-muted"]).text(`${t.hasCompleted} `, left, y, { continued: true })
      .font("Helvetica-Bold").fillColor(col.ink).text(`${c.levelLabel} · ${c.trackName}`);

    // Modules in two columns.
    y = pdf.y + 26;
    pdf.font("Helvetica-Bold").fontSize(8).fillColor(col["ink-subtle"]).text(t.modulesTitle.toUpperCase(), left, y, { characterSpacing: 1 });
    y += 16;
    const colW = (W - 2 * left - 170) / 2;
    const half = Math.ceil(c.modules.length / 2);
    c.modules.forEach((m, i) => {
      const cx = left + (i < half ? 0 : colW + 20);
      const cy = y + (i % half) * 17;
      pdf.circle(cx + 3, cy + 4.5, 2).fill(col.accent);
      pdf.font("Helvetica").fontSize(9).fillColor(col.ink).text(m.title, cx + 12, cy, { width: colW - 70, height: 11, ellipsis: true });
      pdf.fillColor(col["ink-subtle"]).text(formatDateDa(m.passedAt), cx + colW - 64, cy, { width: 60, align: "right", lineBreak: false });
    });

    // Facts row.
    const factsY = H - M - 128;
    pdf.moveTo(left, factsY - 14).lineTo(W - left - 84 - 24, factsY - 14).lineWidth(0.6).stroke(col.line);
    const facts: [string, string][] = [
      [t.issuedLabel, formatDateDa(c.issuedAt)],
      [t.timeLabel, format(t.timeValue, { minutes: c.totalMinutes })],
      ...(c.averageScorePct !== null ? [[t.scoreLabel, format(t.scoreValue, { score: c.averageScorePct })] as [string, string]] : []),
      [t.versionLabel, c.contentVersion],
    ];
    const factW = (W - 2 * left - 150) / facts.length;
    facts.forEach(([label, value], i) => {
      const fx = left + i * factW;
      pdf.font("Helvetica").fontSize(8).fillColor(col["ink-subtle"]).text(label.toUpperCase(), fx, factsY, { characterSpacing: 1, lineBreak: false });
      pdf.font("Helvetica-Bold").fontSize(12).fillColor(col.ink).text(value, fx, factsY + 13, { lineBreak: false });
    });

    // QR to the verification page.
    const qrSize = 84;
    const qx = W - left - qrSize;
    drawQr(pdf, verifyUrl, qx, factsY - 30, qrSize, col.ink);
    pdf.font("Helvetica").fontSize(7.5).fillColor(col["ink-subtle"]).text(t.scanToVerify, qx - 20, factsY + qrSize - 24, { width: qrSize + 20, align: "right" });

    // Footer.
    pdf.font("Helvetica").fontSize(7.5).fillColor(col["ink-subtle"])
      .text(`${t.practiceNote} ${CERTIFICATE_DISCLAIMER}`, left, H - M - 54, { width: W - 2 * left - 110 })
      .text(verifyUrl, left, pdf.y + 3, { width: W - 2 * left - 110, link: verifyUrl });
  });
}
