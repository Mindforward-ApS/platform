"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { AuthzError, requireUser } from "@/server/auth/authz";
import { confirmEnrollment, startEnrollment, verifySessionCode } from "@/server/auth/two-factor";
import { db } from "@/server/db";

// Each action calls requireUser() and then checks GREB_ADMIN itself: requirePlatformAdmin() would reject
// the very sessions that are trying to complete 2FA.

async function requireGrebAdminUser() {
  const ctx = await requireUser();
  const user = await db().user.findUnique({ where: { id: ctx.user.id }, select: { platformRole: true, twoFactorEnabled: true } });
  if (user?.platformRole !== "GREB_ADMIN") throw new AuthzError(403, "FORBIDDEN");
  return { ...ctx, twoFactorEnabled: Boolean(user.twoFactorEnabled) };
}

const code = z.string().trim().regex(/^\d{6}$/);

export async function beginTwoFactorSetup() {
  const ctx = await requireGrebAdminUser();
  if (ctx.twoFactorEnabled) redirect("/admin/2fa");
  await startEnrollment(db(), ctx.user);
  redirect("/admin/2fa/opsaet");
}

export async function confirmTwoFactorSetup(formData: FormData) {
  const ctx = await requireGrebAdminUser();
  const parsed = code.safeParse(formData.get("code"));
  const ok = parsed.success && (await confirmEnrollment(db(), { userId: ctx.user.id, sessionId: ctx.session.id, code: parsed.data }));
  redirect(ok ? "/admin" : "/admin/2fa/opsaet?fejl=kode");
}

export async function verifyTwoFactor(formData: FormData) {
  const ctx = await requireGrebAdminUser();
  const parsed = code.safeParse(formData.get("code"));
  const ok = parsed.success && (await verifySessionCode(db(), { userId: ctx.user.id, sessionId: ctx.session.id, code: parsed.data }));
  redirect(ok ? "/admin" : "/admin/2fa?fejl=kode");
}
