import { Heading, Link, Section, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

// Billing SERVICE mails (docs/07-betaling.md § 8). Durable-medium receipts: every date/time is in the text.
// Never offers, discounts or upsell (docs/09 § 1) — tests/unit/email.test.ts scans the rendered output.
// All values arrive pre-formatted (amounts from config/Stripe, dates in Europe/Copenhagen).

const t = () => getMessages().billing.email;

export interface Seller {
  name: string;
  cvr: string;
  address: string;
}

function SellerLine({ seller }: { seller: Seller }) {
  return <Text>{format(t().seller, { name: seller.name, cvr: seller.cvr, address: seller.address })}</Text>;
}

export interface OrderConfirmationVars {
  url: string;
  withdrawUrl: string;
  termsUrl: string;
  planName: string;
  price: string;
  startDate: string;
  withdrawalDeadline: string;
  consents: readonly { text: string; date: string; time: string }[];
  seller: Seller;
}

export const orderConfirmationSubject = () => t().orderConfirmation.subject;

export function OrderConfirmationEmail(v: OrderConfirmationVars) {
  const m = t().orderConfirmation;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <SellerLine seller={v.seller} />
      <Text>{format(m.product, { plan: v.planName })}</Text>
      <Text>{format(m.price, { price: v.price })}</Text>
      <Text>{m.frequency}</Text>
      <Text>{format(m.start, { date: v.startDate })}</Text>
      {v.consents.length > 0 && (
        <Section>
          <Heading as="h2">{m.consentsHeading}</Heading>
          {v.consents.map((c) => (
            <Text key={c.text}>{format(m.consentLine, { text: c.text, date: c.date, time: c.time })}</Text>
          ))}
        </Section>
      )}
      <Heading as="h2">{m.withdrawalHeading}</Heading>
      <Text>{format(m.withdrawalBody, { date: v.withdrawalDeadline })}</Text>
      <Link href={v.withdrawUrl}>{v.withdrawUrl}</Link>
      <Heading as="h2">{m.cancelHeading}</Heading>
      <Text>{m.cancelBody}</Text>
      <Link href={v.url}>{v.url}</Link>
      <Text>{m.termsBody}</Text>
      <Link href={v.termsUrl}>{v.termsUrl}</Link>
    </EmailLayout>
  );
}

export interface WithdrawalReceiptVars {
  url: string;
  date: string;
  time: string;
  agreement: string;
  name: string;
  seller: Seller;
}

export const withdrawalReceiptSubject = () => t().withdrawalReceipt.subject;

export function WithdrawalReceiptEmail(v: WithdrawalReceiptVars) {
  const m = t().withdrawalReceipt;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <Text>{format(m.body, { date: v.date, time: v.time })}</Text>
      <Text>{format(m.agreement, { agreement: v.agreement })}</Text>
      <Text>{format(m.name, { name: v.name })}</Text>
      <Text>{m.next}</Text>
      <SellerLine seller={v.seller} />
      <Link href={v.url}>{v.url}</Link>
    </EmailLayout>
  );
}

export interface WithdrawalCompletedVars {
  url: string;
  amount: string;
}

export const withdrawalCompletedSubject = () => t().withdrawalCompleted.subject;

export function WithdrawalCompletedEmail(v: WithdrawalCompletedVars) {
  const m = t().withdrawalCompleted;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <Text>{format(m.body, { amount: v.amount })}</Text>
      <Text>{m.free}</Text>
      <Link href={v.url}>{v.url}</Link>
    </EmailLayout>
  );
}

export interface CancellationConfirmedVars {
  url: string;
  date: string;
  time: string;
  endDate: string;
}

export const cancellationConfirmedSubject = () => t().cancellationConfirmed.subject;

export function CancellationConfirmedEmail(v: CancellationConfirmedVars) {
  const m = t().cancellationConfirmed;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <Text>{format(m.body, { date: v.date, time: v.time, endDate: v.endDate })}</Text>
      <Text>{format(m.resume, { endDate: v.endDate })}</Text>
      <Link href={v.url}>{v.url}</Link>
    </EmailLayout>
  );
}

export interface SupportEscalationVars {
  url: string;
  reason: string;
  summary: string;
}

export const supportEscalationSubject = (v: SupportEscalationVars) => format(t().escalation.subject, { reason: v.reason });

export function SupportEscalationEmail(v: SupportEscalationVars) {
  const m = t().escalation;
  return (
    <EmailLayout preview={m.preview}>
      <Heading>{m.heading}</Heading>
      <Text>{v.reason}</Text>
      <Text>{v.summary}</Text>
      <Link href={v.url}>{v.url}</Link>
    </EmailLayout>
  );
}
