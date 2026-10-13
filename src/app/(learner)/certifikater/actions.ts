"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/auth/authz";
import { setPublicVerification } from "@/server/certificates/service";
import { db } from "@/server/db";

/** Opt-in public verification page (§ 10a). Only the holder can change it. */
export async function togglePublicVerification(formData: FormData) {
  const ctx = await requireUser();
  const input = z.object({ certificateId: z.string().min(1).max(64), enabled: z.enum(["0", "1"]) }).parse(Object.fromEntries(formData));
  await setPublicVerification(db(), ctx.user.id, input.certificateId, input.enabled === "1");
  refresh();
}
