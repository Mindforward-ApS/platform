import type { Metadata } from "next";
import { CookieBanner } from "@/components/legal/cookie-banner";
import { defaultLocale, getMessages } from "@/lib/i18n";
import "./globals.css";

const t = getMessages();

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={defaultLocale} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-bg font-sans text-fg">
        <CookieBanner t={t.placement.cookieBanner} />
        {children}
      </body>
    </html>
  );
}
