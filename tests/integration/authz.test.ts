import { describe, expect, it } from "vitest";
import { AuthzError, assertMembership, assertPlatformAdmin } from "@/server/auth/authz-core";
import { addMember, makeOrg, makeSession, makeUser, testDb } from "./helpers";

describe("assertMembership", () => {
  it("returns the membership when the role is allowed", async () => {
    const [org, user] = await Promise.all([makeOrg(), makeUser()]);
    await addMember(org.id, user.id, "ADMIN");
    const m = await assertMembership(testDb(), user.id, org.id, ["OWNER", "ADMIN"]);
    expect(m.role).toBe("ADMIN");
  });

  it("rejects a LEARNER from admin actions with 403", async () => {
    const [org, user] = await Promise.all([makeOrg(), makeUser()]);
    await addMember(org.id, user.id, "LEARNER");
    await expect(assertMembership(testDb(), user.id, org.id, ["OWNER", "ADMIN"])).rejects.toMatchObject({ status: 403 });
  });

  it("rejects a user from org A acting on org B (cross-org)", async () => {
    const [orgA, orgB, user] = await Promise.all([makeOrg(), makeOrg(), makeUser()]);
    await addMember(orgA.id, user.id, "OWNER");
    await expect(assertMembership(testDb(), user.id, orgB.id, ["OWNER", "ADMIN", "LEARNER"])).rejects.toBeInstanceOf(AuthzError);
  });

  it("rejects a deactivated membership", async () => {
    const [org, user] = await Promise.all([makeOrg(), makeUser()]);
    const m = await addMember(org.id, user.id, "OWNER");
    await testDb().membership.update({ where: { id: m.id }, data: { deactivatedAt: new Date() } });
    await expect(assertMembership(testDb(), user.id, org.id, ["OWNER"])).rejects.toMatchObject({ status: 403 });
  });
});

describe("assertPlatformAdmin", () => {
  it("rejects ordinary users", async () => {
    const user = await makeUser();
    const s = await makeSession(user.id);
    await expect(assertPlatformAdmin(testDb(), user.id, s.id)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  it("requires 2FA setup, then 2FA verification for this session", async () => {
    const user = await makeUser();
    await testDb().user.update({ where: { id: user.id }, data: { platformRole: "GREB_ADMIN" } });
    const s = await makeSession(user.id);
    await expect(assertPlatformAdmin(testDb(), user.id, s.id)).rejects.toMatchObject({ code: "TWO_FACTOR_SETUP_REQUIRED" });

    await testDb().user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    await expect(assertPlatformAdmin(testDb(), user.id, s.id)).rejects.toMatchObject({ code: "TWO_FACTOR_REQUIRED" });

    await testDb().session.update({ where: { id: s.id }, data: { twoFactorVerifiedAt: new Date() } });
    await expect(assertPlatformAdmin(testDb(), user.id, s.id)).resolves.toBeUndefined();
  });

  it("does not accept 2FA verified on a different session", async () => {
    const user = await makeUser();
    await testDb().user.update({ where: { id: user.id }, data: { platformRole: "GREB_ADMIN", twoFactorEnabled: true } });
    const [verified, other] = [await makeSession(user.id), await makeSession(user.id)];
    await testDb().session.update({ where: { id: verified.id }, data: { twoFactorVerifiedAt: new Date() } });
    await expect(assertPlatformAdmin(testDb(), user.id, other.id)).rejects.toMatchObject({ code: "TWO_FACTOR_REQUIRED" });
  });
});
