import { render } from "@react-email/render";
import type { ReactElement } from "react";
import type { EmailCategory } from "@/generated/prisma/enums";
import * as billing from "./billing";
import { InvitationEmail, invitationSubject, type InvitationVars } from "./invitation";
import { MagicLinkEmail, magicLinkSubject, type MagicLinkVars } from "./magic-link";
import { MarketingConfirmEmail, marketingConfirmSubject, type MarketingConfirmVars } from "./marketing-confirm";
import * as marketing from "./marketing";
import * as monthly from "./monthly";

// Category is a property of the template, not of the call (docs/09 § 1).
interface TemplateDef<V> {
  category: EmailCategory;
  version: string;
  subject: (vars: V) => string;
  component: (vars: V) => ReactElement;
}

export const TEMPLATES = {
  "magic-link": { category: "SERVICE", version: "1", subject: magicLinkSubject, component: MagicLinkEmail } satisfies TemplateDef<MagicLinkVars>,
  invitation: { category: "SERVICE", version: "1", subject: invitationSubject, component: InvitationEmail } satisfies TemplateDef<InvitationVars>,
  // M6 — billing
  "order-confirmation": { category: "SERVICE", version: "1", subject: billing.orderConfirmationSubject, component: billing.OrderConfirmationEmail } satisfies TemplateDef<billing.OrderConfirmationVars>,
  "withdrawal-receipt": { category: "SERVICE", version: "1", subject: billing.withdrawalReceiptSubject, component: billing.WithdrawalReceiptEmail } satisfies TemplateDef<billing.WithdrawalReceiptVars>,
  "withdrawal-completed": { category: "SERVICE", version: "1", subject: billing.withdrawalCompletedSubject, component: billing.WithdrawalCompletedEmail } satisfies TemplateDef<billing.WithdrawalCompletedVars>,
  "cancellation-confirmed": { category: "SERVICE", version: "1", subject: billing.cancellationConfirmedSubject, component: billing.CancellationConfirmedEmail } satisfies TemplateDef<billing.CancellationConfirmedVars>,
  "support-escalation": { category: "SERVICE", version: "1", subject: billing.supportEscalationSubject, component: billing.SupportEscalationEmail } satisfies TemplateDef<billing.SupportEscalationVars>,
  "marketing-confirm": { category: "SERVICE", version: "1", subject: marketingConfirmSubject, component: MarketingConfirmEmail } satisfies TemplateDef<MarketingConfirmVars>,
  // M8 — monthly training reminders (SERVICE, never offers)
  "monthly-training-d1": { category: "SERVICE", version: "1", subject: monthly.monthlyD1Subject, component: monthly.MonthlyD1Email } satisfies TemplateDef<monthly.MonthlyTrainingVars>,
  "monthly-training-d14": { category: "SERVICE", version: "1", subject: monthly.monthlyD14Subject, component: monthly.MonthlyD14Email } satisfies TemplateDef<monthly.MonthlyTrainingVars>,
  "monthly-training-d25": { category: "SERVICE", version: "1", subject: monthly.monthlyD25Subject, component: monthly.MonthlyD25Email } satisfies TemplateDef<monthly.MonthlyTrainingVars>,
  // M8 — MARKETING (only via sendMarketingEmail: consent gate at send time)
  "nurture-1": { category: "MARKETING", version: "1", subject: marketing.nurture1Subject, component: marketing.Nurture1Email } satisfies TemplateDef<marketing.Nurture1Vars>,
  "nurture-2": { category: "MARKETING", version: "1", subject: marketing.nurture2Subject, component: marketing.Nurture2Email } satisfies TemplateDef<marketing.Nurture2Vars>,
  "nurture-3": { category: "MARKETING", version: "1", subject: marketing.nurture3Subject, component: marketing.Nurture3Email } satisfies TemplateDef<marketing.Nurture3Vars>,
  "nurture-4": { category: "MARKETING", version: "1", subject: marketing.nurture4Subject, component: marketing.Nurture4Email } satisfies TemplateDef<marketing.Nurture4Vars>,
  newsletter: { category: "MARKETING", version: "1", subject: marketing.newsletterSubject, component: marketing.NewsletterEmail } satisfies TemplateDef<marketing.NewsletterVars>,
} as const;

export type TemplateKey = keyof typeof TEMPLATES;
export type TemplateVars<K extends TemplateKey> = Parameters<(typeof TEMPLATES)[K]["component"]>[0];
type CategoryOf<K extends TemplateKey> = (typeof TEMPLATES)[K]["category"];
export type MarketingTemplateKey = { [K in TemplateKey]: CategoryOf<K> extends "MARKETING" ? K : never }[TemplateKey];

export async function renderTemplate<K extends TemplateKey>(key: K, vars: TemplateVars<K>) {
  const t = TEMPLATES[key] as unknown as TemplateDef<TemplateVars<K>>;
  const element = t.component(vars);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: t.subject(vars), html, text, category: t.category, version: t.version };
}
