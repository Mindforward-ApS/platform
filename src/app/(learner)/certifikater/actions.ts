"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireActiveMembership, requireUser } from "@/server/auth/authz";
import { setPublicVerification } from "@/server/certificates/service";
import { decideTransfer, TransferError } from "@/server/certificates/transfer";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";

/** Opt-in public verification page (§ 10a). Only the holder can change it. */
export async function togglePublicVerification(formData: FormData) {
  const ctx = await requireUser();
  const input = z.object({ certificateId: z.string().min(1).max(64), enabled: z.enum(["0", "1"]) }).parse(Object.fromEntries(formData));
  await setPublicVerification(db(), ctx.user.id, input.certificateId, input.enabled === "1");
  refresh();
}

const Input = z.object({ fromOrganizationId: z.string().min(1).max(64), decision: z.enum(["accept", "decline"]) });

/** The learner's own yes/no to bringing results from another of their accounts into the active one. */
export async function decideCredentialTransfer(formData: FormData) {
  const ctx = await requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]);
  const input = Input.parse({ fromOrganizationId: formData.get("fromOrganizationId"), decision: formData.get("decision") });
  try {
    await decideTransfer(db(), { userId: ctx.user.id, fromOrganizationId: input.fromOrganizationId, toOrganizationId: ctx.membership.organizationId, accept: input.decision === "accept" });
  } catch (err) {
    // Already decided (double submit) or not their account: nothing to change; the offer simply disappears.
    if (!(err instanceof TransferError)) throw err;
    logger.warn("credential_transfer.refused", { code: err.code });
  }
  refresh();
}
