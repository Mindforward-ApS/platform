"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { getAuthContext } from "@/server/auth/authz";
import { db } from "@/server/db";
import { logger } from "@/server/observability/logger";
import { signupMarketingConsent } from "@/server/placement/submit";
import { requestMeta } from "@/server/security/request-meta";

// Public (pre-login) action — allowlisted in tests/unit/authz-scan.test.ts. Voluntary marketing consent from the
// result page: the result never depends on it. Rate limits 5/hour per IP and per email (src/server/placement/submit.ts).

const ERROR_PARAM = { NOT_TICKED: "kryds", INVALID_EMAIL: "email", RATE_LIMITED: "graense", BOT: "generel" } as const;
const str = z.string().max(300).optional().catch(undefined);

export async function giveMarketingConsent(formData: FormData) {
  const ctx = await getAuthContext();
  let outcome: Awaited<ReturnType<typeof signupMarketingConsent>>;
  try {
    outcome = await signupMarketingConsent(db(), {
      email: str.parse(formData.get("email")) ?? "",
      consent: str.parse(formData.get("consent")),
      honeypot: str.parse(formData.get("website")),
      meta: requestMeta(await headers()),
      appUrl: serverEnv().APP_URL,
      userId: ctx?.user.id ?? null,
    });
  } catch (err) {
    logger.error("consent.signup_failed", { err });
    redirect("/niveautest/resultat?samtykke=fejl-generel#samtykke");
  }
  if (!outcome.ok) redirect(`/niveautest/resultat?samtykke=fejl-${ERROR_PARAM[outcome.error]}#samtykke`);
  redirect("/niveautest/resultat?samtykke=sendt#samtykke");
}
