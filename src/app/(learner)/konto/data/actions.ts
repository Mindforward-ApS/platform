"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { serverEnv } from "@/lib/env";
import { getMessages } from "@/lib/i18n";
import { requireUser } from "@/server/auth/authz";
import { getAuth } from "@/server/auth/better-auth";
import { db } from "@/server/db";
import { confirmAccountDeletion, GdprError, startAccountDeletion } from "@/server/gdpr/service";
import { requestUserErase } from "@/server/jobs/org-admin";
import { logger } from "@/server/observability/logger";

export async function requestDeletion(_prev: FormState | null): Promise<FormState> {
  const ctx = await requireUser();
  const t = getMessages().orgAdmin.myData;
  try {
    await startAccountDeletion(db(), ctx.user, serverEnv().APP_URL);
    return { ok: t.deleteSent };
  } catch (err) {
    if (err instanceof GdprError && err.code === "OWNER_MUST_TRANSFER") return { error: t.ownerBlocked };
    throw err;
  }
}

/** Confirmation from the mailed link (the user must be logged in as the same account). */
export async function confirmDeletion(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireUser();
  const t = getMessages().orgAdmin.myData;
  const token = z.string().min(10).max(200).safeParse(formData.get("token"));
  if (!token.success) return { error: t.confirmInvalid };
  try {
    await confirmAccountDeletion(db(), ctx.user.id, token.data);
  } catch (err) {
    if (err instanceof GdprError) return { error: err.code === "OWNER_MUST_TRANSFER" ? t.ownerBlocked : t.confirmInvalid };
    throw err;
  }
  await requestUserErase(ctx.user.id);
  try {
    await getAuth().api.signOut({ headers: await headers() });
  } catch (err) {
    logger.warn("gdpr.signout_after_delete_failed", { err });
  }
  redirect("/?konto=slettet");
}
