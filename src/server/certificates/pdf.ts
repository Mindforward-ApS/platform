import "server-only";
import { CERTIFICATE_DISCLAIMER } from "@/lib/config/certificates";
import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { renderPdf } from "@/server/pdf/render";
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

export function certificatePdf(c: CertificateDetails, verifyUrl: string): Promise<Buffer> {
  const l = certificateLines(c, verifyUrl);
  const t = getMessages().orgAdmin.certificatePdf;
  return renderPdf({ title: `${l.heading} ${c.verificationCode}` }, (pdf) => {
    pdf.font("Helvetica-Bold").fontSize(28).text(l.heading, { align: "center" }).moveDown();
    pdf.font("Helvetica-Bold").fontSize(20).text(l.lines[0] ?? "", { align: "center" });
    pdf.font("Helvetica").fontSize(12).text(l.lines[1] ?? "", { align: "center" });
    pdf.font("Helvetica-Bold").fontSize(16).text(`${l.lines[2] ?? ""} · ${l.lines[3] ?? ""}`, { align: "center" }).moveDown();
    pdf.font("Helvetica-Bold").fontSize(11).text(t.modulesTitle);
    pdf.font("Helvetica").fontSize(10);
    for (const m of l.modules) pdf.text(`• ${m}`);
    pdf.moveDown();
    for (const f of l.footer) pdf.fontSize(9).text(f).moveDown(0.3);
  });
}
