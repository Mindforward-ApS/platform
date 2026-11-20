import type { Metadata } from "next";
import { Suspense } from "react";
import { Chat } from "@/components/platform/Chat";
import { threads } from "@/components/platform/demo-data";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

export const metadata: Metadata = { title: "Beskeder" };

// Beskeder = the approved plain chat (mindforward-platform /beskeder). Example threads until there is a messages
// backend (marked "Eksempeldata"). Signed-in members only, like every app page.
async function Content() {
  await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/beskeder");
  return <Chat threads={threads} />;
}

export default function MessagesPage() {
  return (
    <div data-pf-cream>
      <Suspense>
        <Content />
      </Suspense>
    </div>
  );
}
