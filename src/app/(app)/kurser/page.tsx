import type { Metadata } from "next";
import { KurserOverblik } from "@/components/app/kurser/Overblik";

export const metadata: Metadata = { title: "Kurser" };

// Version B "Overblik", chosen by Marco 2026-11-03. Old CourseBrowser page backed up in the session scratchpad.
export default function KurserPage() {
  return (
    <div data-kf>
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; } @media (min-width: 1024px) { main > div:has(> [data-kf]) { padding-bottom: 0; } }`}</style>
      <KurserOverblik />
    </div>
  );
}
