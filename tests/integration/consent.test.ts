import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  canSendMarketing,
  confirmationState,
  confirmMarketingConsent,
  consentTextHash,
  emailHash,
  expireUnconfirmedConsents,
  grantMarketingConsent,
  withdrawMarketingConsent,
} from "@/server/email/consent";
import { sendMarketingEmail } from "@/server/email/send";
import { MARKETING_CONSENT } from "@/lib/legal/marketing-consent";
import { testDb } from "./helpers";

const pepper = "integration-pepper-integration";
const meta = { ip: "203.0.113.7", userAgent: "vitest-agent" };
const newEmail = () => `lead-${randomUUID().slice(0, 8)}@example.test`;
const DAY = 24 * 60 * 60 * 1000;

async function granted(email: string, now = new Date()) {
  const res = await grantMarketingConsent(testDb(), { email, source: "PLACEMENT_RESULT", ...meta }, now);
  if (res.status !== "GRANTED") throw new Error("expected GRANTED");
  return res;
}

describe("ConsentRecord: grant (checkbox)", () => {
  it("stores every required field and only the hash of the confirmation token", async () => {
    const email = newEmail();
    const res = await granted(` ${email.toUpperCase()} `);
    const row = await testDb().consentRecord.findUniqueOrThrow({ where: { id: res.grantId } });
    expect(row).toMatchObject({
      subjectEmail: email,
      purpose: "MARKETING_EMAIL",
      channel: "EMAIL",
      action: "GRANTED",
      source: "PLACEMENT_RESULT",
      textVersion: MARKETING_CONSENT.version,
      textHash: consentTextHash(MARKETING_CONSENT.text),
      ip: meta.ip,
      userAgent: meta.userAgent,
      confirmedAt: null,
    });
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.confirmationSentAt).toBeInstanceOf(Date);
    expect(row.confirmationTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.confirmationTokenHash).not.toBe(res.token);
  });

  it("is NOT valid before the opt-in click", async () => {
    const email = newEmail();
    await granted(email);
    expect(await canSendMarketing(testDb(), email, { pepper })).toEqual({ allowed: false, reason: "NOT_CONFIRMED" });
  });

  it("a test-only lead (no consent at all) cannot receive MARKETING", async () => {
    expect(await canSendMarketing(testDb(), newEmail(), { pepper })).toEqual({ allowed: false, reason: "NO_CONSENT" });
  });
});

describe("ConsentRecord: confirm (double opt-in)", () => {
  it("activates consent only on the click: CONFIRMED row + denormalised confirmedAt", async () => {
    const email = newEmail();
    const { grantId, token } = await granted(email);
    expect(await confirmationState(testDb(), token)).toBe("VALID");
    expect(await confirmMarketingConsent(testDb(), token, meta, { pepper })).toBe("CONFIRMED");

    const grant = await testDb().consentRecord.findUniqueOrThrow({ where: { id: grantId } });
    expect(grant.confirmedAt).toBeInstanceOf(Date);
    const confirmed = await testDb().consentRecord.findFirstOrThrow({ where: { grantId, action: "CONFIRMED" } });
    expect(confirmed).toMatchObject({ source: "CONFIRMATION_LINK", textVersion: grant.textVersion, textHash: grant.textHash, ip: meta.ip });
    expect(await canSendMarketing(testDb(), email, { pepper })).toEqual({ allowed: true, consentRecordId: confirmed.id });
  });

  it("double clicks are idempotent", async () => {
    const { grantId, token } = await granted(newEmail());
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    expect(await testDb().consentRecord.count({ where: { grantId, action: "CONFIRMED" } })).toBe(1);
  });

  it("the link expires after 7 days", async () => {
    const { token } = await granted(newEmail(), new Date(Date.now() - 8 * DAY));
    expect(await confirmMarketingConsent(testDb(), token, meta, { pepper })).toBe("EXPIRED");
  });

  it("an unknown token is invalid", async () => {
    expect(await confirmMarketingConsent(testDb(), "nope", meta, { pepper })).toBe("INVALID");
  });

  it("an already-confirmed address gets no new GRANTED row (which would switch consent off)", async () => {
    const email = newEmail();
    const { token } = await granted(email);
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    expect((await grantMarketingConsent(testDb(), { email, source: "PLACEMENT_RESULT", ...meta })).status).toBe("ALREADY_CONFIRMED");
    expect((await canSendMarketing(testDb(), email, { pepper })).allowed).toBe(true);
  });
});

