import Link from "next/link";
import {
  BookmarkSimpleIcon, ClockIcon, PlayCircleIcon, FlaskIcon, SealCheckIcon, SparkleIcon, PencilSimpleLineIcon, ChartBarIcon, UsersThreeIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Course } from "@/content/academy";

const categoryIcon = { "AI i hverdagen": SparkleIcon, Skrivning: PencilSimpleLineIcon, Data: ChartBarIcon, Ledelse: UsersThreeIcon };

// Reference: Skillzone teacher card. Face → category icon tile, rating badges → level chip, price → progress.
export function CourseCard({ course, progress, saved }: { course: Course; progress?: number; saved?: boolean }) {
  const dark = progress !== undefined && progress < 100;
  const done = progress === 100;
  const Icon = categoryIcon[course.category];
  const muted = dark ? "text-[#b8a8a1]" : "text-muted";
  return (
    <article className={`${dark ? "app-card-dark" : "app-card"} flex min-w-0 flex-col rounded-[12px] p-4`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[6px] ${dark ? "bg-white/10 text-white" : "bg-[var(--ink)] text-white"}`}>
          <Icon size={18} weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-1.5">
            <span className={`rounded-[4px] px-1.5 py-px text-[0.625rem] font-semibold ${dark ? "bg-white text-[var(--ink)]" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`}>{course.level}</span>
            <span className={`text-[0.6875rem] ${muted}`}>{course.category}</span>
          </div>
          <h3 className={`line-clamp-2 text-[0.8125rem] font-semibold leading-snug ${dark ? "text-white" : "text-heading"}`}>{course.title}</h3>
        </div>
        <button
          aria-label={saved ? "Fjern fra gemte" : "Gem kursus"}
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-[6px] ${
            saved ? "bg-[var(--coral)] text-white" : dark ? "text-[#b8a8a1] ring-1 ring-white/15" : "text-muted ring-1 ring-[var(--border-strong)]"
          }`}
        >
          <BookmarkSimpleIcon size={14} weight={saved ? "fill" : "regular"} />
        </button>
      </div>

      <p className={`mt-3 line-clamp-3 text-[0.75rem] leading-relaxed ${muted}`}>{course.summary}</p>

      <div className={`mt-3 flex flex-col gap-1.5 text-[0.75rem] ${dark ? "text-[#e7dcd7]" : "text-text"}`}>
        <span className="flex items-center gap-2"><FlaskIcon size={15} /> Opgaver i øvemiljøet</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-2"><PlayCircleIcon size={15} /> {course.lessons} lektioner</span>
          <span className="flex items-center gap-2"><ClockIcon size={15} /> {course.minutes} min</span>
        </span>
      </div>

      <div className="mt-auto flex items-end justify-between pt-5">
        {dark ? (
          <div className="flex-1 pr-4">
            <div className="text-[1.375rem] font-bold leading-none tracking-[-0.02em] text-white">{progress}%<span className="ml-1 text-[0.75rem] font-normal tracking-normal text-[#b8a8a1]">færdig</span></div>
            <div className="mt-2 h-1 rounded-full bg-white/15">
              <div className="h-full rounded-full bg-[var(--coral)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          done ? (
            <div className="flex items-center gap-2 text-[0.8125rem] font-semibold text-heading">
              <SealCheckIcon size={22} weight="fill" className="text-[var(--coral)]" /> Gennemført
            </div>
          ) : (
            <div className="text-[1.375rem] font-bold leading-none tracking-[-0.02em] text-heading">
              {course.lessons}<span className="ml-1 text-[0.75rem] font-normal tracking-normal text-muted">lektioner</span>
            </div>
          )
        )}
        <Link href={done ? "/beviser" : `/kurser/${course.slug}`} className="app-btn app-btn-light">{dark ? "Fortsæt" : done ? "Se bevis" : "Se kursus"}</Link>
      </div>
    </article>
  );
}
