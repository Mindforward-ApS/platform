import { Button, Heading, Link, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

// Double opt-in confirmation (docs/09 § 2): SERVICE category, no marketing content — only "confirm that you want mail".

export interface MarketingConfirmVars {
  url: string;
  expiresDays: number;
}

export function marketingConfirmSubject(): string {
  return getMessages().placement.email.marketingConfirm.subject;
}

export function MarketingConfirmEmail({ url, expiresDays }: MarketingConfirmVars) {
  const t = getMessages().placement.email.marketingConfirm;
  return (
    <EmailLayout preview={t.preview}>
      <Heading>{t.heading}</Heading>
      <Text>{format(t.body, { days: expiresDays })}</Text>
      <Button href={url}>{t.button}</Button>
      <Text>{t.fallback}</Text>
      <Link href={url}>{url}</Link>
      <Text>{t.notYou}</Text>
    </EmailLayout>
  );
}
