import { Button, Heading, Link, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

export interface InvitationVars {
  url: string;
  organizationName: string;
  inviterName: string;
}

export function invitationSubject({ organizationName, inviterName }: InvitationVars): string {
  return format(getMessages().email.invitation.subject, { inviter: inviterName, organization: organizationName });
}

export function InvitationEmail({ url, organizationName, inviterName }: InvitationVars) {
  const t = getMessages().email.invitation;
  return (
    <EmailLayout preview={t.preview}>
      <Heading>{t.heading}</Heading>
      <Text>{format(t.body, { inviter: inviterName, organization: organizationName })}</Text>
      <Button href={url}>{t.button}</Button>
      <Text>{t.fallback}</Text>
      <Link href={url}>{url}</Link>
    </EmailLayout>
  );
}
