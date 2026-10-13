import type { EmailCategory } from "@/generated/prisma/enums";

// docs/09 § 1 + M8 acceptance: a SERVICE template must not carry offer/discount data. Besides the CI scan of
// rendered text (tests/unit/email.test.ts), every SERVICE send is checked here: any variable whose name looks
// like an offer, discount, promotion, campaign, upsell or countdown makes the send throw.

export const OFFER_FIELD = /discount|rabat|offer|tilbud|promo|coupon|voucher|campaign|kampagne|upsell|upgrade|opgrader|countdown|nedtæl/i;

/** Dotted paths of every key (deep) whose name matches OFFER_FIELD. */
export function offerFieldPaths(vars: unknown, prefix = ""): string[] {
  if (Array.isArray(vars)) return vars.flatMap((v, i) => offerFieldPaths(v, `${prefix}[${i}]`));
  if (!vars || typeof vars !== "object") return [];
  return Object.entries(vars as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return [...(OFFER_FIELD.test(key) ? [path] : []), ...offerFieldPaths(value, path)];
  });
}

export class ServiceTemplateOfferError extends Error {
  constructor(
    readonly template: string,
    readonly fields: string[],
  ) {
    super(`SERVICE template ${template} must not contain offer/discount fields: ${fields.join(", ")}`);
    this.name = "ServiceTemplateOfferError";
  }
}

/** Throws for a SERVICE template whose variables contain offer/discount fields. MARKETING passes. */
export function assertTemplateVars(template: string, category: EmailCategory, vars: unknown): void {
  if (category !== "SERVICE") return;
  const fields = offerFieldPaths(vars);
  if (fields.length > 0) throw new ServiceTemplateOfferError(template, fields);
}
