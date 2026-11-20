"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { confirmMarketingConsent } from "@/server/email/consent";
import { startNurtureForToken } from "@/server/email/nurture";
import { requestMeta } from "@/server/security/request-meta";

// Public action (the unguessable token from the opt-in mail authenticates it) — allowlisted in
// tests/unit/authz-scan.test.ts. The POST is the double opt-in click; viewing the page changes nothing.

const STATUS = { CONFIRMED: "bekraeftet", EXPIRED: "udloebet", WITHDRAWN: "afmeldt", INVALID: "ugyldig", VALID: "ugyldig" } as const;

export async function confirmConsent(formData: FormData) {
  const token = z.string().max(200).catch("").parse(formData.get("t"));
  const state = await confirmMarketingConsent(db(), token, requestMeta(await headers()));
  if (state === "CONFIRMED") await startNurtureForToken(db(), token); // M8: lead nurture (re-checks consent at each step)
  redirect(`/samtykke/bekraeft?status=${STATUS[state]}`);
}
