import "server-only";
import type { ActorType, Prisma, PrismaClient } from "@/generated/prisma/client";
import type { AuditAction } from "./actions";

type Db = PrismaClient | Prisma.TransactionClient;

export interface AuditEntry {
  action: AuditAction;
  actorType?: ActorType;
  actorUserId?: string | null;
  organizationId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonObject;
  ip?: string | null;
  userAgent?: string | null;
}

export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.auditLog.create({
    data: {
      action: entry.action,
      actorType: entry.actorType ?? (entry.actorUserId ? "USER" : "SYSTEM"),
      actorUserId: entry.actorUserId ?? null,
      organizationId: entry.organizationId ?? null,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: entry.metadata,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    },
  });
}
