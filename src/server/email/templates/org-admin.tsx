import { Button, Heading, Link, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

// M7 SERVICE mails: certificate issued, account deletion confirmation, company report ready. No offers (CLAUDE.md).

export interface CertificateIssuedVars {
  url: string;
  trackName: string;
  levelLabel: string;
}

export function certificateIssuedSubject(): string {
  return getMessages().orgAdmin.email.certificateIssued.subject;
}

export function CertificateIssuedEmail({ url, trackName, levelLabel }: CertificateIssuedVars) {
  const t = getMessages().orgAdmin.email.certificateIssued;
  return (
    <EmailLayout preview={t.preview}>
      <Heading>{format(t.heading, { track: trackName, level: levelLabel })}</Heading>
      <Text>{t.body}</Text>
      <Button href={url}>{t.button}</Button>
      <Text>{t.fallback}</Text>
      <Link href={url}>{url}</Link>
    </EmailLayout>
  );
}

export interface AccountDeletionVars {
  url: string;
  expiresMin: number;
}

export function accountDeletionSubject(): string {
  return getMessages().orgAdmin.email.accountDeletion.subject;
}

export function AccountDeletionEmail({ url, expiresMin }: AccountDeletionVars) {
  const t = getMessages().orgAdmin.email.accountDeletion;
  return (
    <EmailLayout preview={t.preview}>
      <Heading>{t.heading}</Heading>
      <Text>{format(t.body, { minutes: expiresMin })}</Text>
      <Button href={url}>{t.button}</Button>
      <Text>{t.fallback}</Text>
      <Link href={url}>{url}</Link>
    </EmailLayout>
  );
}

export interface ReportReadyVars {
  url: string;
  organizationName: string;
  from: string;
  to: string;
}

export function reportReadySubject(): string {
  return getMessages().orgAdmin.email.reportReady.subject;
}

export function ReportReadyEmail({ url, organizationName, from, to }: ReportReadyVars) {
  const t = getMessages().orgAdmin.email.reportReady;
  return (
    <EmailLayout preview={t.preview}>
      <Heading>{format(t.heading, { organization: organizationName })}</Heading>
      <Text>{format(t.body, { from, to })}</Text>
      <Link href={url}>{url}</Link>
    </EmailLayout>
  );
}
