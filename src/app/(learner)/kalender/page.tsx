import type { Metadata } from "next";
import { Suspense } from "react";
import { Normal } from "@/components/platform/kalender/Normal";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";

export const metadata: Metadata = { title: "Kalender" };

// Kalender = an ordinary calendar app layout (Marco 2026-11-11: "God kalender"), replacing version K. Greb's own /plan
// ("Min plan" from the niveautest) is unchanged and still reachable. Example data until there is a calendar backend.
async function Content() {
  await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/kalender");
  return <Normal />;
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
