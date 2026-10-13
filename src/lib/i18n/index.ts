import { da, type Messages } from "./da";

export type Locale = "da";
export const defaultLocale: Locale = "da";

const dictionaries: Record<Locale, Messages> = { da };

export function getMessages(locale: Locale = defaultLocale): Messages {
  return dictionaries[locale];
}
