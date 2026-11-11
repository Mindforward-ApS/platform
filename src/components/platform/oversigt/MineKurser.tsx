// "Mine kurser" card, version A3 (Marco 2026-11-02): the course in progress at double width with its next lesson,
// photo cards beside it. Real data: greb's forløb (ChatGPT, Claude, Copilot) and the learner's own progress. The
// photos are the approved placeholders until there is one photo per course.
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { coverFor } from "@/components/platform/kurser/covers";

const O = "var(--pf-e2643f)";

export interface MineKurserCourse {
  slug: string;
  title: string;
  p: number;
  done: number;
  total: number;
  next: { title: string; minutes: number; href: string } | null;
  href: string;
}

export function MineKurser({ courses, className = "" }: { courses: MineKurserCourse[]; className?: string }) {
  const going = courses.filter((c) => c.p > 0 && c.p < 100).length;
  // One column per course beside the big card (the approved card had four courses; greb has three forløb).
  const cols = ["sm:grid-cols-[2fr]", "sm:grid-cols-[2fr_1fr]", "sm:grid-cols-[2fr_1fr_1fr]", "sm:grid-cols-[2fr_1fr_1fr_1fr]"][Math.min(courses.length, 4) - 1] ?? "";
  return (
    <div className={`relative flex min-w-0 flex-col overflow-hidden rounded-[16px] bg-pf-white px-[18px] pb-4 pt-[18px] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Mine kurser</h4><small className="mt-px block text-[11.5px] text-pf-muted">{going} {going === 1 ? "kursus" : "kurser"} i gang</small></div>
        <Link href="/forloeb" className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[var(--pf-f3eeeb)] px-3 text-[11.5px] font-medium text-heading hover:bg-[var(--pf-ebe4e0)]">Se alle <ArrowRightIcon size={12} /></Link>
      </div>
      <div className={`mt-3 grid min-h-[150px] flex-1 grid-cols-2 gap-3 ${cols}`}>
        {courses.slice(0, 4).map((m, i) => i === 0 ? (
          <Link key={m.slug} href={m.next?.href ?? m.href} className="group relative col-span-2 min-h-[150px] overflow-hidden rounded-[12px] sm:col-span-1">
            <Image src={coverFor(m.slug)} alt="" fill sizes="(min-width:1280px) 300px, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--pf-201613)]/90 via-[var(--pf-201613)]/30 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 text-pf-white">
              <p className="text-[10px] text-pf-white/75">{m.next ? `Næste lektion · ${m.next.minutes} min` : m.title}</p>
              <p className="text-[14px] font-semibold leading-tight">{m.next?.title ?? "Alle åbne lektioner er klaret"}</p>
              <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pf-white/25"><div className="h-full rounded-full" style={{ width: `${m.p}%`, background: O }} /></div><span className="text-[10px] font-semibold tabular-nums">{m.done}/{m.total}</span></div>
            </div>
            <span className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-pf-white px-3 text-[11px] font-semibold text-[var(--pf-111)] transition group-hover:-translate-y-px">{m.done > 0 ? "Fortsæt" : "Start"} <ArrowRightIcon size={12} weight="bold" /></span>
          </Link>
        ) : (
          <Link key={m.slug} href={m.href} className="group relative min-h-[150px] overflow-hidden rounded-[12px]">
            <Image src={coverFor(m.slug)} alt="" fill sizes="(min-width:1280px) 150px, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--pf-201613)]/85 via-[var(--pf-201613)]/20 to-transparent" />
            <div className="absolute inset-x-2.5 bottom-2.5 text-pf-white">
              <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight">{m.title}</p>
              <div className="mt-1.5 flex items-center gap-1.5"><div className="h-1 flex-1 overflow-hidden rounded-full bg-pf-white/25"><div className="h-full rounded-full bg-pf-white" style={{ width: `${m.p}%` }} /></div><span className="text-[9.5px] font-semibold tabular-nums">{m.p}%</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
