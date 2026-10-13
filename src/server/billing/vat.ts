import { billingRules, type PlanConfig } from "@/lib/config/plans";

// Danish VAT computed by the app (no Stripe Tax in MVP, docs/07-betaling.md § 5). All amounts in øre.

export interface VatBreakdown {
  netOre: number;
  vatOre: number;
  grossOre: number;
}

/** B2C: the price already includes VAT. */
export function splitInclusive(grossOre: number, rate: number = billingRules.vatRate): VatBreakdown {
  const netOre = Math.round(grossOre / (1 + rate));
  return { netOre, vatOre: grossOre - netOre, grossOre };
}

/** B2B: VAT is added on top. */
export function addVat(netOre: number, rate: number = billingRules.vatRate): VatBreakdown {
  const vatOre = Math.round(netOre * rate);
  return { netOre, vatOre, grossOre: netOre + vatOre };
}

/** Price for a plan and number of seats, split per the plan's tax mode. */
export function planPrice(plan: Pick<PlanConfig, "unitAmountOre" | "taxMode">, seats = 1, rate: number = billingRules.vatRate): VatBreakdown {
  const amount = plan.unitAmountOre * seats;
  if (plan.taxMode === "EXCLUSIVE") return addVat(amount, rate);
  if (plan.taxMode === "INCLUSIVE") return splitInclusive(amount, rate);
  return { netOre: 0, vatOre: 0, grossOre: 0 };
}

const dkk = new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" });

/** "49,00 kr." — always from øre amounts in config/DB/Stripe, never from text constants. */
export function formatDkk(ore: number): string {
  return dkk.format(ore / 100);
}
