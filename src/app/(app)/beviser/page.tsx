import type { Metadata } from "next";
import { Samling } from "@/components/app/certifikat/Samling";

export const metadata: Metadata = { title: "Kursusbeviser" };

// Version B "Samling", chosen by Marco 2026-11-03. Old page backed up in the session scratchpad.
export default function BeviserPage() {
  return (
    <div data-kf>
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Samling />
    </div>
  );
}
