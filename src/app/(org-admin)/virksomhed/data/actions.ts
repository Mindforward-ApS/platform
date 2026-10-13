"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/admin/action-form";
import { getMessages } from "@/lib/i18n";
import { assertBusinessOrg, orgAdminErrorMessage } from "@/server/admin/context";
import { requireActiveMembership } from "@/server/auth/authz";
import { ADMIN_ROLES } from "@/server/auth/authz-core";
import { db } from "@/server/db";
import { eraseMemberFromOrg } from "@/server/orgs/members";

const input = z.object({ memberId: z.string().min(1).max(100), confirm: z.string() });

/** GDPR on the customer's instruction: delete one employee's learning data in this org (docs/10 § 1.5). */
export async function eraseEmployeeData(_prev: FormState | null, formData: FormData): Promise<FormState> {
  const ctx = await requireActiveMembership(ADMIN_ROLES);
  await assertBusinessOrg(ctx.membership.organizationId);
  const t = getMessages().orgAdmin.orgData;
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.confirm.trim().toUpperCase() !== "SLET") return { error: t.confirmMismatch };
  try {
    await eraseMemberFromOrg(db(), { organizationId: ctx.membership.organizationId, actorUserId: ctx.user.id }, parsed.data.memberId);
  } catch (err) {
    return { error: orgAdminErrorMessage(err) ?? getMessages().orgAdmin.errors.generic };
  }
  refresh();
  return { ok: t.deleted };
}
