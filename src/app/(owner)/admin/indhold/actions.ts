"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/server/auth/authz";
import { writeAudit } from "@/server/audit/log";
import { loadContentConfig } from "@/server/content-engine/config";
import { contentDeps } from "@/server/content-engine/deps";
import { AUTOPUBLISH_FLAG, PIPELINE_FLAG, setKillSwitch, setSourceEnabled } from "@/server/content-engine/flags";
import { copenhagenDate } from "@/server/content-engine/normalize";
import { ingestManualPaste } from "@/server/content-engine/pipeline";
import { publishVersion, PublishConflictError, rejectVersion, rollbackModule } from "@/server/content-engine/publish";
import { db } from "@/server/db";
import { inngest } from "@/server/jobs/client";
import { CONTENT_CHANGE_CREATED, CONTENT_SOURCE_RUN } from "@/server/jobs/content";

// Owner review actions (docs/06 §§ 10–11). Every action: requirePlatformAdmin() (GREB_ADMIN + 2FA) → Zod → AuditLog.

const PATH = "/admin/indhold";
const id = z.string().min(1).max(64);
const done = (msg: string): never => redirect(`${PATH}?besked=${msg}`);

export async function approveVersionAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const versionId = id.parse(formData.get("versionId"));
  try {
    await publishVersion(db(), versionId, { actorUserId: ctx.user.id, auto: false });
  } catch (err) {
    if (err instanceof PublishConflictError) done("conflict");
    throw err;
  }
  done("approved");
}

export async function rejectVersionAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const versionId = id.parse(formData.get("versionId"));
  const reason = z.string().max(500).optional().parse(formData.get("reason") ?? undefined);
  await rejectVersion(db(), versionId, { actorUserId: ctx.user.id, reason });
  done("rejected");
}

export async function rollbackModuleAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const moduleId = id.parse(formData.get("moduleId"));
  const r = await rollbackModule(db(), moduleId, { actorUserId: ctx.user.id });
  done(r.restoredVersionId ? "rolledBack" : "unpublished");
}

export async function toggleKillSwitchAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const key = z.enum([PIPELINE_FLAG, AUTOPUBLISH_FLAG]).parse(formData.get("key"));
  const enabled = z.enum(["0", "1"]).parse(formData.get("enabled")) === "1";
  await setKillSwitch(db(), key, enabled, ctx.user.id);
  done("saved");
}

export async function toggleSourceAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const sourceId = id.parse(formData.get("sourceId"));
  const enabled = z.enum(["0", "1"]).parse(formData.get("enabled")) === "1";
  await setSourceEnabled(db(), sourceId, enabled, ctx.user.id);
  done("saved");
}

/** "Hent nu" — at most once per hour per source (docs/06 § 2). */
export async function runSourceNowAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const sourceId = id.parse(formData.get("sourceId"));
  const now = new Date();
  const runKey = `${sourceId}:manual:${now.toISOString().slice(0, 13)}`;
  if (await db().pipelineRun.findUnique({ where: { idempotencyKey: runKey }, select: { id: true } })) done("runLimited");
  await writeAudit(db(), { action: "CONTENT_SOURCE_RUN_REQUESTED", actorUserId: ctx.user.id, targetType: "ContentSource", targetId: sourceId });
  await inngest.send({ name: CONTENT_SOURCE_RUN, data: { sourceId, date: copenhagenDate(now), runKey, manual: true } });
  done("runQueued");
}

export async function pasteSourceAction(formData: FormData) {
  const ctx = await requirePlatformAdmin();
  const sourceId = id.parse(formData.get("sourceId"));
  const text = z.string().trim().min(20).max(200_000).parse(formData.get("text"));
  const r = await ingestManualPaste({ ...contentDeps(), config: loadContentConfig() }, sourceId, text, ctx.user.id);
  if (r.outcome === "DONE" && r.changeEventIds.length > 0) {
    await inngest.send(r.changeEventIds.map((changeEventId) => ({ name: CONTENT_CHANGE_CREATED, data: { changeEventId } })));
  }
  done("pasted");
}
