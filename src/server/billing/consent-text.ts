import { createHash } from "node:crypto";
import { z } from "zod";
import raw from "../../../content/legal/checkout-consent.v1.json";

// Versioned B2C checkout declarations (docs/07-betaling.md § 8.1 pkt. 4). The exact text shown is hashed
// into every ConsentRecord, so a wording change = new file + new version.

const consentTextSchema = z.object({
  version: z.string().min(1),
  immediateAccess: z.string().min(10),
  withdrawalLossAck: z.string().min(10),
});

export const checkoutConsent = consentTextSchema.parse(raw);

export function textHash(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
