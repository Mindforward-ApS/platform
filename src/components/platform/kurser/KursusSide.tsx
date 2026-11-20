// Course page, ported 1:1 from the approved platform (/kurser/[slug], Marco 2026-11-03): title and facts left,
// progress card and "Det får du" right, then every lesson in one scrolling card. Real data: a greb forløb; lessons that
// are not ready yet show "Kommer snart" with a lock and do not open.
import Link from "next/link";
import { ArrowLeftIcon, CheckCircleIcon, CircleIcon, ClockIcon, LockSimpleIcon, PlayCircleIcon, SealCheckIcon, SquaresFourIcon } from "@phosphor-icons/react/dist/ssr";
import { Bar, Card, Chip, PageHeader } from "@/components/platform/ui";
import { formatDuration } from "@/lib/course-stats";
import type { CourseView } from "@/server/platform/views";

export function KursusSide({ course, disclaimer }: { course: CourseView; disclaimer: string }) {
  const slug = course.slug;
  const lessons = course.lessons;
  const p = course.p;
  const next = course.next ?? lessons.find((l) => l.ready) ?? null;

  return (
    // lg+: the page fills the window and only the lessons card scrolls (Marco 2026-11-03).
    <div data-pf-fill data-testid="course-page" className="flex flex-col lg:h-[max(560px,calc(100svh-5.9rem))]">
      <div className="mb-6 flex shrink-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 [&>header]:mb-0">
          <Link href="/forloeb" className="mb-4 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-pf-muted hover:text-heading">
            <ArrowLeftIcon size={13} /> Alle kurser
          </Link>
          <PageHeader title={course.title} sub={course.headline}>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.75rem] text-pf-muted">
              <Chip>{course.level}</Chip>
              <span>Forløb</span>
              <span>·</span>
              <span>{course.total} lektioner</span>
              <span>·</span>
              <span>{formatDuration(course.minutes)}</span>
            </div>
          </PageHeader>
        </div>
        {/* Beside the title, parallel with the text (Marco 2026-11-03); each box keeps its 20rem width. */}
        <aside className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-stretch [&>*]:sm:w-[20rem] [&>*]:sm:shrink-0">
          <Card dark className="p-5">
            <div className="text-[0.75rem] text-[var(--pf-b8a8a1)]">Dit fremskridt</div>
            <div className="mt-2 text-[2rem] leading-none font-bold tracking-[-0.02em] text-pf-white">{p}%</div>
            <div className="mt-3">
              <Bar value={p} dark />
            </div>
            {next ? (
              <Link href={`/forloeb/${slug}/${next.slug}`} className="app-btn mt-5 w-full bg-pf-white text-[var(--ink)] hover:bg-[var(--pf-f3eeeb)]" data-testid="course-continue">
                {course.done === 0 ? "Start kurset" : course.next ? "Fortsæt" : "Se kurset igen"}
              </Link>
            ) : null}
          </Card>
          <Card className="p-4">
            <h3 className="text-[0.8125rem] font-semibold text-heading">Det får du</h3>
            <ul className="mt-3 flex flex-col gap-2.5 text-[0.75rem] text-pf-text" data-testid="course-stats">
              <li className="flex items-center gap-2"><PlayCircleIcon size={16} /> {course.total} korte lektioner</li>
              <li className="flex items-center gap-2"><SquaresFourIcon size={16} /> {course.modules.length} moduler i {course.levels} niveauer</li>
              <li className="flex items-center gap-2"><ClockIcon size={16} /> Cirka {formatDuration(course.minutes)} i alt</li>
              <li className="flex items-center gap-2"><SealCheckIcon size={16} /> Kursusbevis efter hvert niveau</li>
            </ul>
          </Card>
        </aside>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[0.9375rem] font-semibold text-heading">Lektioner</h2>
            <span className="text-[0.75rem] text-pf-muted">{course.done} af {course.total} færdige</span>
          </div>
          <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {lessons.map((l) => {
              const isNext = l.slug === course.next?.slug;
              const row = (
                <>
                  {l.done ? (
                    <CheckCircleIcon size={20} weight="fill" className="shrink-0 text-[var(--coral)]" />
                  ) : l.ready ? (
                    <CircleIcon size={20} className="shrink-0 text-[var(--border-strong)]" />
                  ) : (
                    <LockSimpleIcon size={18} className="shrink-0 text-[var(--border-strong)]" />
                  )}
                  <span className="w-8 text-[0.75rem] text-pf-muted tabular-nums">{l.nr}</span>
                  <span className={`min-w-0 flex-1 truncate text-[0.8125rem] font-medium ${l.ready ? "text-heading" : "text-pf-muted"}`}>{l.title}</span>
                  {!l.ready ? <span className="hidden text-[0.6875rem] text-pf-muted sm:block">Kommer snart</span> : null}
                  <span className="w-14 text-right text-[0.6875rem] text-pf-muted">{l.minutes} min</span>
                </>
              );
              return (
                <li key={l.slug} className="border-t border-[var(--border)] first:border-t-0" data-testid="course-lesson" data-status={l.ready ? "klar" : "kommer-snart"}>
                  {l.ready ? (
                    <Link href={`/forloeb/${slug}/${l.slug}`} className={`flex items-center gap-4 px-4 py-3 hover:bg-[var(--hover-fill)] ${isNext ? "bg-[var(--accent-soft)]" : ""}`}>
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4 px-4 py-3" aria-disabled="true">
                      {row}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
        <p className="shrink-0 pb-3 text-[0.6875rem] text-pf-muted" data-testid="course-disclaimer">
          {disclaimer}
        </p>
      </div>
    </div>
  );
}
