import { Suspense } from "react";
import { KurserOverblik, type LearningDay } from "@/components/platform/kurser/Overblik";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { db } from "@/server/db";
import { learningMinutesByDay, listCourseViews } from "@/server/platform/views";

// Mine kurser = the approved "Overblik" (mindforward-platform /kurser, Marco 2026-11-03): every forløb (one course
// per tool) with the learner's own progress. Each course opens /forloeb/<tool>.

const DOW = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/forloeb");
  const owner = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  const [courses, minutes] = await Promise.all([listCourseViews(db(), owner), learningMinutesByDay(db(), owner, 7)]);
  const day = (d: { date: Date; minutes: number }): LearningDay => ({
    label: DOW[new Date(d.date.toLocaleString("en-US", { timeZone: "Europe/Copenhagen" })).getDay()] ?? "",
    minutes: d.minutes,
  });
  return (
    <div data-pf-cream data-pf-fill>
      <KurserOverblik
        days={[...minutes.previous, ...minutes.current].map(day)}
        courses={courses.map((c) => ({
          slug: c.slug,
          title: c.title,
          level: c.level,
          status: c.status,
          p: c.p,
          done: c.done,
          total: c.total,
          minutes: c.minutes,
          modules: c.modules.map((m) => ({ nr: m.nr, lessons: m.lessons, done: m.done, state: m.state })),
          nextHref: c.next ? `/forloeb/${c.slug}/${c.next.slug}` : null,
        }))}
      />
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
