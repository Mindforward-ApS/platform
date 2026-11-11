import type { Metadata } from "next";
import { Suspense } from "react";
import { Kalender } from "@/components/platform/kalender/Kalender";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

export const metadata: Metadata = { title: "Kalender" };

// Kalender = the approved version K "Uge" (mindforward-platform /plan). Greb's own /plan ("Min plan" from the
// niveautest) is unchanged and still reachable. Example week until there is a calendar backend.
async function Content() {
  await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/kalender");
  return <Kalender />;
}

export default function CalendarPage() {
  return (
    <div data-pf-cream>
      <Suspense>
        <Content />
      </Suspense>
    </div>
  );
}
