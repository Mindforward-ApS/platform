import { generate } from "otplib";
import { describe, expect, it } from "vitest";
import { assertPlatformAdmin } from "@/server/auth/authz-core";
import { confirmEnrollment, startEnrollment, verifySessionCode } from "@/server/auth/two-factor";
import { makeSession, makeUser, testDb } from "./helpers";

async function admin() {
  const user = await makeUser();
  await testDb().user.update({ where: { id: user.id }, data: { platformRole: "GREB_ADMIN" } });
  return { user, session: await makeSession(user.id) };
}

describe("GREB_ADMIN TOTP", () => {
  it("enrolls with a valid code, unlocks this session and writes an audit row", async () => {
    const { user, session } = await admin();
    const { secret, otpauthUri } = await startEnrollment(testDb(), user);
    expect(otpauthUri).toMatch(/^otpauth:\/\/totp\//);
    expect(await confirmEnrollment(testDb(), { userId: user.id, sessionId: session.id, code: await generate({ secret }) })).toBe(true);
    await expect(assertPlatformAdmin(testDb(), user.id, session.id)).resolves.toBeUndefined();
    expect(await testDb().auditLog.count({ where: { action: "TWO_FACTOR_ENROLLED", actorUserId: user.id } })).toBe(1);
    const stored = await testDb().twoFactor.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.secret).not.toContain(secret);
  });

  it("rejects a wrong code during enrollment", async () => {
    const { user, session } = await admin();
    await startEnrollment(testDb(), user);
    expect(await confirmEnrollment(testDb(), { userId: user.id, sessionId: session.id, code: "000000" })).toBe(false);
    expect((await testDb().user.findUniqueOrThrow({ where: { id: user.id } })).twoFactorEnabled).toBe(false);
  });

  it("verifies a new session with a code, and refuses non-admins", async () => {
    const { user, session } = await admin();
    const { secret } = await startEnrollment(testDb(), user);
    await confirmEnrollment(testDb(), { userId: user.id, sessionId: session.id, code: await generate({ secret }) });
    const second = await makeSession(user.id);
    expect(await verifySessionCode(testDb(), { userId: user.id, sessionId: second.id, code: await generate({ secret }) })).toBe(true);
    await expect(assertPlatformAdmin(testDb(), user.id, second.id)).resolves.toBeUndefined();

    const plain = await makeUser();
    const ps = await makeSession(plain.id);
    expect(await verifySessionCode(testDb(), { userId: plain.id, sessionId: ps.id, code: "123456" })).toBe(false);
  });

  it("locks out after 5 wrong codes in 15 minutes", async () => {
    const { user, session } = await admin();
    const { secret } = await startEnrollment(testDb(), user);
    await confirmEnrollment(testDb(), { userId: user.id, sessionId: session.id, code: await generate({ secret }) });
    const s2 = await makeSession(user.id);
    for (let i = 0; i < 5; i++) await verifySessionCode(testDb(), { userId: user.id, sessionId: s2.id, code: "000000" });
    expect(await verifySessionCode(testDb(), { userId: user.id, sessionId: s2.id, code: await generate({ secret }) })).toBe(false);
  });
});
