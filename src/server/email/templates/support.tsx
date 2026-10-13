import { Heading, Link, Section, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

// M10 SERVICE mails: escalation receipt + invoice link (to customers), budget alert + daily digest (to the owner).
// Never offers or upsell (docs/09 § 1). Percentages are written "pct." — the SERVICE scan forbids "N %".

const t = () => getMessages().support.email;

export interface EscalationReceiptVars {
  url: string;
  escalationId: string;
  expected: string;
}

export const escalationReceiptSubject = (v: EscalationReceiptVars) => format(t().escalationReceipt.subject, { id: v.escalationId });

export function EscalationReceiptEmail(v: EscalationReceiptVars) {
  const m = t().escalationReceipt;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <Text>{format(m.body, { id: v.escalationId, expected: v.expected })}</Text>
      <Text>{m.note}</Text>
      <Link href={v.url}>{v.url}</Link>
    </EmailLayout>
  );
}

export interface InvoiceLinkVars {
  url: string;
  invoiceNumber: string;
  amount: string;
  status: string;
}

export const invoiceLinkSubject = (v: InvoiceLinkVars) => format(t().invoiceLink.subject, { number: v.invoiceNumber });

export function InvoiceLinkEmail(v: InvoiceLinkVars) {
  const m = t().invoiceLink;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <Text>{format(m.body, { number: v.invoiceNumber, amount: v.amount, status: v.status })}</Text>
      <Link href={v.url}>{m.link}</Link>
      <Text>{v.url}</Text>
      <Text>{m.portal}</Text>
    </EmailLayout>
  );
}

export interface BudgetAlertVars {
  url: string;
  month: string;
  pct: number;
  spent: string;
  limit: string;
  level: "ALERT" | "DEGRADED" | "BLOCKED";
}

export const budgetAlertSubject = (v: BudgetAlertVars) => format(t().budgetAlert.subject, { pct: v.pct, month: v.month });

export function BudgetAlertEmail(v: BudgetAlertVars) {
  const m = t().budgetAlert;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{format(m.heading, { pct: v.pct })}</Heading>
      <Text>{format(m.body, { spent: v.spent, limit: v.limit, month: v.month })}</Text>
      {v.level !== "ALERT" && <Text>{m.degraded}</Text>}
      {v.level === "BLOCKED" && <Text>{m.blocked}</Text>}
      <Link href={v.url}>{m.link}</Link>
      <Text>{v.url}</Text>
    </EmailLayout>
  );
}

/** Pre-formatted digest content (src/server/support/digest.ts). Empty sections are omitted (docs/08 § 7). */
export interface OwnerDigestVars {
  url: string;
  date: string;
  action: { openCount: number; lines: readonly { text: string; overdue: boolean }[] } | null;
  support: { line: string; byReason: string | null; guardHits: number } | null;
  billing: string | null;
  pipeline: string | null;
  errors: string | null;
  ai: { line: string; alert: boolean };
  killSwitches: readonly string[];
}

export const ownerDigestSubject = (v: OwnerDigestVars) => format(t().digest.subject, { date: v.date });

export function OwnerDigestEmail(v: OwnerDigestVars) {
  const m = t().digest;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{format(m.heading, { date: v.date })}</Heading>
      {v.action && (
        <Section>
          <Heading as="h2">{m.actionHeading}</Heading>
          <Text>{format(m.openEscalations, { count: v.action.openCount })}</Text>
          {v.action.lines.map((l, i) => (
            <Text key={i}>{l.overdue ? `${m.overdue} · ${l.text}` : l.text}</Text>
          ))}
        </Section>
      )}
      {v.support && (
        <Section>
          <Heading as="h2">{m.supportHeading}</Heading>
          <Text>{v.support.line}</Text>
          {v.support.byReason && <Text>{format(m.byReason, { list: v.support.byReason })}</Text>}
          {v.support.guardHits > 0 && <Text>{format(m.guardHits, { count: v.support.guardHits })}</Text>}
        </Section>
      )}
      {v.billing && (
        <Section>
          <Heading as="h2">{m.billingHeading}</Heading>
          <Text>{v.billing}</Text>
        </Section>
      )}
      {v.pipeline && (
        <Section>
          <Heading as="h2">{m.pipelineHeading}</Heading>
          <Text>{v.pipeline}</Text>
        </Section>
      )}
      {v.errors && (
        <Section>
          <Heading as="h2">{m.errorsHeading}</Heading>
          <Text>{v.errors}</Text>
        </Section>
      )}
      <Section>
        <Heading as="h2">{m.aiHeading}</Heading>
        <Text>{v.ai.line}</Text>
        {v.ai.alert && <Text>{m.aiAlert}</Text>}
      </Section>
      {v.killSwitches.length > 0 && (
        <Section>
          <Heading as="h2">{m.killSwitchHeading}</Heading>
          {v.killSwitches.map((k) => (
            <Text key={k}>{k}</Text>
          ))}
        </Section>
      )}
      <Link href={v.url}>{m.adminLink}</Link>
      <Text>{v.url}</Text>
    </EmailLayout>
  );
}
