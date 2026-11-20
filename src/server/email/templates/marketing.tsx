import { Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";
import { format, getMessages } from "@/lib/i18n";
import type { CampaignCopy } from "@/lib/marketing/campaign";

// MARKETING mails (docs/09 § 1, § 3, § 5). Only ever sent through sendMarketingEmail (consent gate at send time).
// Every mail: clearly labelled as marketing, sender identified (name, CVR, address), why you get it, and a
// one-click unsubscribe link (+ List-Unsubscribe headers set by send.ts). `unsubscribeUrl` and `sender` are
// injected by send.ts — callers cannot leave them out. No tracking pixel (docs/09 § 3).

export interface MarketingSender {
  name: string;
  cvr: string;
  address: string;
}

export interface MarketingBaseVars {
  url: string;
  unsubscribeUrl: string;
  sender: MarketingSender;
}

const t = () => getMessages().monthly.marketing;

function MarketingLayout({ preview, base, children }: { preview: string; base: MarketingBaseVars; children: ReactNode }) {
  const m = t();
  return (
    <Html lang="da">
      <Head />
      <Preview>{preview}</Preview>
      <Body>
        <Container>
          <Text>{m.label}</Text>
          {children}
          <Section>
            <Text>{format(m.sender, { name: base.sender.name, cvr: base.sender.cvr, address: base.sender.address })}</Text>
            <Text>{m.why}</Text>
            <Link href={base.unsubscribeUrl}>{m.unsubscribe}</Link>
            <Text>{base.unsubscribeUrl}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function Cta({ url, label }: { url: string; label: string }) {
  return (
    <>
      <Button href={url}>{label}</Button>
      <Text>{t().fallback}</Text>
      <Link href={url}>{url}</Link>
    </>
  );
}

// ── nurture-1: personal result + one free module ──
export interface Nurture1Vars extends MarketingBaseVars {
  result: { track: string; level: number } | null;
}
export const nurture1Subject = () => t().nurture1.subject;
export function Nurture1Email(v: Nurture1Vars) {
  const m = t().nurture1;
  return (
    <MarketingLayout preview={m.preview} base={v}>
      <Heading>{m.heading}</Heading>
      {v.result && <Text>{format(m.personal, { level: v.result.level, track: v.result.track })}</Text>}
      <Text>{m.body}</Text>
      <Cta url={v.url} label={m.button} />
    </MarketingLayout>
  );
}

// ── nurture-2: a case from everyday work ──
export type Nurture2Vars = MarketingBaseVars;
export const nurture2Subject = () => t().nurture2.subject;
export function Nurture2Email(v: Nurture2Vars) {
  const m = t().nurture2;
  return (
    <MarketingLayout preview={m.preview} base={v}>
      <Heading>{m.heading}</Heading>
      <Text>{m.body}</Text>
      <Cta url={v.url} label={m.button} />
    </MarketingLayout>
  );
}

// ── nurture-3: what businesses get (art. 4 message: "dokumenteret, rollebaseret tiltag") ──
export type Nurture3Vars = MarketingBaseVars;
export const nurture3Subject = () => t().nurture3.subject;
export function Nurture3Email(v: Nurture3Vars) {
  const m = t().nurture3;
  return (
    <MarketingLayout preview={m.preview} base={v}>
      <Heading>{m.heading}</Heading>
      <Text>{m.body}</Text>
      <Cta url={v.url} label={m.button} />
    </MarketingLayout>
  );
}

// ── nurture-4: continue; an offer ONLY as copy generated from a validated campaign (docs/09 § 7) ──
export interface Nurture4Vars extends MarketingBaseVars {
  offer: CampaignCopy | null;
}
export const nurture4Subject = () => t().nurture4.subject;
export function Nurture4Email(v: Nurture4Vars) {
  const m = t().nurture4;
  return (
    <MarketingLayout preview={m.preview} base={v}>
      <Heading>{m.heading}</Heading>
      <Text>{m.body}</Text>
      {v.offer && (
        <Section>
          {v.offer.heading && <Heading as="h2">{v.offer.heading}</Heading>}
          {v.offer.lines.map((line) => (
            <Text key={line}>{line}</Text>
          ))}
        </Section>
      )}
      <Cta url={v.url} label={m.button} />
    </MarketingLayout>
  );
}

// ── newsletter: manual, approved by Marco (max 1/month) ──
export interface NewsletterVars extends MarketingBaseVars {
  subject: string;
  heading: string;
  intro: string;
  items: readonly { title: string; summary: string; url: string }[];
}
export const newsletterSubject = (v: NewsletterVars) => v.subject;
export function NewsletterEmail(v: NewsletterVars) {
  const m = t().newsletter;
  return (
    <MarketingLayout preview={m.preview} base={v}>
      <Heading>{v.heading}</Heading>
      <Text>{v.intro}</Text>
      {v.items.map((item) => (
        <Section key={item.url}>
          <Heading as="h2">{item.title}</Heading>
          <Text>{item.summary}</Text>
          <Link href={item.url}>{m.readMore}</Link>
        </Section>
      ))}
      <Link href={v.url}>{v.url}</Link>
    </MarketingLayout>
  );
}
