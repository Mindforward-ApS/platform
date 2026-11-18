import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Same typeface as the website (Inter, display + text).
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mindforward Platform", template: "%s · Mindforward" },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Mindforward", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#201613" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da" className={inter.variable}>
      <body className="theme-night min-h-svh">{children}</body>
    </html>
  );
}
