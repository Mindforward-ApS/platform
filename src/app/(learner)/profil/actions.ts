"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireActiveMembership } from "@/server/auth/authz";
import { lookupCompany, saveIndustry, saveSystems, skipProfile } from "@/server/connectors/service";
import { db } from "@/server/db";

// Work profile steps (CVR → branche → systemer → anbefalinger). Always the caller's active membership.

const ROLES = ["OWNER", "ADMIN", "LEARNER"] as const;
const scopeOf = (ctx: Awaited<ReturnType<typeof requireActiveMembership>>) => ({ userId: ctx.user.id, organizationId: ctx.membership.organizationId });

/** Step 1: CVR lookup. Found + matched → confirm; found without match → picker; otherwise an error code. */
export async function lookupCvr(formData: FormData) {
  const s = scopeOf(await requireActiveMembership(ROLES));
  const cvr = z.string().max(20).parse(formData.get("cvr") ?? "");
  const variant = z.enum(["a", "b", "c"]).catch("a").parse(formData.get("v"));
  const r = await lookupCompany(db(), s, cvr);
  if (r.kind !== "found") redirect(`/profil/virksomhed?v=${variant}&fejl=${r.kind}&cvr=${encodeURIComponent(cvr.slice(0, 12))}`);
  const company = { cvr: r.company.cvr, companyName: r.company.name, industryCode: r.company.industryCode, industryCodeSystem: r.company.codeSystem };
  if (!r.industry) {
    await db().workProfile.upsert({
      where: { organizationId_userId: s },
      create: { ...s, ...company },
      update: { ...company, industryId: null },
    });
    redirect("/profil/branche?ukendt=1");
  }
  await saveIndustry(db(), s, { industryId: r.industry.id, ...company });
  redirect(`/profil/virksomhed?v=${variant}&bekraeft=1`);
}

/** Step 2: industry picked by hand (keeps CVR/company if found earlier). */
export async function chooseIndustry(formData: FormData) {
  const s = scopeOf(await requireActiveMembership(ROLES));
  const industryId = z.string().min(1).max(64).parse(formData.get("industryId"));
  const existing = await db().workProfile.findUnique({ where: { organizationId_userId: s } });
  await saveIndustry(db(), s, { industryId, cvr: existing?.cvr, companyName: existing?.companyName, industryCode: existing?.industryCode, industryCodeSystem: existing?.industryCodeSystem });
  redirect("/profil/systemer");
}

/** Step 3: systems they use → profile completed → recommendations. */
export async function chooseSystems(formData: FormData) {
  const s = scopeOf(await requireActiveMembership(ROLES));
  const ids = z.array(z.string().min(1).max(64)).max(100).parse(formData.getAll("systemId"));
  await saveSystems(db(), s, ids);
  redirect("/profil/anbefalinger");
}

export async function skipProfileStep() {
  const s = scopeOf(await requireActiveMembership(ROLES));
  await skipProfile(db(), s);
  redirect("/hjem");
}
