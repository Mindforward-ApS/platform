import type { Metadata } from "next";
import { Suspense } from "react";
import { Normal } from "@/components/platform/kalender/Normal";
import { cph, loadRange } from "@/lib/calendar";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { listCalendar } from "@/server/calendar/service";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Kalender" };

// Kalender = an ordinary calendar app layout (Marco 2026-11-11: "God kalender"), replacing version K. Greb's own /plan
// ("Min plan" from the niveautest) is unchanged and still reachable. The learner's own planned blocks plus their
// completed lessons and øvemiljø sessions; the month around today is loaded here, other months on navigation.
async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/kalender");
  const now = new Date();
  const today = cph(now).day;
  const events = await listCalendar(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, loadRange(today));
  return <Normal today={today} now={now.toISOString()} events={events} />;
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
