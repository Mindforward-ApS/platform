"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/authz";
import { db } from "@/server/db";
import { businessOrgInput, createBusinessOrg } from "@/server/orgs/service";

export async function createBusiness(formData: FormData) {
  const ctx = await requireUser();
  const parsed = businessOrgInput.safeParse({ name: formData.get("name") });
  if (!parsed.success) redirect("/virksomhed/opret?fejl=navn");
  await createBusinessOrg(db(), { userId: ctx.user.id, sessionId: ctx.session.id, name: parsed.data.name });
  redirect("/virksomhed/medarbejdere");
}
