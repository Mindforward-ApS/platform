"use server";

import { redirect } from "next/navigation";
import { acknowledgeFirstLoginInfo } from "@/server/admin/first-login";
import { requireActiveMembership } from "@/server/auth/authz";
import { db } from "@/server/db";

export async function acknowledgeDataInfo() {
  const ctx = await requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]);
  await acknowledgeFirstLoginInfo(db(), ctx.user.id, ctx.membership.organizationId);
  redirect("/konto");
}
