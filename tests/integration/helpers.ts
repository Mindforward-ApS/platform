import { randomUUID } from "node:crypto";
import type { MembershipRole, OrganizationType, PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/server/db";

let client: PrismaClient | undefined;

export function testDb(): PrismaClient {
  client ??= createPrismaClient(process.env.TEST_DATABASE_URL ?? "postgresql://greb@127.0.0.1:5435/greb_test");
  return client;
}

export async function makeUser(email = `u-${randomUUID()}@example.test`) {
  return testDb().user.create({ data: { id: randomUUID(), name: "Test Bruger", email, emailVerified: true } });
}

export async function makeOrg(type: OrganizationType = "BUSINESS") {
  const id = randomUUID();
  return testDb().organization.create({ data: { id, name: `Org ${id.slice(0, 6)}`, slug: `org-${id}`, type, seatLimit: type === "PERSONAL" ? 1 : 5 } });
}

export async function addMember(organizationId: string, userId: string, role: MembershipRole) {
  return testDb().membership.create({ data: { id: randomUUID(), organizationId, userId, role } });
}

export async function makeSession(userId: string, activeOrganizationId: string | null = null) {
  return testDb().session.create({
    data: { id: randomUUID(), token: randomUUID(), userId, expiresAt: new Date(Date.now() + 3600_000), activeOrganizationId },
  });
}
