import type { Metadata } from "next";
import { Community } from "@/components/app/community/Community";

export const metadata: Metadata = { title: "Community" };

// Community in place of Beskeder (Marco 2026-11-11). Example data; /beskeder still exists but is out of the menu.
export default function CommunityPage() {
  return (
    <div data-community>
      <style>{`.app:has([data-community]), body:has([data-community]) { background: #f7f2ee; }`}</style>
      <Community />
    </div>
  );
}
