import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseDisclaimer, LessonBadges } from "@/components/courses/course-ui";
import { LessonQuiz } from "@/components/courses/lesson-quiz";
import { Icon } from "@/components/ui/icons";
import { Button, ButtonLink, Card, EmptyState, TextLink } from "@/components/ui/primitives";
import { format, getMessages } from "@/lib/i18n";
import type { TryIt } from "@/lib/schemas/course";
import { requireActiveMembership } from "@/server/auth/authz";
import { guardPage } from "@/server/auth/page-guard";
import { getLesson, isCourseSlug } from "@/server/courses/service";
import { db } from "@/server/db";
import { answerLessonQuestion } from "../../actions";

// Lektion: "Det skal du vide" → "Prøv selv" → "Tjek dig selv". Only lessons with status "klar" open.

/** The platform has an øvemiljø per tool (/sandkasse/<tool>), so "oevemiljoe" opens it with the prompt filled in. */
function TryItBlock({ tryIt, courseSlug, toolName, toolUrl }: { tryIt: TryIt; courseSlug: string; toolName: string; toolUrl: string }) {
  const t = getMessages().courses.lesson;
  return (
    <div className="flex flex-col gap-4" data-testid="try-it" data-where={tryIt.where}>
      <p className="text-body text-ink">{tryIt.text}</p>
      {tryIt.where === "oevemiljoe" && (
        <div>
          <ButtonLink href={`/sandkasse/${courseSlug}?tekst=${encodeURIComponent(tryIt.prefill)}`} variant="secondary" icon="sandbox" data-testid="open-sandbox">
            {t.openSandbox}
          </ButtonLink>
        </div>
      )}
      {tryIt.where === "tool" && (
        <div>
          <a href={toolUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-label text-accent underline-offset-4 hover:underline" data-testid="open-tool">
            {format(t.openTool, { tool: toolName })}
            <Icon name="external" size={14} />
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 in-[.app-panel]:mx-0 lg:in-[.app-panel]:px-11">
        <EmptyState
          icon="lock"
          title={t.locked.title}
          action={
            <ButtonLink href={`/forloeb/${found.courseSlug}`} variant="secondary">
              {t.lesson.backToCourse}
            </ButtonLink>
          }
        >
          {found.title}. {t.locked.body}
        </EmptyState>
      </main>
    );
  }

  const v = found.view;
  const answer = answerLessonQuestion.bind(null, v.lesson.slug);
  const base = `/forloeb/${v.course.slug}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 in-[.app-panel]:mx-0 lg:in-[.app-panel]:px-11 lg:in-[.app-panel]:pt-6">
      <header className="flex flex-col gap-3">
        <TextLink href={base} className="inline-flex items-center gap-1.5 self-start text-body-sm">
          <Icon name="arrowLeft" size={14} />
          {t.lesson.backToCourse}
        </TextLink>
        <p className="text-overline text-ink-subtle uppercase" data-testid="lesson-position">
          {format(t.lesson.position, { module: v.module.nr, position: v.position, total: v.total })}
        </p>
        <h1 className="text-title-1 text-ink">{v.lesson.title}</h1>
        <p className="flex flex-wrap items-center gap-3 text-body-sm text-ink-muted">
          <span>{format(t.lesson.minutes, { minutes: v.lesson.minutes })}</span>
          <LessonBadges badges={v.lesson.badges} />
        </p>
      </header>

      <Card title={t.lesson.know}>
        <ul className="flex list-disc flex-col gap-3 pl-5 text-body text-ink marker:text-ink-subtle" data-testid="lesson-know">
          {v.content.know.map((k) => (
            <li key={k}>{k}</li>
          ))}
        </ul>
      </Card>

      <Card title={t.lesson.tryIt}>
        <TryItBlock tryIt={v.content.tryIt} courseSlug={v.course.slug} toolName={v.course.toolName} toolUrl={v.course.toolUrl} />
      </Card>

      <Card title={t.lesson.check}>
        <LessonQuiz question={v.content.quiz.question} options={v.content.quiz.options} initiallyCompleted={v.lesson.completed} answer={answer} />
      </Card>

      <nav aria-label={v.module.title} className="flex flex-wrap items-center justify-between gap-3">
        {v.prevSlug ? (
          <ButtonLink href={`${base}/${v.prevSlug}`} variant="secondary" icon="arrowLeft">
            {t.lesson.prev}
          </ButtonLink>
        ) : (
          <Button variant="secondary" icon="arrowLeft" disabled>
            {t.lesson.prev}
          </Button>
        )}
        {/* After the module's last lesson, "Næste" leads to the module ending. */}
        <ButtonLink href={v.nextSlug ? `${base}/${v.nextSlug}` : `${base}/modul/${v.module.slug}`} trailingIcon="arrowRight" data-testid="lesson-next">
          {t.lesson.next}
        </ButtonLink>
      </nav>

      <CourseDisclaimer text={v.course.disclaimer} />
    </main>
  );
}

export default function LessonPage(props: PageProps<"/forloeb/[spor]/[lektion]">) {
  return (
    <Suspense>
      <Lesson params={props.params} />
    </Suspense>
  );
}
