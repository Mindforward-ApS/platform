import { describe, expect, it } from "vitest";
import { isAllowedRecipient } from "@/server/email/allowlist";
import { renderTemplate, TEMPLATES } from "@/server/email/templates";
import { assertTemplateVars, offerFieldPaths, ServiceTemplateOfferError } from "@/server/email/template-schema";

// docs/09 § 1: SERVICE mails never contain offers. Scan every SERVICE template's rendered output.
const FORBIDDEN_IN_SERVICE = [/rabat/i, /tilbud/i, /\bspar\b/i, /kampagne/i, /opgrader/i, /kun i dag/i, /\d+\s?%/, /\?promo=/i];

const monthlyVars = {
  url: "https://greb.example/moduler",
  settingsUrl: "https://greb.example/konto",
  month: "november 2026",
  estimatedMinutes: 13,
  modules: [{ title: "Nyt: deling af samtaler", minutes: 4 }],
  refresher: { title: "Gode prompts", minutes: 9 },
};
const monthlySamples = { "monthly-training-d1": monthlyVars, "monthly-training-d14": monthlyVars, "monthly-training-d25": monthlyVars } as const;
const marketingBase = { url: "https://greb.example/moduler", unsubscribeUrl: "https://greb.example/afmeld?t=abc", sender: { name: "Test ApS", cvr: "12345678", address: "Testvej 1" } };
const marketingSamples = {
  "nurture-1": { ...marketingBase, result: { track: "ChatGPT", level: 2 } },
  "nurture-2": marketingBase,
  "nurture-3": marketingBase,
  "nurture-4": { ...marketingBase, offer: null },
  newsletter: { ...marketingBase, subject: "Nyt fra Mindforward i november", heading: "Nyt i november", intro: "Her er månedens nyheder.", items: [{ title: "Nyt modul", summary: "Kort om det nye.", url: "https://greb.example/modul/x" }] },
} as const;

const sampleVars = {
  "login-code": { code: "123456", expiresMin: 15 },
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
  "marketing-confirm": { url: "https://greb.example/samtykke/bekraeft?t=abc", expiresDays: 7 },
  "certificate-issued": { url: "https://greb.example/certifikater", trackName: "ChatGPT", levelLabel: "Niveau 1 · Grundlag" },
  "account-deletion-confirm": { url: "https://greb.example/konto/data/slet?token=abc", expiresMin: 60 },
  "report-ready": { url: "https://greb.example/virksomhed/rapport", organizationName: "Nordisk Test A/S", from: "01.09.2026", to: "30.09.2026" },
  // M8
  ...monthlySamples,
  ...marketingSamples,
  // M10
  "support-escalation-receipt": { url: "https://greb.example/konto/support", escalationId: "esc_1", expected: "inden for 2 hverdage" },
  "support-invoice-link": { url: "https://invoice.stripe.example/i/abc", invoiceNumber: "GREB-0001", amount: "245,00 kr.", status: "betalt" },
  "ai-budget-alert": { url: "https://greb.example/admin/forbrug", month: "2026-10", pct: 81, spent: "4.050,00 kr.", limit: "5.000,00 kr.", level: "BLOCKED" },
  "owner-digest": {
    url: "https://greb.example/admin",
    date: "13. oktober 2026",
    action: { openCount: 1, lines: [{ text: "HIGH · Sikkerhed · 3 t · Brugeren mistænker hacket konto", overdue: true }] },
    support: { line: "4 samtaler, 75 pct. løst uden menneske, 1 eskalationer", byReason: "Sikkerhed: 1", guardHits: 1 },
    billing: "1 nye abonnementer, 0 opsigelser, 0 fortrydelser, 0 fejlede betalinger",
    pipeline: null,
    errors: "0 AI-fejl/timeouts, 0 mails fejlede, 0 webhooks fejlede",
    ai: { line: "I går: 12,00 kr. Måned til dato: 4.050,00 kr. af 5.000,00 kr. (81 pct.).", alert: true },
    killSwitches: ["AI_DEGRADED_MODE: til"],
  },
} as const;

describe("email templates", () => {
  for (const key of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
    it(`${key}: renders html + text with the link and no offer language`, async () => {
      const t = TEMPLATES[key];
      const vars = sampleVars[key];
      const out = await renderTemplate(key, vars);
      // The login-code mail carries a code instead of a link.
      const needle = "url" in vars ? vars.url : vars.code;
      expect(out.subject.length).toBeGreaterThan(3);
      expect(out.html).toContain(needle);
      expect(out.text).toContain(needle);
      if (t.category === "SERVICE") {
        for (const re of FORBIDDEN_IN_SERVICE) expect(`${out.subject}\n${out.text}`).not.toMatch(re);
      }
    });
  }

  it("login-code: the code is in the mail but never in the stored subject", async () => {
    const out = await renderTemplate("login-code", { code: "482913", expiresMin: 15 });
    expect(out.text).toContain("482913");
    expect(out.subject).not.toContain("482913");
  });

  it("escapes HTML in variables", async () => {
    const out = await renderTemplate("invitation", { ...sampleVars.invitation, organizationName: "<script>x</script>" });
    expect(out.html).not.toContain("<script>x</script>");
  });
});

// M8: SERVICE templates are rejected if their variables carry offer/discount fields (template schema).
describe("template schema: no offer fields in SERVICE", () => {
  it("every SERVICE template's variables are free of offer/discount fields", () => {
    for (const key of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
      expect(() => assertTemplateVars(key, TEMPLATES[key].category, sampleVars[key])).not.toThrow();
    }
  });

  it("rejects a SERVICE template that carries an offer, discount or promo code (also nested)", () => {
    expect(offerFieldPaths({ url: "x", discountPct: 20 })).toEqual(["discountPct"]);
    expect(() => assertTemplateVars("monthly-training-d14", "SERVICE", { ...monthlyVars, offer: { code: "X" } })).toThrow(ServiceTemplateOfferError);
    expect(() => assertTemplateVars("monthly-training-d1", "SERVICE", { ...monthlyVars, modules: [{ title: "t", minutes: 1, promoCode: "A" }] })).toThrow(/modules\[0\]\.promoCode/);
    expect(() => assertTemplateVars("nurture-4", "MARKETING", marketingSamples["nurture-4"])).not.toThrow();
  });

  it("monthly reminders are SERVICE and every M8 marketing template is MARKETING", () => {
    for (const k of ["monthly-training-d1", "monthly-training-d14", "monthly-training-d25"] as const) expect(TEMPLATES[k].category).toBe("SERVICE");
    for (const k of ["nurture-1", "nurture-2", "nurture-3", "nurture-4", "newsletter"] as const) expect(TEMPLATES[k].category).toBe("MARKETING");
  });

  it("marketing mails are labelled as marketing, name the sender and carry the unsubscribe link", async () => {
    for (const k of ["nurture-1", "nurture-2", "nurture-3", "nurture-4", "newsletter"] as const) {
      const out = await renderTemplate(k, marketingSamples[k]);
      expect(out.text).toContain("Markedsføring fra Mindforward");
      expect(out.text).toContain("CVR 12345678");
      expect(out.text).toContain(marketingBase.unsubscribeUrl);
      expect(out.html).toContain(marketingBase.unsubscribeUrl);
    }
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
