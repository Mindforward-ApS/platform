import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { sendServiceEmail, type EmailTransport } from "@/server/email/send";
import { testDb } from "./helpers";

function fakeTransport() {
  const sent: { to: string; subject: string; idempotencyKey: string }[] = [];
  const transport: EmailTransport = {
    name: "fake",
    send: vi.fn(async (m) => {
      sent.push({ to: m.to, subject: m.subject, idempotencyKey: m.idempotencyKey });
      return { providerId: `fake-${randomUUID()}` };
    }),
  };
  return { transport, sent };
}

const vars = { url: "https://greb.example/invitation/x", organizationName: "Org", inviterName: "Mette" };

describe("sendServiceEmail", () => {
  it("logs every message in EmailMessage with status SENT", async () => {
    const { transport, sent } = fakeTransport();
    const key = `test:${randomUUID()}`;
    const msg = await sendServiceEmail(testDb(), { template: "invitation", to: "a@greb.test", vars, idempotencyKey: key }, { transport, allowlist: "@greb.test", enforceAllowlist: true });
    expect(msg.status).toBe("SENT");
    expect(sent).toHaveLength(1);
    const row = await testDb().emailMessage.findUniqueOrThrow({ where: { idempotencyKey: key } });
    expect(row).toMatchObject({ category: "SERVICE", template: "invitation", toEmail: "a@greb.test", status: "SENT" });
  });

  it("is idempotent: the same key is never sent twice", async () => {
    const { transport, sent } = fakeTransport();
    const key = `test:${randomUUID()}`;
    const args = { template: "invitation" as const, to: "a@greb.test", vars, idempotencyKey: key };
    await sendServiceEmail(testDb(), args, { transport, allowlist: "@greb.test", enforceAllowlist: true });
    await sendServiceEmail(testDb(), args, { transport, allowlist: "@greb.test", enforceAllowlist: true });
    expect(sent).toHaveLength(1);
    expect(await testDb().emailMessage.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("drops mail to non-allowlisted recipients outside production and logs it as SUPPRESSED", async () => {
    const { transport, sent } = fakeTransport();
    const key = `test:${randomUUID()}`;
    const msg = await sendServiceEmail(testDb(), { template: "invitation", to: "real.person@gmail.com", vars, idempotencyKey: key }, { transport, allowlist: "@greb.test", enforceAllowlist: true });
    expect(msg.status).toBe("SUPPRESSED");
    expect(sent).toHaveLength(0);
  });

  it("marks the message FAILED when the transport fails", async () => {
    const transport: EmailTransport = { name: "broken", send: vi.fn(async () => Promise.reject(new Error("down"))) };
    const key = `test:${randomUUID()}`;
    await expect(
      sendServiceEmail(testDb(), { template: "invitation", to: "a@greb.test", vars, idempotencyKey: key }, { transport, allowlist: "@greb.test", enforceAllowlist: true }),
    ).rejects.toThrow();
    expect((await testDb().emailMessage.findUniqueOrThrow({ where: { idempotencyKey: key } })).status).toBe("FAILED");
  });
});