describe("ConsentRecord: withdraw + suppression", () => {
  it("WITHDRAWN blocks immediately and writes a suppression hash", async () => {
    const email = newEmail();
    const { grantId, token } = await granted(email);
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    await withdrawMarketingConsent(testDb(), { email, source: "UNSUBSCRIBE_LINK", ...meta }, { pepper });

    expect((await canSendMarketing(testDb(), email, { pepper })).allowed).toBe(false);
    expect((await testDb().consentRecord.findUniqueOrThrow({ where: { id: grantId } })).withdrawnAt).toBeInstanceOf(Date);
    const supp = await testDb().emailSuppression.findUniqueOrThrow({ where: { emailHash: emailHash(email, pepper) } });
    expect(supp.reason).toBe("UNSUBSCRIBED");
  });

  it("an old confirmation link cannot re-activate consent after withdrawal", async () => {
    const email = newEmail();
    const { token } = await granted(email);
    await withdrawMarketingConsent(testDb(), { email, source: "UNSUBSCRIBE_LINK", ...meta }, { pepper });
    expect(await confirmMarketingConsent(testDb(), token, meta, { pepper })).toBe("WITHDRAWN");
  });

  it("suppression alone blocks a CONFIRMED consent", async () => {
    const email = newEmail();
    const { token } = await granted(email);
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    await testDb().emailSuppression.create({ data: { emailHash: emailHash(email, pepper), reason: "HARD_BOUNCE" } });
    expect(await canSendMarketing(testDb(), email, { pepper })).toEqual({ allowed: false, reason: "SUPPRESSED" });
  });

  it("a new confirmed consent lifts a self-unsubscribe", async () => {
    const email = newEmail();
    await withdrawMarketingConsent(testDb(), { email, source: "UNSUBSCRIBE_LINK", ...meta }, { pepper });
    const { token } = await granted(email);
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    expect((await canSendMarketing(testDb(), email, { pepper })).allowed).toBe(true);
  });

  it("the gate fails closed without EMAIL_HASH_PEPPER", async () => {
    await expect(canSendMarketing(testDb(), newEmail())).rejects.toThrow(/EMAIL_HASH_PEPPER/);
  });
});

describe("sendMarketingEmail (gate at send time)", () => {
  const base = { template: "marketing-confirm" as const, vars: { url: "https://x.test", expiresDays: 7 }, idempotencyKey: "never" };

  it("requires consentRecordId", async () => {
    await expect(sendMarketingEmail(testDb(), { ...base, to: newEmail(), consentRecordId: "" }, { marketingEnabled: true, pepper })).rejects.toThrow(/consentRecordId/);
  });

  it("refuses with the kill switch off, without consent, and with someone else's consent record", async () => {
    const email = newEmail();
    expect(await sendMarketingEmail(testDb(), { ...base, to: email, consentRecordId: "x" }, { marketingEnabled: false, pepper })).toEqual({ sent: false, reason: "KILL_SWITCH" });
    expect(await sendMarketingEmail(testDb(), { ...base, to: email, consentRecordId: "x" }, { marketingEnabled: true, pepper })).toEqual({ sent: false, reason: "NO_CONSENT" });
    const { token } = await granted(email);
    expect(await sendMarketingEmail(testDb(), { ...base, to: email, consentRecordId: "x" }, { marketingEnabled: true, pepper })).toEqual({ sent: false, reason: "NOT_CONFIRMED" });
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    expect(await sendMarketingEmail(testDb(), { ...base, to: email, consentRecordId: "other" }, { marketingEnabled: true, pepper })).toEqual({ sent: false, reason: "CONSENT_MISMATCH" });
  });

  it("with a valid consent it passes the gate but never sends a non-MARKETING template", async () => {
    const email = newEmail();
    const { token } = await granted(email);
    await confirmMarketingConsent(testDb(), token, meta, { pepper });
    const gate = await canSendMarketing(testDb(), email, { pepper });
    if (!gate.allowed) throw new Error("expected allowed");
    await expect(sendMarketingEmail(testDb(), { ...base, to: email, consentRecordId: gate.consentRecordId }, { marketingEnabled: true, pepper })).rejects.toThrow(/not a MARKETING template/);
    expect(await testDb().emailMessage.count({ where: { toEmail: email, category: "MARKETING" } })).toBe(0);
  });
});

describe("consent.expire-unconfirmed", () => {
  it("deletes unconfirmed GRANTED rows older than 30 days and keeps confirmed ones", async () => {
    const old = new Date(Date.now() - 31 * DAY);
    const stale = await granted(newEmail(), old);
    const kept = await granted(newEmail(), old);
    await testDb().consentRecord.update({ where: { id: kept.grantId }, data: { confirmedAt: old } });
    const fresh = await granted(newEmail());
    await expireUnconfirmedConsents(testDb());
    expect(await testDb().consentRecord.findUnique({ where: { id: stale.grantId } })).toBeNull();
    expect(await testDb().consentRecord.findUnique({ where: { id: kept.grantId } })).not.toBeNull();
    expect(await testDb().consentRecord.findUnique({ where: { id: fresh.grantId } })).not.toBeNull();
  });
});
