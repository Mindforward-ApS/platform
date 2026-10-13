import { render } from "@react-email/render";
import type { ReactElement } from "react";
import type { EmailCategory } from "@/generated/prisma/enums";
import { InvitationEmail, invitationSubject, type InvitationVars } from "./invitation";
import { MagicLinkEmail, magicLinkSubject, type MagicLinkVars } from "./magic-link";
import { MarketingConfirmEmail, marketingConfirmSubject, type MarketingConfirmVars } from "./marketing-confirm";

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
  "marketing-confirm": { category: "SERVICE", version: "1", subject: marketingConfirmSubject, component: MarketingConfirmEmail } satisfies TemplateDef<MarketingConfirmVars>,
} as const;

export type TemplateKey = keyof typeof TEMPLATES;
export type TemplateVars<K extends TemplateKey> = Parameters<(typeof TEMPLATES)[K]["component"]>[0];

export async function renderTemplate<K extends TemplateKey>(key: K, vars: TemplateVars<K>) {
  const t = TEMPLATES[key] as unknown as TemplateDef<TemplateVars<K>>;
  const element = t.component(vars);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { subject: t.subject(vars), html, text, category: t.category, version: t.version };
}
