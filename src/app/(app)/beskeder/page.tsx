import type { Metadata } from "next";
import { Chat } from "@/components/app/Chat";
import { threads } from "@/content/platform";

export const metadata: Metadata = { title: "Beskeder" };

// A plain chat (Marco 2026-11-03). Old Inbox page backed up in the session scratchpad.
export default function BeskederPage() {
  return (
    <div data-chat>
      <style>{`.app:has([data-chat]), body:has([data-chat]) { background: #f7f2ee; }`}</style>
      <Chat threads={threads} />
    </div>
  );
}
