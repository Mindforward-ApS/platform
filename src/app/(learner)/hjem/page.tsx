import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransferOffers } from "@/components/certificate/transfer-offer";
import { Oversigt, type OversigtData } from "@/components/platform/oversigt/Oversigt";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { needsFirstLoginInfo } from "@/server/admin/first-login";
import { db } from "@/server/db";
import { listModulesForLearner } from "@/server/modules/catalog";
import { playableOptions } from "@/server/modules/deps";
import { activityStreak, latestFeedback, listCourseViews, type LatestFeedback } from "@/server/platform/views";

// Oversigt = the approved platform dashboard (mindforward-platform "/", Marco Nov 2026), on greb's real data.
// Only the learner's own data; no comparison with colleagues (docs/01 § 7). The old modules stay reachable via the
// "Næste opgave" and "Seneste feedback" links (/modul/…) and /moduler.

const TZ = "Europe/Copenhagen";

function greeting(name: string | null | undefined, now: Date) {
  const hour = Number(new Intl.DateTimeFormat("da-DK", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(now));
  const word = hour < 10 ? "Godmorgen" : hour < 18 ? "Goddag" : "Godaften";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${word}, ${first}` : word;
}

function when(d: Date, now: Date) {
  const day = (x: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(x);
  if (day(d) === day(now)) return "i dag";
  if (day(d) === day(new Date(now.getTime() - 86_400_000))) return "i går";
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", timeZone: TZ }).format(d);
}

function feedbackView(f: LatestFeedback, now: Date): NonNullable<OversigtData["feedback"]> {
  const total = f.passedSteps + f.failedSteps;
  const good = [`${f.passedSteps} af ${total} trin bestået`, ...(f.hintSteps === 0 ? ["Ingen hints brugt"] : [])];
  const better = [
    ...(f.failedSteps > 0 ? [`${f.failedSteps} trin ikke bestået`] : []),
    ...(f.hintSteps > 0 ? [`${f.hintSteps} trin løst med hint`] : []),
  ];
  return { title: f.title, score: f.scorePct, when: when(f.completedAt, now), href: `/modul/${f.moduleSlug}`, good, better: better.length ? better : ["Alle trin bestået uden hint"] };
}

async function Content() {
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), "/hjem");
  const owner = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  // M7: B2B employees see once what their admin can and cannot see (docs/10 § 1.6) — same gate as /konto.
  if (await needsFirstLoginInfo(db(), ctx.user.id, owner.organizationId)) redirect("/konto/data-info");
  const [courses, modules, feedback, streak] = await Promise.all([
    listCourseViews(db(), owner),
    listModulesForLearner(db(), owner, playableOptions()),
    latestFeedback(db(), owner),
    activityStreak(db(), owner),
  ]);
  const now = new Date();
  const visible = modules.filter((m) => m.status !== "REMOVED");
  const nextModule = visible.find((m) => m.status === "IN_PROGRESS") ?? visible.find((m) => m.status !== "PASSED");
  const lessonHref = (slug: string, lesson: string) => `/forloeb/${slug}/${lesson}`;
  const current = courses.find((c) => c.next);

  const data: OversigtData = {
    greeting: greeting(ctx.user.name, now),
    continueHref: current?.next ? lessonHref(current.slug, current.next.slug) : "/forloeb",
    today: new Intl.DateTimeFormat("da-DK", { weekday: "short", day: "numeric", month: "short", timeZone: TZ })
      .format(now)
      .replace(/^\w/, (c) => c.toUpperCase())
      .replace(/\.$/, ""),
    courses: courses.map((c) => ({
      slug: c.slug,
      title: c.title,
      p: c.p,
      done: c.done,
      total: c.total,
      href: `/forloeb/${c.slug}`,
      next: c.next ? { title: c.next.title, minutes: c.next.minutes, href: lessonHref(c.slug, c.next.slug) } : null,
    })),
    nextTask: nextModule ? { title: nextModule.title, minutes: nextModule.minutes, href: `/modul/${nextModule.slug}` } : null,
    feedback: feedback ? feedbackView(feedback, now) : null,
    progress: {
      total: courses.reduce((s, c) => s + c.readyTotal, 0),
      done: courses.reduce((s, c) => s + c.done, 0),
      started: courses.filter((c) => c.done > 0).reduce((s, c) => s + c.lessons.filter((l) => l.ready && !l.done).length, 0),
    },
    streak: { days: streak.streak, week: streak.week },
  };

  return (
    <div className="flex flex-col gap-3">
      <TransferOffers userId={ctx.user.id} organizationId={owner.organizationId} />
      <Oversigt data={data} />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
