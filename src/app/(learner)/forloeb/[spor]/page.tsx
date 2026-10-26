import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ComingSoon, CoralCheck, CourseDisclaimer, CourseFrame, CourseMain, LessonBadges, Pill, Stage, ToolPicker } from "@/components/courses/course-ui";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { courseTotals, formatDuration, formatTotalDuration, levelLessonCount, levelMinutes, moduleMinutes } from "@/lib/course-stats";
import { format, getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getCourseOverview, isCourseSlug, listCourses, type OverviewLevel, type OverviewModule } from "@/server/courses/service";
import { db } from "@/server/db";

// Forløbsoversigt: /forloeb/chatgpt, /forloeb/claude, /forloeb/copilot. Every figure is computed from the data.
// Look: the website on :3400 (chocolate stage, cream page, coral accent).

function ModuleRow({ m, open, courseSlug }: { m: OverviewModule; open: boolean; courseSlug: string }) {
  const t = getMessages().courses;
  const done = m.lessons.filter((l) => l.completed).length;
  const minutes = moduleMinutes(m);
  return (
    <li>
      <details open={open} className="group/m overflow-hidden rounded-[24px] border border-web-line bg-web-surface" data-testid="course-module" data-status={m.ready ? "klar" : "kommer-snart"}>
        <summary className="flex cursor-pointer list-none items-start gap-4 px-5 py-5 sm:px-7 [&::-webkit-details-marker]:hidden">
          <span
            className={cx(
              "grid size-10 shrink-0 place-items-center rounded-full text-[0.9375rem] font-semibold tabular-nums",
              m.ready ? "bg-linear-to-b from-web-coral-from to-web-coral-to text-web-white" : "bg-web-bg text-web-muted ring-1 ring-inset ring-web-line",
            )}
            aria-hidden="true"
          >
            {m.nr}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="sr-only">{format(t.module.label, { nr: m.nr })}: </span>
            <span className={cx("text-[1.0625rem] font-semibold tracking-[-0.01em]", m.ready ? "text-web-ink" : "text-web-muted")}>{m.title}</span>
            <span className={cx("text-[0.9375rem] leading-relaxed", m.ready ? "text-web-body" : "text-web-muted")}>{m.description}</span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-[0.8125rem] text-web-muted">
              <span>{format(t.module.meta, { lessons: m.lessons.length, time: formatDuration(minutes) })}</span>
              {m.ready ? (
                <span className="font-medium text-web-ink" data-testid="module-progress">
                  {format(t.module.progress, { done, total: m.lessons.length })}
                </span>
              ) : (
                <ComingSoon />
              )}
            </span>
            {m.ready && (
              <span
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={m.lessons.length}
                aria-valuenow={done}
                aria-label={format(t.module.progress, { done, total: m.lessons.length })}
                className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-web-bg ring-1 ring-inset ring-web-line"
              >
                <span className="block h-full rounded-full bg-linear-to-r from-web-coral-from to-web-coral-to" style={{ width: `${(done / Math.max(1, m.lessons.length)) * 100}%` }} />
              </span>
            )}
          </span>
          <Icon name="chevronDown" size={18} className="mt-2.5 shrink-0 text-web-muted transition-transform group-open/m:rotate-180" />
          <span className="sr-only">{t.module.showLessons}</span>
        </summary>
        <ol className="border-t border-web-line">
          {m.lessons.map((l) => {
            const inner = (
              <>
                <span className="w-10 shrink-0 pt-px text-[0.8125rem] font-medium text-web-muted tabular-nums">{l.nr}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className={cx("text-[0.9375rem]", l.ready ? "font-medium text-web-ink" : "text-web-muted")}>{l.title}</span>
                  <LessonBadges badges={l.badges} />
                </span>
                <span className="flex shrink-0 items-center gap-2.5 text-[0.8125rem] text-web-muted">
                  {!l.ready && <span className="hidden sm:inline">{t.comingSoon}</span>}
                  <span className="tabular-nums">{formatDuration(l.minutes)}</span>
                  {l.completed ? (
                    <span className="contents">
                      <CoralCheck size="sm" />
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
              <li key={l.slug} className="border-t border-web-line first:border-t-0" data-testid="course-lesson" data-status={l.ready ? "klar" : "kommer-snart"}>
                {l.ready ? (
                  <Link href={`/forloeb/${courseSlug}/${l.slug}`} className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-web-bg sm:px-7">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-3.5 sm:px-7" aria-disabled="true">
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
    <section aria-labelledby={`${level.slug}-title`} className="flex flex-col gap-5" data-testid="course-level">
      <div className="flex flex-col gap-3 pt-4">
        <span>
          <Pill>{format(t.level.eyebrow, { nr: level.nr, name: level.name })}</Pill>
        </span>
        <h2 id={`${level.slug}-title`} className="text-[2rem] leading-[1.1] font-normal tracking-[-0.03em] text-web-ink sm:text-[2.5rem]">
          {level.title}
        </h2>
        <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-web-body">{level.outcome}</p>
        <p className="text-[0.875rem] text-web-muted tabular-nums" data-testid="level-meta">
          {format(t.level.meta, { modules: level.modules.length, lessons: levelLessonCount(level), time: formatDuration(levelMinutes(level)) })}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {level.modules.map((m) => (
          <ModuleRow key={m.slug} m={m} open={m.slug === firstOpen} courseSlug={courseSlug} />
        ))}
        <li data-testid="course-test" data-status={level.test.ready ? "klar" : "kommer-snart"}>
          <Stage className="!rounded-[24px] !px-5 !py-6 sm:!px-7">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-web-stage-glass text-web-coral ring-1 ring-inset ring-web-stage-line">
                <Icon name="award" size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[0.8125rem] text-web-stage-muted">{format(t.test.label, { nr: level.nr })}</span>
                <span className="text-[1.0625rem] font-semibold tracking-[-0.01em] text-web-white">{level.test.title}</span>
                <span className="text-[0.9375rem] text-web-stage-text">{level.test.description}</span>
                <span className="flex flex-wrap items-center gap-3 pt-1 text-[0.8125rem] text-web-stage-muted">
                  <span>{testMeta}</span>
                  {!level.test.ready && (
                    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-web-stage-glass px-2.5 font-medium text-web-stage-text ring-1 ring-inset ring-web-stage-line">
                      <Icon name="lock" size={12} />
                      {t.comingSoon}
                    </span>
                  )}
                </span>
              </span>
            </div>
          </Stage>
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
    <CourseFrame>
      <CourseMain>
        <Stage>
          <div className="flex flex-col gap-8">
            <ToolPicker courses={courses} current={course.slug} />
            <div className="flex flex-col gap-4">
              <span>
                <Pill onStage>{t.pageTitle}</Pill>
              </span>
              <h1 className="max-w-3xl text-[2.25rem] leading-[1.06] font-normal tracking-[-0.035em] text-web-white sm:text-[3.25rem]">{course.headline}</h1>
            </div>
            <ul aria-label={t.stats.label} className="flex flex-wrap gap-x-7 gap-y-3 text-[0.9375rem] text-web-white" data-testid="course-stats">
              {[
                format(t.stats.modules, { count: totals.modules }),
                format(t.stats.lessons, { count: totals.lessons }),
                format(t.stats.certificates, { count: totals.certificates }),
                formatTotalDuration(totals.minutes),
              ].map((s) => (
                <li key={s} className="flex items-center gap-2.5">
                  <CoralCheck size="sm" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Stage>
        {course.levels.map((level) => (
          <Level key={level.slug} level={level} firstOpen={firstOpen} courseSlug={course.slug} />
        ))}
        <CourseDisclaimer text={course.disclaimer} />
      </CourseMain>
    </CourseFrame>
  );
}

export default function CourseOverviewPage(props: PageProps<"/forloeb/[spor]">) {
  return (
    <Suspense>
      <Overview params={props.params} />
    </Suspense>
  );
}
