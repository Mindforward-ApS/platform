import { Body, Container, Head, Html, Preview, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { getMessages } from "@/lib/i18n";

// Neutral layout: no colors or fonts until the design is chosen (CLAUDE.md "Designregel").
export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  const t = getMessages().email;
  return (
    <Html lang="da">
      <Head />
      <Preview>{preview}</Preview>
      <Body>
        <Container>
          {children}
          <Text>{t.ignoreNote}</Text>
          <Text>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
}
