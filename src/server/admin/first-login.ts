import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";

// docs/10 § 1.6: B2B employees see, once per organization, what their admin can and cannot see. The
// acknowledgement is stored as AuditLog FIRST_LOGIN_INFO_SHOWN (no schema change needed).

export async function needsFirstLoginInfo(db: PrismaClient, userId: string, organizationId: string): Promise<boolean> {
  const membership = await db.membership.findFirst({
    where: { userId, organizationId, deactivatedAt: null },
    select: { role: true, organization: { select: { type: true } } },
  });
  if (!membership || membership.organization.type !== "BUSINESS" || membership.role === "OWNER") return false;
  const seen = await db.auditLog.count({ where: { action: "FIRST_LOGIN_INFO_SHOWN", actorUserId: userId, organizationId } });
  return seen === 0;
}

export async function acknowledgeFirstLoginInfo(db: PrismaClient, userId: string, organizationId: string): Promise<void> {
  if (!(await needsFirstLoginInfo(db, userId, organizationId))) return;
  await writeAudit(db, { action: "FIRST_LOGIN_INFO_SHOWN", actorUserId: userId, organizationId, targetType: "membership", targetId: userId });
}
