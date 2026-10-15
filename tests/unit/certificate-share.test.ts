import { describe, expect, it } from "vitest";
import { cvLine, linkedinAddToProfileUrl, linkedinShareUrl, shareText } from "@/lib/certificate-share";

const cert = {
  levelLabel: "Niveau 1 · Grundlag",
  trackName: "ChatGPT",
  issuedAt: new Date("2026-10-14T09:00:00Z"),
  verificationCode: "K7QX-M4RT-9W2P",
  verifyUrl: "https://mindforward.dk/certifikat/K7QX-M4RT-9W2P",
};

describe("certificate sharing links", () => {
  it("prefills LinkedIn's add-to-profile form with name, issuer, month, ID and the verification link", () => {
    const url = new URL(linkedinAddToProfileUrl(cert));
    expect(url.origin + url.pathname).toBe("https://www.linkedin.com/profile/add");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      startTask: "CERTIFICATION_NAME",
      name: "AI-kompetence: Niveau 1 · Grundlag (ChatGPT)",
      organizationName: "Mindforward",
      issueYear: "2026",
      issueMonth: "10",
      certUrl: cert.verifyUrl,
      certId: "K7QX-M4RT-9W2P",
    });
  });

  it("shares the public verification page as a LinkedIn post", () => {
    expect(linkedinShareUrl(cert.verifyUrl)).toBe("https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fmindforward.dk%2Fcertifikat%2FK7QX-M4RT-9W2P");
  });

  it("gives a one-line CV entry with month, ID and link — never the word certificering", () => {
    const line = cvLine(cert);
    expect(line).toBe("AI-kompetence: Niveau 1 · Grundlag (ChatGPT), Mindforward, oktober 2026. ID K7QX-M4RT-9W2P · https://mindforward.dk/certifikat/K7QX-M4RT-9W2P");
    expect(`${line} ${shareText(cert)}`.toLowerCase()).not.toMatch(/certificer|lovkrav|godkendt/);
  });
});
