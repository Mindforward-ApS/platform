import "server-only";
import PDFDocument from "pdfkit";

// Server-side PDF generation with pdfkit (built-in Helvetica covers æøå via WinAnsi). Neutral layout: no colors
// are set (default black), so design tokens stay the only source of colors (docs: design not decided).

export type PdfDoc = InstanceType<typeof PDFDocument>;

export function renderPdf(meta: { title: string; author?: string }, build: (doc: PdfDoc) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, info: { Title: meta.title, Author: meta.author ?? "Mindforward" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      build(doc);
      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}
