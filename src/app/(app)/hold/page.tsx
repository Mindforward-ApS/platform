import type { Metadata } from "next";
import { H as HoldListe } from "@/components/app/hold/HoldListe";
import { AdminOnly } from "@/components/app/RoleBits";

export const metadata: Metadata = { title: "Mit hold" };

// Version H "Liste", chosen by Marco 2026-11-03: built for teams of up to ~400 (search, filters, sort, select many,
// bulk Skub, pagination; only the table scrolls). Example data. Old page backed up in the session scratchpad.
export default function HoldPage() {
  return (
    <div data-kf>
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      {/* Admin only (Marco 2026-11-11): names, scores, Skub and report. */}
      <AdminOnly><HoldListe /></AdminOnly>
    </div>
  );
}
