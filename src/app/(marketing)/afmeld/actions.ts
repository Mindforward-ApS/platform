"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EnvValidationError } from "@/lib/env.schema";
import { db } from "@/server/db";
import { unsubscribeWithToken } from "@/server/email/consent";
import { logger } from "@/server/observability/logger";
import { requestMeta } from "@/server/security/request-meta";

// Public action authenticated by the HMAC token in the link (no login) — allowlisted in tests/unit/authz-scan.test.ts.
// One click, works immediately, no "are you sure" maze (docs/09 § 2).

export async function unsubscribe(formData: FormData) {
  const token = z.string().max(600).catch("").parse(formData.get("t"));
  let status: "afmeldt" | "ugyldig" | "fejl";
  try {
    status = (await unsubscribeWithToken(db(), token, requestMeta(await headers()))) === "DONE" ? "afmeldt" : "ugyldig";
  } catch (err) {
    if (!(err instanceof EnvValidationError)) throw err;
    logger.error("unsubscribe.not_configured", { variables: err.variables });
    status = "fejl";
  }
  redirect(`/afmeld?status=${status}`);
}
