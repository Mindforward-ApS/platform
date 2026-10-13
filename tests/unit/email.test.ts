import { describe, expect, it } from "vitest";
import { isAllowedRecipient } from "@/server/email/allowlist";
import { renderTemplate, TEMPLATES } from "@/server/email/templates";

// docs/09 § 1: SERVICE mails never contain offers. Scan every SERVICE template's rendered output.
const FORBIDDEN_IN_SERVICE = [/rabat/i, /tilbud/i, /\bspar\b/i, /kampagne/i, /opgrader/i, /kun i dag/i, /\d+\s?%/, /\?promo=/i];

const sampleVars = {
  "magic-link": { url: "https://greb.example/api/auth/magic-link/verify?token=abc", expiresMin: 15 },
  invitation: { url: "https://greb.example/invitation/inv_1", organizationName: "Nordisk Test A/S", inviterName: "Mette" },
  "order-confirmation": {
    url: "https://greb.example/konto/abonnement",
    withdrawUrl: "https://greb.example/fortryd-aftale",
    termsUrl: "https://greb.example/vilkaar/forbruger",
    planName: "Mindforward Personlig (månedlig)",
    price: "10,00 kr. pr. md. inkl. moms",
    startDate: "13. oktober 2026",
    withdrawalDeadline: "27. oktober 2026",
    consents: [{ text: "Jeg ønsker adgang med det samme.", date: "13. oktober 2026", time: "14.05" }],
    seller: { name: "Test ApS", cvr: "12345678", address: "Testvej 1" },
  },
  "withdrawal-receipt": { url: "https://greb.example/fortryd-aftale", date: "13. oktober 2026", time: "14.05", agreement: "Personlig", name: "Test", seller: { name: "Test ApS", cvr: "12345678", address: "Testvej 1" } },
  "withdrawal-completed": { url: "https://greb.example/konto/abonnement", amount: "10,00 kr." },
  "cancellation-confirmed": { url: "https://greb.example/konto/abonnement", date: "13. oktober 2026", time: "14.05", endDate: "12. november 2026" },
  "support-escalation": { url: "https://greb.example/admin", reason: "WITHDRAWAL_UNMATCHED", summary: "Fortrydelse uden match" },
} as const;

describe("email templates", () => {
  for (const key of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
    it(`${key}: renders html + text with the link and no offer language`, async () => {
      const t = TEMPLATES[key];
      const out = await renderTemplate(key, sampleVars[key]);
      expect(out.subject.length).toBeGreaterThan(3);
      expect(out.html).toContain(sampleVars[key].url);
      expect(out.text).toContain(sampleVars[key].url);
      if (t.category === "SERVICE") {
        for (const re of FORBIDDEN_IN_SERVICE) expect(`${out.subject}\n${out.text}`).not.toMatch(re);
      }
    });
  }

  it("escapes HTML in variables", async () => {
    const out = await renderTemplate("invitation", { ...sampleVars.invitation, organizationName: "<script>x</script>" });
    expect(out.html).not.toContain("<script>x</script>");
  });
});

describe("isAllowedRecipient", () => {
  it("allows exact addresses and @domain entries, case-insensitively", () => {
    const list = "marco@example.dk, @greb.test";
    expect(isAllowedRecipient("Marco@Example.dk", list)).toBe(true);
    expect(isAllowedRecipient("anyone@greb.test", list)).toBe(true);
    expect(isAllowedRecipient("x@other.dk", list)).toBe(false);
  });

  it("does not let a lookalike domain through", () => {
    expect(isAllowedRecipient("a@evilgreb.test", "@greb.test")).toBe(false);
  });

  it("allows nobody when the list is empty", () => {
    expect(isAllowedRecipient("a@b.dk", undefined)).toBe(false);
  });
});
