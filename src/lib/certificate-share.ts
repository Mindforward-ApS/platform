// Share links for a certificate (LinkedIn profile + post, mail, CV line). Pure: no secrets, safe on the client.
// Wording follows docs/10: "AI-kompetence", never "certificering", "lovkrav" or "godkendt".

export interface ShareableCertificate {
  levelLabel: string;
  trackName: string;
  issuedAt: Date;
  verificationCode: string;
  verifyUrl: string;
}

const ISSUER = "Mindforward";
const TZ = "Europe/Copenhagen";

/** The name shown on the learner's LinkedIn profile and CV. */
export function credentialName(c: Pick<ShareableCertificate, "levelLabel" | "trackName">): string {
  return `AI-kompetence: ${c.levelLabel} (${c.trackName})`;
}

function yearMonth(d: Date): { year: string; month: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "numeric" }).formatToParts(d);
  return { year: parts.find((p) => p.type === "year")?.value ?? "", month: parts.find((p) => p.type === "month")?.value ?? "" };
}

/** LinkedIn's own "Add licence or certification" form, prefilled. No LinkedIn API or app approval needed. */
export function linkedinAddToProfileUrl(c: ShareableCertificate): string {
  const { year, month } = yearMonth(c.issuedAt);
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: credentialName(c),
    organizationName: ISSUER,
    issueYear: year,
    issueMonth: month,
    certUrl: c.verifyUrl,
    certId: c.verificationCode,
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}

/** A LinkedIn post with the public verification page as the link card. */
export function linkedinShareUrl(verifyUrl: string): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
}

export function shareText(c: Pick<ShareableCertificate, "levelLabel" | "trackName">): string {
  return `Jeg har gennemført ${c.levelLabel} i ${c.trackName} hos ${ISSUER}.`;
}

export function mailtoHref(c: ShareableCertificate): string {
  const subject = credentialName(c);
  const body = `${shareText(c)}\n\nSe det her: ${c.verifyUrl}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** One line to paste under "Kurser og efteruddannelse" in a CV. */
export function cvLine(c: ShareableCertificate): string {
  const when = new Intl.DateTimeFormat("da-DK", { timeZone: TZ, month: "long", year: "numeric" }).format(c.issuedAt);
  return `${credentialName(c)}, ${ISSUER}, ${when}. ID ${c.verificationCode} · ${c.verifyUrl}`;
}
