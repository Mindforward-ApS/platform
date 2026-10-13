import { render } from "@react-email/render";
import type { ReactElement } from "react";
import type { EmailCategory } from "@/generated/prisma/enums";
import * as billing from "./billing";
import { InvitationEmail, invitationSubject, type InvitationVars } from "./invitation";
import { MagicLinkEmail, magicLinkSubject, type MagicLinkVars } from "./magic-link";

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
} as const;

export type TemplateKey = keyof typeof TEMPLATES;
export type TemplateVars<K extends TemplateKey> = Parameters<(typeof TEMPLATES)[K]["component"]>[0];

export async function renderTemplate<K extends TemplateKey>(key: K, vars: TemplateVars<K>) {
  const t = TEMPLATES[key] as unknown as TemplateDef<TemplateVars<K>>;
  const element = t.component(vars);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: t.subject(vars), html, text, category: t.category, version: t.version };
}
