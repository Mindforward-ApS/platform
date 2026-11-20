"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMembership, requireUser } from "@/server/auth/authz";
import { getAuth } from "@/server/auth/better-auth";
import { db } from "@/server/db";
import { setActiveOrganization } from "@/server/orgs/service";

export async function switchOrganization(formData: FormData) {
  const organizationId = z.string().min(1).parse(formData.get("organizationId"));
  const ctx = await requireMembership(organizationId, ["OWNER", "ADMIN", "LEARNER"]);
  await setActiveOrganization(db(), ctx.session.id, organizationId);
  redirect("/konto");
}

export async function signOut() {
  await requireUser();
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}
