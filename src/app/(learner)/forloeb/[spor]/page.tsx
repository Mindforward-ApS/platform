import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon, CourseDisclaimer, LessonBadges, ToolPicker } from "@/components/courses/course-ui";
import { AppIcon, Icon } from "@/components/ui/icons";
import { cx, ProgressBar } from "@/components/ui/primitives";
import { courseTotals, formatDuration, formatTotalDuration, levelLessonCount, levelMinutes, moduleMinutes } from "@/lib/course-stats";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getCourseOverview, isCourseSlug, listCourses, type OverviewLevel, type OverviewModule } from "@/server/courses/service";
import { db } from "@/server/db";

// Forløbsoversigt: /forloeb/chatgpt, /forloeb/claude, /forloeb/copilot. Every figure is computed from the data.

function ModuleRow({ m, open, courseSlug }: { m: OverviewModule; open: boolean; courseSlug: string }) {
  const t = getMessages().courses;
  const done = m.lessons.filter((l) => l.completed).length;
  const minutes = moduleMinutes(m);
  return (
    <li>
      <details open={open} className="group/m rounded-card border border-line bg-surface" data-testid="course-module" data-status={m.ready ? "klar" : "kommer-snart"}>
        <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span
            className={cx(
              "grid size-9 shrink-0 place-items-center rounded-full font-mono text-mono tabular-nums",
              m.ready ? "bg-ink text-on-accent" : "bg-sunken text-ink-subtle ring-1 ring-inset ring-line",
            )}
            aria-hidden="true"
          >
            {m.nr}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="sr-only">{format(t.module.label, { nr: m.nr })}: </span>
            <span className={cx("text-body font-semibold", m.ready ? "text-ink" : "text-ink-muted")}>{m.title}</span>
            <span className={cx("text-body-sm", m.ready ? "text-ink-muted" : "text-ink-subtle")}>{m.description}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-caption text-ink-subtle">
              <span>{format(t.module.meta, { lessons: m.lessons.length, time: formatDuration(minutes) })}</span>
              {m.ready ? <span className="font-medium text-ink-muted" data-testid="module-progress">{format(t.module.progress, { done, total: m.lessons.length })}</span> : <ComingSoon />}
            </span>
            {m.ready && (
              <span className="max-w-xs pt-1">
                <ProgressBar value={done} max={m.lessons.length} tone="success" label={format(t.module.progress, { done, total: m.lessons.length })} />
              </span>
            )}
          </span>
          <Icon name="chevronDown" size={18} className="mt-2 shrink-0 text-ink-subtle transition-transform group-open/m:rotate-180" />
          <span className="sr-only">{t.module.showLessons}</span>
        </summary>
        <ol className="border-t border-line">
          {m.lessons.map((l) => {
            const inner = (
              <>
                <span className="w-9 shrink-0 font-mono text-mono text-ink-subtle tabular-nums">{l.nr}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={cx("text-body-sm", l.ready ? "font-medium text-ink" : "text-ink-muted")}>{l.title}</span>
                  <LessonBadges badges={l.badges} />
                </span>
                <span className="flex shrink-0 items-center gap-2 text-caption text-ink-subtle">
                  {!l.ready && <span className="hidden sm:inline">{t.comingSoon}</span>}
                  <span className="tabular-nums">{formatDuration(l.minutes)}</span>
                  {l.completed ? (
                    <span className="grid size-5 place-items-center rounded-full bg-success text-on-accent">
                      <Icon name="check" size={12} />
                      <span className="sr-only">{t.module.completedLesson}</span>
                    </span>
                  ) : l.ready ? (
                    <Icon name="chevronRight" size={14} />
                  ) : (
                    <Icon name="lock" size={14} />
                  )}
                </span>
              </>
            );
            return (
              <li key={l.slug} className="border-t border-line first:border-t-0" data-testid="course-lesson" data-status={l.ready ? "klar" : "kommer-snart"}>
                {l.ready ? (
                  <Link href={`/forloeb/${courseSlug}/${l.slug}`} className="flex items-start gap-3 px-5 py-3 hover:bg-sunken sm:px-6">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-3 sm:px-6" aria-disabled="true">
                    {inner}
                    <span className="sr-only">{t.comingSoon}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </details>
    </li>
  );
}

function Level({ level, firstOpen, courseSlug }: { level: OverviewLevel; firstOpen: string | null; courseSlug: string }) {
  const t = getMessages().courses;
  const testMeta = format(t.test.meta, { time: formatDuration(level.test.minutes), pct: level.test.passPercent });
  return (
    <section aria-labelledby={`${level.slug}-title`} className="flex flex-col gap-4" data-testid="course-level">
      <div className="flex flex-col gap-2 border-b border-line pb-4">
        <p className="text-overline text-ink-subtle uppercase">{format(t.level.eyebrow, { nr: level.nr, name: level.name })}</p>
        <h2 id={`${level.slug}-title`} className="text-title-2 text-ink">
          {level.title}
        </h2>
        <p className="max-w-read text-body text-ink-muted">{level.outcome}</p>
        <p className="font-mono text-mono text-ink-subtle tabular-nums" data-testid="level-meta">
          {format(t.level.meta, { modules: level.modules.length, lessons: levelLessonCount(level), time: formatDuration(levelMinutes(level)) })}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {level.modules.map((m) => (
          <ModuleRow key={m.slug} m={m} open={m.slug === firstOpen} courseSlug={courseSlug} />
        ))}
        <li className="flex items-start gap-4 rounded-card border border-dashed border-line-strong px-5 py-4 sm:px-6" data-testid="course-test" data-status={level.test.ready ? "klar" : "kommer-snart"}>
          <AppIcon name="award" size="sm" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-caption text-ink-subtle">{format(t.test.label, { nr: level.nr })}</span>
            <span className={cx("text-body font-semibold", level.test.ready ? "text-ink" : "text-ink-muted")}>{level.test.title}</span>
            <span className="text-body-sm text-ink-muted">{level.test.description}</span>
            <span className="flex flex-wrap items-center gap-3 pt-1 text-caption text-ink-subtle">
              <span>{testMeta}</span>
              {!level.test.ready && <ComingSoon />}
            </span>
          </span>
        </li>
      </ul>
    </section>
  );
}

async function Overview({ params }: { params: Promise<{ spor: string }> }) {
  const { spor } = await params;
  if (!isCourseSlug(spor)) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/forloeb/${spor}`);
  const owner = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  const [courses, course] = await Promise.all([listCourses(db()), getCourseOverview(db(), owner, spor)]);
  if (!course) notFound();
  const t = getMessages().courses;
  const totals = courseTotals(course.levels);
  const firstOpen = course.levels.flatMap((l) => l.modules).find((m) => m.ready)?.slug ?? null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-4 pt-8 pb-16 sm:px-6 in-[.app-panel]:mx-0 lg:in-[.app-panel]:px-11 lg:in-[.app-panel]:pt-6">
      <header className="flex flex-col gap-6">
        <ToolPicker courses={courses} current={course.slug} />
        <div className="flex flex-col gap-3">
          <p className="text-overline text-ink-subtle uppercase">{t.pageTitle}</p>
          <h1 className="text-title-1 text-ink">{course.headline}</h1>
        </div>
        <ul aria-label={t.stats.label} className="flex flex-wrap gap-x-6 gap-y-2 text-body-sm font-medium text-ink" data-testid="course-stats">
          {[
            format(t.stats.modules, { count: totals.modules }),
            format(t.stats.lessons, { count: totals.lessons }),
            format(t.stats.certificates, { count: totals.certificates }),
            formatTotalDuration(totals.minutes),
          ].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </header>
      {course.levels.map((level) => (
        <Level key={level.slug} level={level} firstOpen={firstOpen} courseSlug={course.slug} />
      ))}
      <CourseDisclaimer text={course.disclaimer} />
    </main>
  );
}

export default function CourseOverviewPage(props: PageProps<"/forloeb/[spor]">) {
  return (
    <Suspense>
      <Overview params={props.params} />
    </Suspense>
  );
}
