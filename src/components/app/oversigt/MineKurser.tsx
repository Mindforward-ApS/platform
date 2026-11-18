// "Mine kurser" card, version A3 (big current course + three photo cards; earlier: A with real photo covers) (Marco 2026-11-02). Replaces Læringsrytme on the new
// dashboard. The photos are placeholders until there is one photo per course.
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { courseBySlug, lessonsFor, progress } from "@/content/platform";

const O = "#e2643f";
const covers: Record<string, string> = {
  "ai-paa-arbejdet": "/img/kurser/team.jpg",
  "gode-prompts": "/img/kurser/whiteboard.jpg",
  "excel-med-ai": "/img/kurser/feedback.jpg",
  "mails-og-tilbud": "/img/kurser/telefon.jpg",
};
const mine = Object.keys(covers).map((s) => {
  const c = courseBySlug.get(s)!;
  const ls = lessonsFor(c);
  return { c, p: progress[s] ?? 0, done: ls.filter((l) => l.done).length, total: ls.length, next: ls.find((l) => !l.done) };
});

export function MineKurser({ className = "" }: { className?: string }) {
  return (
    <div className={`relative flex min-w-0 flex-col overflow-hidden rounded-[16px] bg-white px-[18px] pb-4 pt-[18px] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Mine kurser</h4><small className="mt-px block text-[11.5px] text-muted">{mine.length} kurser i gang</small></div>
        <Link href="/kurser" className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#f3eeeb] px-3 text-[11.5px] font-medium text-heading hover:bg-[#ebe4e0]">Se alle <ArrowRightIcon size={12} /></Link>
      </div>
      {/* Version A3 (Marco 2026-11-02): the course in progress at double width with the next lesson, three photo cards beside it. */}
      <div className="mt-3 grid min-h-[150px] flex-1 grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        {mine.map((m, i) => i === 0 ? (
          <Link key={m.c.slug} href={`/kurser/${m.c.slug}/${m.next?.n ?? 1}`} className="group relative col-span-2 min-h-[150px] overflow-hidden rounded-[12px] sm:col-span-1">
            <Image src={covers[m.c.slug]} alt="" fill sizes="(min-width:1280px) 300px, 90vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#201613]/90 via-[#201613]/30 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 text-white">
              <p className="text-[10px] text-white/75">Næste lektion · {m.next?.minutes} min</p>
              <p className="text-[14px] font-semibold leading-tight">{m.next?.title}</p>
              <div className="mt-2 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full" style={{ width: `${m.p}%`, background: O }} /></div><span className="text-[10px] font-semibold tabular-nums">{m.done}/{m.total}</span></div>
            </div>
            <span className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[11px] font-semibold text-[#111] transition group-hover:-translate-y-px">Fortsæt <ArrowRightIcon size={12} weight="bold" /></span>
          </Link>
        ) : (
          <Link key={m.c.slug} href={`/kurser/${m.c.slug}`} className="group relative min-h-[150px] overflow-hidden rounded-[12px]">
            <Image src={covers[m.c.slug]} alt="" fill sizes="(min-width:1280px) 150px, 45vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#201613]/85 via-[#201613]/20 to-transparent" />
            <div className="absolute inset-x-2.5 bottom-2.5 text-white">
              <p className="line-clamp-2 text-[11.5px] font-semibold leading-tight">{m.c.title}</p>
              <div className="mt-1.5 flex items-center gap-1.5"><div className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white" style={{ width: `${m.p}%` }} /></div><span className="text-[9.5px] font-semibold tabular-nums">{m.p}%</span></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
