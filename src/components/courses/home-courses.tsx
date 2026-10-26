import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { format, getMessages } from "@/lib/i18n";
import type { MemberCourseProgress } from "@/server/courses/service";

// Hjem: "Dine forløb" — one card per tool with the learner's progress in the open module (the :3500 "Mine kurser" row).
// Tool names are text only, no vendor logos.

export function HomeCourses({ courses }: { courses: MemberCourseProgress[] }) {
  const t = getMessages().courses.home;
  if (courses.length === 0) return null;
  return (
    <section aria-labelledby="home-courses" className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 sm:px-7" data-testid="home-courses">
      <div className="flex items-center justify-between gap-4">
        <h2 id="home-courses" className="text-[1.125rem] font-semibold text-ink">
          {t.title}
        </h2>
        <Link href="/forloeb" className="inline-flex items-center gap-1 text-label text-accent hover:underline">
          {t.seeAll}
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {courses.map((c) => {
          const m = c.modules[0];
          const pct = m ? Math.round((m.completed / Math.max(1, m.total)) * 100) : 0;
          const finished = m && m.completed === m.total;
          return (
            <li key={c.courseSlug}>
              <Link href={`/forloeb/${c.courseSlug}`} className="group flex h-full flex-col gap-3">
                <span className="relative isolate grid aspect-[16/9] place-items-center overflow-hidden rounded-[14px] bg-web-stage transition-transform duration-[120ms] group-hover:-translate-y-0.5">
                  <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(80%_100%_at_85%_0%,var(--color-web-glow),transparent_70%)]" />
                  <span className="font-site text-[1.5rem] font-normal tracking-[-0.03em] text-web-white">{c.toolName}</span>
                </span>
                {m && <span className="line-clamp-1 text-label text-ink">{format(t.module, { nr: m.nr, title: m.title })}</span>}
                {m && (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-seg-off" aria-hidden="true">
                      <span className="block h-full rounded-full bg-seg-on" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="text-caption text-ink-muted tabular-nums">{pct} %</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-caption font-semibold text-accent">
                  {finished ? format(t.done, { nr: m.nr }) : m && m.completed > 0 ? t.continue : t.start}
                  <Icon name="arrowRight" size={12} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
