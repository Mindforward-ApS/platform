import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { canSendMarketing, confirmMarketingConsent, grantMarketingConsent, verifyUnsubscribeToken, withdrawMarketingConsent } from "@/server/email/consent";
import { MARKETING_FLAG, resetMarketingFlagCache } from "@/server/email/flags";
import { sendNewsletter } from "@/server/email/newsletter";
import { sendNurtureStep } from "@/server/email/nurture";
import { sendMarketingEmail, type MarketingSendOptions } from "@/server/email/send";
import type { EmailTransport, OutgoingEmail } from "@/server/email/transports";
import { addMember, makeOrg, makeUser, testDb } from "./helpers";
import { makeSubscription } from "./monthly-fixtures";

const pepper = "integration-pepper-integration";
const secret = "u".repeat(32);
const meta = { ip: "203.0.113.5", userAgent: "vitest" };
const newEmail = () => `mk-${randomUUID().slice(0, 8)}@example.test`;
const TUESDAY_11 = new Date("2026-10-13T09:00:00Z"); // 11:00 Copenhagen, a working day
const DAY = 24 * 60 * 60 * 1000;

function capture() {
  const sent: OutgoingEmail[] = [];
  const transport: EmailTransport = { name: "capture", send: async (m) => (sent.push(m), { providerId: null }) };
  return { sent, transport };
}

const options = (transport: EmailTransport, extra: Partial<MarketingSendOptions> = {}): MarketingSendOptions => ({
  transport,
  marketingEnabled: true,
  pepper,
  unsubscribeSecret: secret,
  appUrl: "https://app.example.test",
  sender: { name: "Test ApS", cvr: "12345678", address: "Testvej 1, 8000 Aarhus C" },
  enforceAllowlist: false,
  now: TUESDAY_11,
  ...extra,
});

async function confirmed(email: string) {
  const g = await grantMarketingConsent(testDb(), { email, source: "PLACEMENT_RESULT", ...meta });
  if (g.status !== "GRANTED") throw new Error("expected GRANTED");
  await confirmMarketingConsent(testDb(), g.token, meta, { pepper });
  const gate = await canSendMarketing(testDb(), email, { pepper });
  if (!gate.allowed) throw new Error("expected allowed");
  return gate.consentRecordId;
}

const nurture2 = (email: string, consentRecordId: string, key = `t:${randomUUID()}`) => ({
  template: "nurture-2" as const,
  to: email,
  consentRecordId,
  idempotencyKey: key,
  vars: { url: "https://app.example.test/moduler" },
});

afterEach(async () => {
  await testDb().featureFlag.deleteMany({ where: { key: MARKETING_FLAG } });
  resetMarketingFlagCache();
});

