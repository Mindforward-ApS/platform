import type { Metadata } from "next";
import { Normal } from "@/components/app/kalender/Normal";

export const metadata: Metadata = { title: "Kalender" };

// Calendar laid out like an ordinary calendar app (Marco 2026-11-11: "en helt normal kalender"). Preview next to /plan.
export default function KalenderNyPage() {
  return (
    <div data-kf>
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Normal />
    </div>
  );
}
