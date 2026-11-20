import { randomUUID } from "node:crypto";
import { Webhook } from "svix";
import { describe, expect, it } from "vitest";
import { canSendMarketing, confirmMarketingConsent, emailHash, grantMarketingConsent } from "@/server/email/consent";
import { handleResendWebhook } from "@/server/email/resend-webhook";
import { testDb } from "./helpers";

const secret = `whsec_${Buffer.from("resend-webhook-test-secret-32by").toString("base64")}`;
const pepper = "integration-pepper-integration";
const meta = { ip: "203.0.113.9", userAgent: "vitest" };
const newEmail = () => `rw-${randomUUID().slice(0, 8)}@example.test`;

function signed(body: object, opts: { id?: string; secret?: string; at?: Date } = {}) {
  const raw = JSON.stringify(body);
  const id = opts.id ?? `msg_${randomUUID()}`;
  const at = opts.at ?? new Date();
  const signature = new Webhook(opts.secret ?? secret).sign(id, at, raw);
  const h = new Map([
    ["svix-id", id],
    ["svix-timestamp", String(Math.floor(at.getTime() / 1000))],
    ["svix-signature", signature],
  ]);
  return { raw, id, headers: { get: (n: string) => h.get(n) ?? null } };
}

async function messageFor(email: string, category: "SERVICE" | "MARKETING" = "SERVICE") {
  const resendId = randomUUID();
  await testDb().emailMessage.create({ data: { category, template: "magic-link", templateVersion: "1", toEmail: email, idempotencyKey: `t:${resendId}`, subject: "s", resendId, status: "SENT" } });
  return resendId;
}

const deps = () => ({ db: testDb(), secret, pepper });

describe("POST /api/webhooks/resend (handleResendWebhook)", () => {
  it("rejects an invalid or missing signature before parsing, and writes nothing", async () => {
    const email = newEmail();
    const event = { type: "email.complained", data: { email_id: randomUUID(), to: [email] } };
    const forged = signed(event, { secret: `whsec_${Buffer.from("another-secret-another-secret-12").toString("base64")}` });
    expect((await handleResendWebhook(deps(), forged.raw, forged.headers)).status).toBe(400);
    const tampered = signed(event);
    expect((await handleResendWebhook(deps(), tampered.raw.replace("complained", "delivered"), tampered.headers)).status).toBe(400);
    expect((await handleResendWebhook(deps(), "not json", { get: () => null })).status).toBe(400);
    const stale = signed(event, { at: new Date(Date.now() - 60 * 60 * 1000) });
    expect((await handleResendWebhook(deps(), stale.raw, stale.headers)).status).toBe(400);
    expect(await testDb().webhookEvent.count({ where: { externalId: { in: [forged.id, tampered.id, stale.id] } } })).toBe(0);
    expect(await testDb().consentRecord.count({ where: { subjectEmail: email } })).toBe(0);
  });

  it("answers 503 when RESEND_WEBHOOK_SECRET is not configured", async () => {
    const req = signed({ type: "email.delivered", data: {} });
    expect((await handleResendWebhook({ db: testDb(), secret: "", pepper }, req.raw, req.headers)).status).toBe(503);
  });

  it("delivered → EmailMessage DELIVERED; a replayed event is a no-op (WebhookEvent dedup)", async () => {
    const resendId = await messageFor(newEmail());
    const req = signed({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: resendId } });
    expect(await handleResendWebhook(deps(), req.raw, req.headers)).toEqual({ status: 200, body: { ok: true } });
    expect(await handleResendWebhook(deps(), req.raw, req.headers)).toEqual({ status: 200, body: { ok: true, duplicate: true } });
    expect((await testDb().emailMessage.findUniqueOrThrow({ where: { resendId } })).status).toBe("DELIVERED");
    expect(await testDb().webhookEvent.count({ where: { provider: "RESEND", externalId: req.id } })).toBe(1);
  });

  it("hard bounce → BOUNCED + suppression for SERVICE too; soft bounce suppresses nothing", async () => {
    const hardEmail = newEmail();
    const hard = signed({ type: "email.bounced", data: { email_id: await messageFor(hardEmail), bounce: { type: "Permanent", subType: "General" } } });
    await handleResendWebhook(deps(), hard.raw, hard.headers);
    expect(await testDb().emailSuppression.findUnique({ where: { emailHash: emailHash(hardEmail, pepper) } })).toMatchObject({ reason: "HARD_BOUNCE", appliesToService: true });

    const softEmail = newEmail();
    const softId = await messageFor(softEmail);
    const soft = signed({ type: "email.bounced", data: { email_id: softId, bounce: { type: "Temporary" } } });
    await handleResendWebhook(deps(), soft.raw, soft.headers);
    expect(await testDb().emailSuppression.findUnique({ where: { emailHash: emailHash(softEmail, pepper) } })).toBeNull();
    expect((await testDb().emailMessage.findUniqueOrThrow({ where: { resendId: softId } })).status).toBe("SENT");
  });

  it("complaint → COMPLAINED + COMPLAINT suppression + ConsentRecord WITHDRAWN (gate closes), idempotently", async () => {
    const email = newEmail();
    const grant = await grantMarketingConsent(testDb(), { email, source: "PLACEMENT_RESULT", ...meta });
    if (grant.status !== "GRANTED") throw new Error("expected GRANTED");
    await confirmMarketingConsent(testDb(), grant.token, meta, { pepper });
    expect((await canSendMarketing(testDb(), email, { pepper })).allowed).toBe(true);

    const resendId = await messageFor(email, "MARKETING");
    const req = signed({ type: "email.complained", data: { email_id: resendId, to: [email] } });
    expect((await handleResendWebhook(deps(), req.raw, req.headers)).status).toBe(200);
    expect((await handleResendWebhook(deps(), req.raw, req.headers)).body.duplicate).toBe(true);

    expect((await testDb().emailMessage.findUniqueOrThrow({ where: { resendId } })).status).toBe("COMPLAINED");
    expect(await testDb().emailSuppression.findUnique({ where: { emailHash: emailHash(email, pepper) } })).toMatchObject({ reason: "COMPLAINT" });
    const withdrawn = await testDb().consentRecord.findMany({ where: { subjectEmail: email, action: "WITHDRAWN" } });
    expect(withdrawn).toHaveLength(1);
    expect(withdrawn[0]?.source).toBe("EMAIL_COMPLAINT");
    expect(await canSendMarketing(testDb(), email, { pepper })).toEqual({ allowed: false, reason: "SUPPRESSED" });
  });
});
