import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CoralCheck, CourseDisclaimer, CourseFrame, CourseMain, LessonBadges, Stage, WebButtonLink, WebCard, webButtonClass } from "@/components/courses/course-ui";
import { LessonQuiz } from "@/components/courses/lesson-quiz";
import { Icon } from "@/components/ui/icons";
import { format, getMessages } from "@/lib/i18n";
import type { TryIt } from "@/lib/schemas/course";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getLesson, isCourseSlug } from "@/server/courses/service";
import { db } from "@/server/db";
import { answerLessonQuestion } from "../../actions";
import Link from "next/link";

// Lektion: "Det skal du vide" → "Prøv selv" → "Tjek dig selv". Only lessons with status "klar" open.
// Look: the website on :3400 (chocolate stage header, white cards on cream, coral accent).

/** The platform has an øvemiljø per tool (/sandkasse/<tool>), so "oevemiljoe" opens it with the prompt filled in. */
function TryItBlock({ tryIt, courseSlug, toolName, toolUrl }: { tryIt: TryIt; courseSlug: string; toolName: string; toolUrl: string }) {
  const t = getMessages().courses.lesson;
  return (
    <div className="flex flex-col gap-5" data-testid="try-it" data-where={tryIt.where}>
      <p className="text-[1.0625rem] leading-relaxed text-web-ink">{tryIt.text}</p>
      {tryIt.where === "oevemiljoe" && (
        <div>
          <WebButtonLink href={`/sandkasse/${courseSlug}?tekst=${encodeURIComponent(tryIt.prefill)}`} look="light" icon="sandbox" data-testid="open-sandbox">
            {t.openSandbox}
          </WebButtonLink>
        </div>
      )}
      {tryIt.where === "tool" && (
        <div>
          <a href={toolUrl} target="_blank" rel="noopener noreferrer" className={webButtonClass("light")} data-testid="open-tool">
            {format(t.openTool, { tool: toolName })}
            <Icon name="external" size={15} />
            <span className="sr-only"> {t.newTab}</span>
          </a>
        </div>
      )}
    </div>
  );
}

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
  const answer = answerLessonQuestion.bind(null, v.lesson.slug);
  const base = `/forloeb/${v.course.slug}`;

  return (
    <CourseFrame>
      <CourseMain narrow>
        <Stage>
          <div className="flex flex-col gap-5">
            <Link href={base} className="inline-flex items-center gap-1.5 self-start text-[0.875rem] text-web-stage-text underline-offset-4 hover:text-web-white hover:underline">
              <Icon name="arrowLeft" size={14} />
              {t.lesson.backToCourse}
            </Link>
            <p className="text-[0.8125rem] font-medium tracking-[0.06em] text-web-coral uppercase" data-testid="lesson-position">
              {format(t.lesson.position, { module: v.module.nr, position: v.position, total: v.total })}
            </p>
            <h1 className="max-w-2xl text-[2.25rem] leading-[1.08] font-normal tracking-[-0.035em] text-web-white sm:text-[3rem]">{v.lesson.title}</h1>
            <p className="flex flex-wrap items-center gap-3 text-[0.9375rem] text-web-stage-text">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" size={15} />
                {format(t.lesson.minutes, { minutes: v.lesson.minutes })}
              </span>
              <LessonBadges badges={v.lesson.badges} onStage />
            </p>
          </div>
        </Stage>

        <WebCard title={t.lesson.know}>
          <ul className="flex flex-col gap-4" data-testid="lesson-know">
            {v.content.know.map((k) => (
              <li key={k} className="flex gap-3.5 text-[1.0625rem] leading-relaxed text-web-ink">
                <span className="pt-0.5">
                  <CoralCheck />
                </span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </WebCard>

        <WebCard title={t.lesson.tryIt}>
          <TryItBlock tryIt={v.content.tryIt} courseSlug={v.course.slug} toolName={v.course.toolName} toolUrl={v.course.toolUrl} />
        </WebCard>

        <WebCard title={t.lesson.check}>
          <LessonQuiz question={v.content.quiz.question} options={v.content.quiz.options} initiallyCompleted={v.lesson.completed} answer={answer} />
        </WebCard>

        <nav aria-label={v.module.title} className="flex flex-wrap items-center justify-between gap-3">
          {v.prevSlug ? (
            <WebButtonLink href={`${base}/${v.prevSlug}`} look="light" icon="arrowLeft">
              {t.lesson.prev}
            </WebButtonLink>
          ) : (
            <button type="button" disabled className={webButtonClass("light")}>
              <Icon name="arrowLeft" size={16} />
              {t.lesson.prev}
            </button>
          )}
          {/* After the module's last lesson, "Næste" leads to the module ending. */}
          <WebButtonLink href={v.nextSlug ? `${base}/${v.nextSlug}` : `${base}/modul/${v.module.slug}`} trailingIcon="arrowRight" data-testid="lesson-next">
            {t.lesson.next}
          </WebButtonLink>
        </nav>

        <CourseDisclaimer text={v.course.disclaimer} />
      </CourseMain>
    </CourseFrame>
  );
}

export default function LessonPage(props: PageProps<"/forloeb/[spor]/[lektion]">) {
  return (
    <Suspense>
      <Lesson params={props.params} />
    </Suspense>
  );
}
