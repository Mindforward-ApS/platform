import { formatDateDa } from "@/lib/format-date";
import { format, getMessages } from "@/lib/i18n";
import { previewImage } from "@/server/certificates/card-image";
import { findPublicCertificate } from "@/server/certificates/service";
import { db } from "@/server/db";

// Link preview when a holder shares their public verification page (LinkedIn, mail, chat).
// Disabled or unknown codes get the generic card, so the image never reveals more than the page itself.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = getMessages().account.certificates.imageAlt;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = safeDecode(code).slice(0, 32).trim().toUpperCase();
  const cert = await findPublicCertificate(db(), normalized);
  return previewImage(cert ? { holderName: cert.holderName, levelLabel: cert.levelLabel, trackName: cert.trackName, issuedLabel: format(getMessages().account.certificates.issuedOn, { date: formatDateDa(cert.issuedAt) }), verificationCode: normalized } : null);
}

/** Malformed %-sequences must not 500 — treat them as an unknown code. */
function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return "";
  }
}
