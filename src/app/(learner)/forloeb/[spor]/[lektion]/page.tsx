import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseFrame, CourseMain, Stage, WebButtonLink } from "@/components/courses/course-ui";
import { LektionFokus } from "@/components/platform/lektion/Fokus";
import { Icon } from "@/components/ui/icons";
import { getMessages } from "@/lib/i18n";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getCourseOverview, getLesson, isCourseSlug } from "@/server/courses/service";
import { db } from "@/server/db";
import { answerLessonQuestion } from "../../actions";

// Lektion = the approved "Fokus" lesson (mindforward-platform, Marco 2026-11-03): Læs → Quiz → Prøv (can wait) →
// Færdig. Only lessons with status "klar" open; locked lessons keep greb's locked notice.

async function Lesson({ params }: { params: Promise<{ spor: string; lektion: string }> }) {
  const { spor, lektion } = await params;
  if (!isCourseSlug(spor)) notFound();
  const ctx = await guardPage(() => requireActiveMembership(["OWNER", "ADMIN", "LEARNER"]), `/forloeb/${spor}/${lektion}`);
  const t = getMessages().courses;
  const found = await getLesson(db(), { userId: ctx.user.id, organizationId: ctx.membership.organizationId }, spor, lektion);
  if (found.kind === "missing") notFound();
  if (found.kind === "locked") {
    return (
      <CourseFrame>
        <CourseMain narrow>
          <Stage data-testid="lesson-locked">
            <div className="flex flex-col items-start gap-4">
              <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-web-stage-glass text-web-coral ring-1 ring-inset ring-web-stage-line">
                <Icon name="lock" size={22} />
              </span>
              <h1 className="text-[2rem] leading-[1.1] font-normal tracking-[-0.03em] text-web-white">{t.locked.title}</h1>
              <p className="max-w-md text-[1.0625rem] text-web-stage-text">
                {found.title}. {t.locked.body}
              </p>
              <WebButtonLink href={`/forloeb/${found.courseSlug}`} look="glass" icon="arrowLeft" className="mt-2">
                {t.lesson.backToCourse}
              </WebButtonLink>
            </div>
          </Stage>
        </CourseMain>
      </CourseFrame>
    );
  }

  const v = found.view;
  const owner = { userId: ctx.user.id, organizationId: ctx.membership.organizationId };
  const overview = await getCourseOverview(db(), owner, v.course.slug);
  const nextLesson = v.nextSlug ? overview?.levels.flatMap((l) => l.modules.flatMap((m) => m.lessons)).find((l) => l.slug === v.nextSlug) : undefined;
  const base = `/forloeb/${v.course.slug}`;

  return (
    <LektionFokus
      key={v.lesson.slug}
      lesson={{ title: v.lesson.title, know: v.content.know, quiz: v.content.quiz, tryIt: v.content.tryIt }}
      tool={v.course.toolName}
      toolUrl={v.course.toolUrl}
      sandboxHref={`/sandkasse/${v.course.slug}`}
      label={`${v.course.toolName} · Modul ${v.module.nr} · Lektion ${v.position} af ${v.total}`}
      closeHref={base}
      next={nextLesson ? { href: `${base}/${nextLesson.slug}`, title: nextLesson.title, minutes: nextLesson.minutes } : undefined}
      // After the module's last lesson, the module ending.
      finishHref={`${base}/modul/${v.module.slug}`}
      initiallyCompleted={v.lesson.completed}
      answer={answerLessonQuestion.bind(null, v.lesson.slug)}
    />
  );
}

export default function LessonPage(props: PageProps<"/forloeb/[spor]/[lektion]">) {
  return (
    <Suspense>
      <Lesson params={props.params} />
    </Suspense>
  );
}
