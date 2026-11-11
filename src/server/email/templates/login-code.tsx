import { Heading, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

// Sign-in / sign-up code (Better Auth emailOTP). Replaced the magic-link mail on 11 Nov 2026.

export interface LoginCodeVars {
  code: string;
  expiresMin: number;
}

// The subject is stored on EmailMessage, so it never contains the code (codes are stored hashed).
export function loginCodeSubject(): string {
  return getMessages().email.loginCode.subject;
}

export function LoginCodeEmail({ code, expiresMin }: LoginCodeVars) {
  const t = getMessages().email.loginCode;
  return (
    <EmailLayout preview={format(t.preview, { code })}>
      <Heading>{t.heading}</Heading>
      <Text>{t.body}</Text>
      <Text style={{ fontSize: "32px", fontWeight: 700, letterSpacing: "8px", margin: "24px 0" }}>{code}</Text>
      <Text>{format(t.expires, { minutes: expiresMin })}</Text>
    </EmailLayout>
  );
}
