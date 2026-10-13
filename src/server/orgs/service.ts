import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Organization, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { decideStart } from "./start";

/** B2B trial: up to 5 users until billing (M6) sets seatLimit from Subscription.quantity. */
const BUSINESS_TRIAL_SEATS = 5;

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomUUID().slice(0, 6)}`;
}

export async function setActiveOrganization(db: PrismaClient, sessionId: string, organizationId: string): Promise<void> {
  await db.session.update({ where: { id: sessionId }, data: { activeOrganizationId: organizationId } });
}

export interface StartArgs {
  user: { id: string; email: string; name: string };
  sessionId: string;
  activeOrganizationId: string | null;
}

/** Post-login step: pick or create the user's organization context and say where to go next. */
export async function runStart(db: PrismaClient, args: StartArgs): Promise<{ redirectTo: string; organizationId?: string }> {
  const [memberships, invitations] = await Promise.all([
    db.membership.findMany({
      where: { userId: args.user.id, deactivatedAt: null, organization: { deletedAt: null } },
      orderBy: { createdAt: "asc" },
      select: { organizationId: true },
    }),
    db.invitation.findMany({
      where: { email: args.user.email.toLowerCase(), status: "pending", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  const decision = decideStart({
    activeOrganizationId: args.activeOrganizationId,
    memberships,
    pendingInvitationIds: invitations.map((i) => i.id),
  });

  switch (decision.kind) {
    case "continue":
      return { redirectTo: "/konto", organizationId: args.activeOrganizationId ?? undefined };
    case "activate":
      await setActiveOrganization(db, args.sessionId, decision.organizationId);
      return { redirectTo: "/konto", organizationId: decision.organizationId };
    case "open-invitation":
      return { redirectTo: `/invitation/${decision.invitationId}` };
    case "create-personal-org": {
      const org = await createPersonalOrg(db, args.user);
      await setActiveOrganization(db, args.sessionId, org.id);
      return { redirectTo: "/konto", organizationId: org.id };
    }
  }
}

async function createPersonalOrg(db: PrismaClient, user: { id: string; name: string }): Promise<Organization> {
  return db.$transaction(async (tx) => {
    // Re-check inside the transaction so two concurrent /start requests cannot create two PERSONAL orgs.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`personal-org:${user.id}`}))`;
    const existing = await tx.organization.findFirst({ where: { type: "PERSONAL", members: { some: { userId: user.id } } } });
    if (existing) return existing;
    const org = await tx.organization.create({
      data: { id: randomUUID(), name: user.name || "Personlig konto", slug: `p-${randomUUID()}`, type: "PERSONAL", seatLimit: 1 },
    });
    await tx.membership.create({ data: { id: randomUUID(), organizationId: org.id, userId: user.id, role: "OWNER" } });
    await writeAudit(tx, { action: "ORG_CREATED", actorUserId: user.id, organizationId: org.id, targetType: "organization", targetId: org.id, metadata: { type: "PERSONAL" } });
    return org;
  });
}

export const businessOrgInput = z.object({ name: z.string().trim().min(2, "Navnet skal være mindst 2 tegn").max(120) });

export async function createBusinessOrg(
  db: PrismaClient,
  args: { userId: string; sessionId: string; name: string },
): Promise<Organization> {
  const { name } = businessOrgInput.parse({ name: args.name });
  const org = await db.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: { id: randomUUID(), name, slug: slugify(name), type: "BUSINESS", seatLimit: BUSINESS_TRIAL_SEATS },
    });
    await tx.membership.create({ data: { id: randomUUID(), organizationId: created.id, userId: args.userId, role: "OWNER" } });
    await writeAudit(tx, { action: "ORG_CREATED", actorUserId: args.userId, organizationId: created.id, targetType: "organization", targetId: created.id, metadata: { type: "BUSINESS" } });
    return created;
  });
  await setActiveOrganization(db, args.sessionId, org.id);
  return org;
}
