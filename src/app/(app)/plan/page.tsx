import type { Metadata } from "next";
import { K as Kalender } from "@/components/app/kalender/Kalender";

export const metadata: Metadata = { title: "Kalender" };

// Version K "Uge", chosen by Marco 2026-11-03: week timeline where events can be dragged to another day or time
// (mouse, touch and arrow keys, with Fortryd). Example data. Old calendar page backed up in the session scratchpad.
export default function PlanPage() {
  return (
    <div data-kf>
      <style>{`.app:has([data-kf]), body:has([data-kf]) { background: #f7f2ee; }`}</style>
      <Kalender />
    </div>
  );
}
