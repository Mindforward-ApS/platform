import { Button, Heading, Link, Section, Text } from "@react-email/components";
import { format, getMessages } from "@/lib/i18n";
import { EmailLayout } from "./layout";

// Monthly training reminders day 1/14/25 (docs/09 § 5). SERVICE: module titles, time and a link — never offers,
// discounts, upsell or prices (tests/unit/email.test.ts scans the rendered output, send.ts rejects offer fields).

export interface MonthlyTrainingVars {
  url: string;
  settingsUrl: string;
  month: string; // "november 2026"
  estimatedMinutes: number;
  modules: readonly { title: string; minutes: number }[];
  refresher: { title: string; minutes: number } | null;
}

type Day = "d1" | "d14" | "d25";
const t = () => getMessages().monthly.reminder;

function subjectFor(day: Day) {
  return (v: MonthlyTrainingVars) => format(t()[day].subject, { month: v.month, minutes: v.estimatedMinutes });
}

function emailFor(day: Day) {
  return function MonthlyTrainingEmail(v: MonthlyTrainingVars) {
    const m = t();
    const d = m[day];
    return (
      <EmailLayout preview={d.preview}>
        <Heading>{format(d.heading, { month: v.month })}</Heading>
        <Text>{format(d.intro, { month: v.month, minutes: v.estimatedMinutes })}</Text>
        <Section>
          <Heading as="h2">{m.contentsHeading}</Heading>
          {v.modules.map((mod) => (
            <Text key={mod.title}>{format(m.moduleLine, { title: mod.title, minutes: mod.minutes })}</Text>
          ))}
          {v.refresher && <Text>{format(m.refresherLine, { title: v.refresher.title, minutes: v.refresher.minutes })}</Text>}
        </Section>
        <Button href={v.url}>{m.button}</Button>
        <Text>{m.fallback}</Text>
        <Link href={v.url}>{v.url}</Link>
        <Text>{m.settings}</Text>
        <Link href={v.settingsUrl}>{v.settingsUrl}</Link>
      </EmailLayout>
    );
  };
}

export const monthlyD1Subject = subjectFor("d1");
export const monthlyD14Subject = subjectFor("d14");
export const monthlyD25Subject = subjectFor("d25");
export const MonthlyD1Email = emailFor("d1");
export const MonthlyD14Email = emailFor("d14");
export const MonthlyD25Email = emailFor("d25");
