import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeftIcon, CheckCircleIcon, CircleIcon, ClockIcon, FlaskIcon, PlayCircleIcon, SealCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Bar, Card, Chip, PageHeader } from "@/components/app/ui";
import { courses } from "@/content/academy";
import { courseBySlug, lessonsFor, progress } from "@/content/platform";

export function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata(props: PageProps<"/kurser/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  return { title: courseBySlug.get(slug)?.title ?? "Kursus" };
}

export default function CoursePage(props: PageProps<"/kurser/[slug]">) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content(props: { params: PageProps<"/kurser/[slug]">["params"] }) {
  const { slug } = await props.params;
  const course = courseBySlug.get(slug);
  if (!course) notFound();
  const lessons = lessonsFor(course);
  const p = progress[slug] ?? 0;
  const next = lessons.find((l) => !l.done) ?? lessons[0];
  const taskCount = lessons.filter((l) => l.task).length;

  return (
    // lg+: the page fills the window and only the lessons card scrolls (Marco 2026-11-03).
    <div data-kursus className="flex flex-col lg:h-[max(560px,calc(100svh-5.9rem))]">
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-kursus]) { padding-bottom: 0; } }`}</style>
      <div className="mb-6 flex shrink-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 [&>header]:mb-0">
          <Link href="/kurser" className="mb-4 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-muted hover:text-heading">
            <ArrowLeftIcon size={13} /> Alle kurser
          </Link>
          <PageHeader title={course.title} sub={course.summary}>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[0.75rem] text-muted">
              <Chip>{course.level}</Chip>
              <span>{course.category}</span>
              <span>·</span>
              <span>{course.lessons} lektioner</span>
              <span>·</span>
              <span>{course.minutes} min</span>
            </div>
          </PageHeader>
        </div>
          {/* Beside the title, parallel with the text (Marco 2026-11-03); each box keeps its 20rem width. */}
          <aside className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-stretch [&>*]:sm:w-[20rem] [&>*]:sm:shrink-0">
            <Card dark className="p-5">
              <div className="text-[0.75rem] text-[#b8a8a1]">Dit fremskridt</div>
              <div className="mt-2 text-[2rem] font-bold leading-none tracking-[-0.02em] text-white">{p}%</div>
              <div className="mt-3"><Bar value={p} dark /></div>
              <Link href={`/kurser/${slug}/${next.n}`} className="app-btn mt-5 w-full bg-white text-[var(--ink)] hover:bg-[#f3eeeb]">
                {p === 0 ? "Start kurset" : p === 100 ? "Se kurset igen" : "Fortsæt"}
              </Link>
            </Card>
            <Card className="p-4">
              <h3 className="text-[0.8125rem] font-semibold text-heading">Det får du</h3>
              <ul className="mt-3 flex flex-col gap-2.5 text-[0.75rem] text-text">
                <li className="flex items-center gap-2"><PlayCircleIcon size={16} /> {course.lessons} korte lektioner</li>
                <li className="flex items-center gap-2"><FlaskIcon size={16} /> {taskCount} opgaver i øvemiljøet</li>
                <li className="flex items-center gap-2"><ClockIcon size={16} /> Cirka {course.minutes} minutter i alt</li>
                <li className="flex items-center gap-2"><SealCheckIcon size={16} /> Kursusbevis, når du er færdig</li>
              </ul>
            </Card>
          </aside>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <h2 className="text-[0.9375rem] font-semibold text-heading">Lektioner</h2>
            <span className="text-[0.75rem] text-muted">{lessons.filter((l) => l.done).length} af {lessons.length} færdige</span>
          </div>
          <ol className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {lessons.map((l) => {
              const isNext = l.n === next.n && p < 100;
              return (
                <li key={l.n} className="border-t border-[var(--border)] first:border-t-0">
                  <Link href={`/kurser/${slug}/${l.n}`} className={`flex items-center gap-4 px-4 py-3 hover:bg-[var(--hover-fill)] ${isNext ? "bg-[var(--accent-soft)]" : ""}`}>
                    {l.done ? (
                      <CheckCircleIcon size={20} weight="fill" className="shrink-0 text-[var(--coral)]" />
                    ) : (
                      <CircleIcon size={20} className="shrink-0 text-[var(--border-strong)]" />
                    )}
                    <span className="w-6 text-[0.75rem] tabular-nums text-muted">{String(l.n).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-heading">{l.title}</span>
                    {l.task ? <span className="hidden items-center gap-1 text-[0.6875rem] text-muted sm:flex"><FlaskIcon size={14} /> Opgave</span> : null}
                    <span className="w-14 text-right text-[0.6875rem] text-muted">{l.minutes} min</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>
    </div>
  );
}
