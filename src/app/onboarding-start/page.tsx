import type { Metadata } from "next";
import { Bebas_Neue } from "next/font/google";
import { Switcher } from "./Switcher";

export const metadata: Metadata = { title: "Kom i gang" };
const bebas = Bebas_Neue({ subsets: ["latin", "latin-ext"], weight: "400", variable: "--font-bebas", display: "swap" });

// First onboarding screen, three versions (2026-11-11). Switcher at the bottom.
export default function Page() {
  return <div className={bebas.variable}><Switcher /></div>;
}
