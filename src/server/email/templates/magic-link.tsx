import { Button, Heading, Link, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

export interface MagicLinkVars {
  url: string;
  expiresMin: number;
}

export function magicLinkSubject(): string {
  return getMessages().email.magicLink.subject;
}

export function MagicLinkEmail({ url, expiresMin }: MagicLinkVars) {
  const t = getMessages().email.magicLink;
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
