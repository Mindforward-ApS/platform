import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { getMessages } from "@/lib/i18n";

export const metadata: Metadata = { title: getMessages().placement.legal.pages.cookies.title };

export default function Page() {
  return <LegalPage page="cookies" />;
}
