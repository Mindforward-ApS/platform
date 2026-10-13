import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { writeAudit } from "@/server/audit/log";
import type { ContentConfig } from "./config";

// Kill switches (docs/06 § 11): FeatureFlag rows win, env is the fallback. Read at every step — never cached.

export const PIPELINE_FLAG = "CONTENT_PIPELINE_ENABLED";
export const AUTOPUBLISH_FLAG = "CONTENT_AUTOPUBLISH_ENABLED";
export type KillSwitch = typeof PIPELINE_FLAG | typeof AUTOPUBLISH_FLAG;

async function flag(db: PrismaClient, key: KillSwitch, fallback: boolean): Promise<boolean> {
  const row = await db.featureFlag.findUnique({ where: { key }, select: { enabled: true } });
  return row ? row.enabled : fallback;
}

export const pipelineEnabled = (db: PrismaClient, cfg: Pick<ContentConfig, "pipelineEnabledDefault">) => flag(db, PIPELINE_FLAG, cfg.pipelineEnabledDefault);
export const autopublishEnabled = (db: PrismaClient, cfg: Pick<ContentConfig, "autopublishEnabledDefault">) => flag(db, AUTOPUBLISH_FLAG, cfg.autopublishEnabledDefault);

/** Admin toggle; always audited (docs/06 § 11). */
export async function setKillSwitch(db: PrismaClient, key: KillSwitch, enabled: boolean, actorUserId: string | null) {
  await db.$transaction(async (tx) => {
    await tx.featureFlag.upsert({ where: { key }, create: { key, enabled, updatedById: actorUserId }, update: { enabled, updatedById: actorUserId } });
    await writeAudit(tx, { action: "KILL_SWITCH_CHANGED", actorUserId, targetType: "FeatureFlag", targetId: key, metadata: { enabled } satisfies Prisma.InputJsonObject });
  });
}

/** Per-source kill switch (ContentSource.enabled); audited. */
export async function setSourceEnabled(db: PrismaClient, sourceId: string, enabled: boolean, actorUserId: string | null) {
  await db.$transaction(async (tx) => {
    const s = await tx.contentSource.update({ where: { id: sourceId }, data: { enabled } });
    await writeAudit(tx, { action: "KILL_SWITCH_CHANGED", actorUserId, targetType: "ContentSource", targetId: s.id, metadata: { key: s.key, enabled } });
  });
}
