import "server-only";
import type { rasterTokens } from "@/server/brand/raster-tokens";
import type { PdfDoc } from "./render";

/** The brand mark (rounded tile, dot, chevron) on the 64 grid of src/components/ui/brand.tsx. */
export function drawMark(pdf: PdfDoc, x: number, y: number, size: number, c: ReturnType<typeof rasterTokens>) {
  const k = size / 64;
  pdf.save();
  pdf.roundedRect(x, y, size, size, 16 * k).fill(c.ink);
  pdf.circle(x + 21 * k, y + 32 * k, 6 * k).fill(c.accent);
  pdf.moveTo(x + 32 * k, y + 19 * k).lineTo(x + 45 * k, y + 32 * k).lineTo(x + 32 * k, y + 45 * k)
    .lineWidth(7 * k).lineCap("round").lineJoin("round").stroke(c.surface);
  pdf.restore();
}
