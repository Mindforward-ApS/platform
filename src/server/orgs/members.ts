import "server-only";
import type { JobRole, LicenseTier, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import { OrgAdminError } from "./errors";
import { enrollInTrack } from "./invitations";
import { decideSeats, seatLimitOf, seatsInUse } from "./seats";

// Member management for company admins (docs/01 V3). Every function is org-scoped: the member must belong to
// `organizationId`, which the caller got from requireOrgAdmin/requireActiveMembership.

interface Scope {
  organizationId: string;
  actorUserId: string;
}

async function findMember(db: PrismaClient, scope: Scope, memberId: string) {
  const member = await db.membership.findFirst({ where: { id: memberId, organizationId: scope.organizationId }, select: { id: true, userId: true, role: true, deactivatedAt: true, jobRole: true } });
  if (!member) throw new OrgAdminError("NOT_FOUND");
  return member;
}

/** Sets the member's single active track (others are deactivated, never deleted — progress stays). null = none. */
export async function assignTrack(db: PrismaClient, scope: Scope, memberId: string, trackId: string | null, licenseTier: LicenseTier | null): Promise<void> {
  const member = await findMember(db, scope, memberId);
  if (trackId) {
    const track = await db.track.findFirst({ where: { id: trackId, isActive: true }, select: { id: true, licenseTiers: true } });
    if (!track) throw new OrgAdminError("NOT_FOUND");
    const tier = licenseTier && track.licenseTiers.includes(licenseTier) ? licenseTier : null;
    await db.$transaction(async (tx) => {
      await tx.trackEnrollment.updateMany({ where: { organizationId: scope.organizationId, userId: member.userId, trackId: { not: trackId } }, data: { active: false } });
      await enrollInTrack(tx, scope.organizationId, member.userId, trackId, tier);
    });
  } else {
    await db.trackEnrollment.updateMany({ where: { organizationId: scope.organizationId, userId: member.userId }, data: { active: false } });
  }
  await writeAudit(db, { action: "MEMBER_TRACK_ASSIGNED", actorUserId: scope.actorUserId, organizationId: scope.organizationId, targetType: "membership", targetId: member.id, metadata: { trackId, licenseTier } });
}

/** Sets the job role and assigns that role's ROLE modules (source ADMIN). Existing progress is never touched. */
export async function setJobRole(db: PrismaClient, scope: Scope, memberId: string, jobRole: JobRole | null): Promise<{ assigned: number }> {
  const member = await findMember(db, scope, memberId);
  await db.membership.update({ where: { id: member.id }, data: { jobRole } });
  let assigned = 0;
  if (jobRole) {
    const modules = await db.module.findMany({ where: { type: "ROLE", jobRole }, select: { id: true, sortOrder: true } });
    for (const m of modules) {
      const existing = await db.assignment.findUnique({ where: { organizationId_userId_moduleId: { organizationId: scope.organizationId, userId: member.userId, moduleId: m.id } }, select: { id: true, status: true } });
      if (existing && existing.status !== "REMOVED") continue;
      await db.assignment.upsert({
        where: { organizationId_userId_moduleId: { organizationId: scope.organizationId, userId: member.userId, moduleId: m.id } },
        create: { organizationId: scope.organizationId, userId: member.userId, moduleId: m.id, source: "ADMIN", assignedById: scope.actorUserId, sortOrder: m.sortOrder },
        update: { status: "ASSIGNED", source: "ADMIN", assignedById: scope.actorUserId },
      });
      assigned++;
    }
  }
  await writeAudit(db, { action: "MEMBER_JOB_ROLE_CHANGED", actorUserId: scope.actorUserId, organizationId: scope.organizationId, targetType: "membership", targetId: member.id, metadata: { jobRole, previous: member.jobRole, assignedRoleModules: assigned } });
  return { assigned };
}

/** Removes the member from the org: the seat is freed, learning data stays for the org report (docs/03 § 3). */
export async function deactivateMember(db: PrismaClient, scope: Scope, memberId: string): Promise<void> {
  const member = await findMember(db, scope, memberId);
  if (member.role === "OWNER") throw new OrgAdminError("OWNER_PROTECTED");
  if (member.deactivatedAt) return;
  await db.$transaction(async (tx) => {
    await tx.membership.update({ where: { id: member.id }, data: { deactivatedAt: new Date() } });
    // Sessions pointing at this org lose it; requireActiveMembership already rejects deactivated members.
    await tx.session.updateMany({ where: { userId: member.userId, activeOrganizationId: scope.organizationId }, data: { activeOrganizationId: null } });
    await writeAudit(tx, { action: "MEMBER_DEACTIVATED", actorUserId: scope.actorUserId, organizationId: scope.organizationId, targetType: "membership", targetId: member.id });
  });
}

export async function reactivateMember(db: PrismaClient, scope: Scope, memberId: string): Promise<void> {
  const member = await findMember(db, scope, memberId);
  if (!member.deactivatedAt) return;
  const plan = await seatLimitOf(db, scope.organizationId);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`org-seats:${scope.organizationId}`}))`;
    const decision = decideSeats({ ...plan, used: await seatsInUse(tx, scope.organizationId), requested: 1 });
    if (!decision.ok) throw new OrgAdminError("SEAT_LIMIT_REACHED", decision.message);
    await tx.membership.update({ where: { id: member.id }, data: { deactivatedAt: null } });
    await writeAudit(tx, { action: "MEMBER_REACTIVATED", actorUserId: scope.actorUserId, organizationId: scope.organizationId, targetType: "membership", targetId: member.id });
  });
}

/**
 * GDPR on the customer's instruction (docs/10 § 1.5): deletes one employee's learning data IN THIS ORG and the
 * membership. The user account itself (and data in other orgs) is untouched. Evidence tables keep SetNull rows.
 */
export async function eraseMemberFromOrg(db: PrismaClient, scope: Scope, memberId: string): Promise<void> {
  const member = await findMember(db, scope, memberId);
  if (member.role === "OWNER") throw new OrgAdminError("OWNER_PROTECTED");
  const where = { organizationId: scope.organizationId, userId: member.userId };
  await db.$transaction(async (tx) => {
    await tx.attempt.deleteMany({ where }); // cascades StepResult (promptText included)
    await tx.sandboxSession.deleteMany({ where }); // cascades SandboxEvent
    await tx.monthlyAssignment.deleteMany({ where });
    await tx.certificate.deleteMany({ where });
    await tx.assignment.deleteMany({ where });
    await tx.trackEnrollment.deleteMany({ where });
    await tx.placementResult.deleteMany({ where });
    // Work profile, connector demo log and results the person brought along into this org.
    await tx.workProfile.deleteMany({ where });
    await tx.connectorDemoRun.deleteMany({ where });
    await tx.calendarEvent.deleteMany({ where }); // own Kalender blocks in this org
    await tx.certificateShare.deleteMany({ where });
    await tx.credentialTransfer.deleteMany({ where: { userId: member.userId, OR: [{ toOrganizationId: scope.organizationId }, { fromOrganizationId: scope.organizationId }] } });
    await tx.session.updateMany({ where: { userId: member.userId, activeOrganizationId: scope.organizationId }, data: { activeOrganizationId: null } });
    await tx.membership.delete({ where: { id: member.id } });
    await writeAudit(tx, { action: "MEMBER_DATA_ERASED", actorUserId: scope.actorUserId, organizationId: scope.organizationId, targetType: "membership", targetId: member.id });
  });
}
