import { da, type Messages } from "./da";

export type Locale = "da";
export const defaultLocale: Locale = "da";

const dictionaries: Record<Locale, Messages> = { da };

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}

/** Replace {name} placeholders. Values are inserted as text; React/React Email escape them on render. */
export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
