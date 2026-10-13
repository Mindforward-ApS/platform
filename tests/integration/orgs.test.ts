import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createBusinessOrg, runStart } from "@/server/orgs/service";
import { addMember, makeOrg, makeSession, makeUser, testDb } from "./helpers";

async function startFor(user: { id: string; email: string; name: string }, sessionId: string) {
  const session = await testDb().session.findUniqueOrThrow({ where: { id: sessionId } });
  return runStart(testDb(), { user, sessionId, activeOrganizationId: session.activeOrganizationId });
}

describe("runStart", () => {
  it("gives a new B2C user a PERSONAL org with 1 seat and the OWNER role, and activates it", async () => {
    const user = await makeUser();
    const s = await makeSession(user.id);
    const result = await startFor(user, s.id);
    expect(result).toEqual({ redirectTo: "/konto" });

    const memberships = await testDb().membership.findMany({ where: { userId: user.id }, include: { organization: true } });
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({ role: "OWNER", organization: { type: "PERSONAL", seatLimit: 1 } });
    const session = await testDb().session.findUniqueOrThrow({ where: { id: s.id } });
    expect(session.activeOrganizationId).toBe(memberships[0]?.organizationId);
    expect(await testDb().auditLog.count({ where: { action: "ORG_CREATED", actorUserId: user.id } })).toBe(1);
  });

  it("is idempotent: a second start does not create a second PERSONAL org", async () => {
    const user = await makeUser();
    const s = await makeSession(user.id);
    await startFor(user, s.id);
    await startFor(user, s.id);
    expect(await testDb().membership.count({ where: { userId: user.id } })).toBe(1);
  });

  it("does not create a PERSONAL org for an invited user; sends them to the invitation", async () => {
    const [org, inviter] = await Promise.all([makeOrg(), makeUser()]);
    const email = `invited-${randomUUID()}@example.test`;
    const inv = await testDb().invitation.create({
      data: { id: randomUUID(), organizationId: org.id, email, role: "LEARNER", inviterId: inviter.id, expiresAt: new Date(Date.now() + 86400_000) },
    });
    const user = await makeUser(email);
    const s = await makeSession(user.id);
    expect(await startFor(user, s.id)).toEqual({ redirectTo: `/invitation/${inv.id}` });
    expect(await testDb().membership.count({ where: { userId: user.id } })).toBe(0);
  });

  it("ignores expired invitations", async () => {
    const [org, inviter] = await Promise.all([makeOrg(), makeUser()]);
    const email = `late-${randomUUID()}@example.test`;
    await testDb().invitation.create({
      data: { id: randomUUID(), organizationId: org.id, email, role: "LEARNER", inviterId: inviter.id, expiresAt: new Date(Date.now() - 1000) },
    });
    const user = await makeUser(email);
    const s = await makeSession(user.id);
    expect(await startFor(user, s.id)).toEqual({ redirectTo: "/konto" });
  });

  it("activates an existing membership instead of creating a PERSONAL org", async () => {
    const [org, user] = await Promise.all([makeOrg(), makeUser()]);
    await addMember(org.id, user.id, "LEARNER");
    const s = await makeSession(user.id);
    await startFor(user, s.id);
    expect((await testDb().session.findUniqueOrThrow({ where: { id: s.id } })).activeOrganizationId).toBe(org.id);
    expect(await testDb().organization.count({ where: { members: { some: { userId: user.id } }, type: "PERSONAL" } })).toBe(0);
  });
});

describe("createBusinessOrg", () => {
  it("creates a BUSINESS org with the creator as OWNER, activates it and writes an audit row", async () => {
    const user = await makeUser();
    const s = await makeSession(user.id);
    const org = await createBusinessOrg(testDb(), { userId: user.id, sessionId: s.id, name: "Nordisk Test A/S" });
    expect(org).toMatchObject({ type: "BUSINESS", name: "Nordisk Test A/S", seatLimit: 5 });
    expect(await testDb().membership.findFirstOrThrow({ where: { organizationId: org.id } })).toMatchObject({ userId: user.id, role: "OWNER" });
    expect((await testDb().session.findUniqueOrThrow({ where: { id: s.id } })).activeOrganizationId).toBe(org.id);
    expect(await testDb().auditLog.count({ where: { action: "ORG_CREATED", organizationId: org.id } })).toBe(1);
  });

  it("rejects an empty name", async () => {
    const user = await makeUser();
    const s = await makeSession(user.id);
    await expect(createBusinessOrg(testDb(), { userId: user.id, sessionId: s.id, name: "  " })).rejects.toThrow();
  });
});