describe("sendMarketingEmail delivery (M8)", () => {
  it("sends from the marketing sender with label, sender, unsubscribe link and List-Unsubscribe one-click headers", async () => {
    const email = newEmail();
    const consentId = await confirmed(email);
    const { sent, transport } = capture();
    const res = await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport));
    expect(res.sent).toBe(true);
    const mail = sent[0];
    if (!mail) throw new Error("no mail");
    expect(mail.from).toContain("news.mindforward.dk");
    expect(mail.text).toContain("Markedsføring fra Mindforward");
    expect(mail.text).toContain("CVR 12345678");
    const link = mail.text.match(/https:\/\/app\.example\.test\/afmeld\?t=[^\s)\]]+/)?.[0];
    expect(link).toBeTruthy();
    expect(verifyUnsubscribeToken(decodeURIComponent(new URL(link ?? "").searchParams.get("t") ?? ""), secret)).toBe(email);
    expect(mail.headers?.["List-Unsubscribe"]).toMatch(/^<https:\/\/app\.example\.test\/api\/afmeld\?t=.+>$/);
    expect(mail.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const row = await testDb().emailMessage.findFirstOrThrow({ where: { toEmail: email } });
    expect(row).toMatchObject({ category: "MARKETING", consentRecordId: consentId, status: "SENT", template: "nurture-2" });
  });

  it("re-checks consent at send time: withdrawn after scheduling → nothing is sent", async () => {
    const email = newEmail();
    const consentId = await confirmed(email); // flow scheduled with this consent …
    await withdrawMarketingConsent(testDb(), { email, source: "UNSUBSCRIBE_LINK", ...meta }, { pepper }); // … then withdrawn
    const { sent, transport } = capture();
    expect(await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport))).toEqual({ sent: false, reason: "SUPPRESSED" }); // WITHDRAWN + suppression; suppression is checked first
    expect(sent).toHaveLength(0);
  });

  it("is idempotent per key", async () => {
    const email = newEmail();
    const consentId = await confirmed(email);
    const { sent, transport } = capture();
    await sendMarketingEmail(testDb(), nurture2(email, consentId, `same:${email}`), options(transport));
    await sendMarketingEmail(testDb(), nurture2(email, consentId, `same:${email}`), options(transport));
    expect(sent).toHaveLength(1);
  });

  it("enforces 2 per 7 days across flows", async () => {
    const email = newEmail();
    const consentId = await confirmed(email);
    const { sent, transport } = capture();
    expect((await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport, { now: new Date(TUESDAY_11.getTime() - 1 * DAY) }))).sent).toBe(true);
    expect((await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport))).sent).toBe(true);
    expect(await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport))).toEqual({ sent: false, reason: "FREQUENCY_CAP" });
    expect(sent).toHaveLength(2);
  });

  it("defers during quiet hours with the next allowed send time", async () => {
    const email = newEmail();
    const consentId = await confirmed(email);
    const { sent, transport } = capture();
    const evening = new Date("2026-10-13T19:30:00Z"); // 21:30 Copenhagen
    const res = await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport, { now: evening }));
    expect(res).toEqual({ sent: false, reason: "QUIET_HOURS", retryAt: new Date("2026-10-14T06:00:00Z") });
    expect(sent).toHaveLength(0);
  });

  it("the FeatureFlag kill switch wins over the env fallback", async () => {
    const email = newEmail();
    const consentId = await confirmed(email);
    await testDb().featureFlag.create({ data: { key: MARKETING_FLAG, enabled: false } });
    resetMarketingFlagCache();
    const { sent, transport } = capture();
    expect(await sendMarketingEmail(testDb(), nurture2(email, consentId), options(transport, { marketingEnabled: undefined }))).toEqual({ sent: false, reason: "KILL_SWITCH" });
    expect(sent).toHaveLength(0);
  });

  it("refuses MARKETING when the consent belongs to another address", async () => {
    const a = newEmail();
    const consentA = await confirmed(a);
    const b = newEmail();
    await confirmed(b);
    const { transport } = capture();
    expect(await sendMarketingEmail(testDb(), nurture2(b, consentA), options(transport))).toEqual({ sent: false, reason: "CONSENT_MISMATCH" });
  });
});

describe("newsletter + nurture", () => {
  const draft = {
    subject: "Nyt fra Mindforward",
    heading: "Nyt i oktober",
    intro: "Her er månedens nyheder fra øvemiljøet.",
    items: [{ title: "Nyt modul", summary: "Et kort modul om noget nyt.", url: "https://app.example.test/moduler" }],
    url: "https://app.example.test/moduler",
    approvedBy: "Marco",
    approvedAt: "2026-10-12T10:00:00Z",
  };

  it("goes only to confirmed addresses, max once per month", async () => {
    const yes = newEmail();
    await confirmed(yes);
    const pending = newEmail();
    await grantMarketingConsent(testDb(), { email: pending, source: "PLACEMENT_RESULT", ...meta });
    const { sent, transport } = capture();
    await sendNewsletter(testDb(), draft, options(transport));
    await sendNewsletter(testDb(), draft, options(transport, { now: new Date(TUESDAY_11.getTime() + DAY) }));
    expect(sent.filter((m) => m.to === yes).map((m) => m.template)).toEqual(["newsletter"]);
    expect(sent.some((m) => m.to === pending)).toBe(false);
  });

  it("rejects an unapproved draft", async () => {
    const { transport } = capture();
    await expect(sendNewsletter(testDb(), { ...draft, approvedBy: undefined }, options(transport))).rejects.toThrow();
  });

  it("nurture stops as soon as the recipient is a paying customer", async () => {
    const email = newEmail();
    await confirmed(email);
    const user = await makeUser(email);
    const org = await makeOrg("PERSONAL");
    await addMember(org.id, user.id, "OWNER");
    await makeSubscription(org.id, "ACTIVE", "B2C_MONTHLY");
    const { sent, transport } = capture();
    expect(await sendNurtureStep(testDb(), { email, template: "nurture-3" }, options(transport))).toEqual({ sent: false, reason: "CUSTOMER" });
    expect(sent).toHaveLength(0);
  });

  it("nurture-1 sends through the gate with the flow idempotency key", async () => {
    const email = newEmail();
    await confirmed(email);
    const { sent, transport } = capture();
    expect((await sendNurtureStep(testDb(), { email, template: "nurture-1" }, options(transport))).sent).toBe(true);
    expect(await testDb().emailMessage.count({ where: { idempotencyKey: `flow:nurture:${email}:nurture-1` } })).toBe(1);
    expect(sent).toHaveLength(1);
  });
});
