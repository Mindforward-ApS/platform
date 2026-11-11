"use client";
// Mine kurser · version B "Overblik" (Marco 2026-11-03: "B i kurser skal være overblik, fastgør det"), ported 1:1
// to /forloeb. A brown stage with the courses in progress and a learning-time curve, then a table of every course.
// Real data: greb's forløb (one course per tool), the learner's lesson progress and minutes of lessons finished per
// day. The approved category pills become status pills (the forløb have no categories); "Gns. score" stays "–"
// because forløb lessons are checked with a quiz, not scored.
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Cover } from "./Cover";

const O = "var(--pf-e2643f)";
const GREEN = "var(--pf-5cbf8f)";
const card = "relative min-w-0 rounded-[16px] bg-pf-white";
export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} t ${m % 60 ? `${m % 60} m` : ""}`.trim() : `${m} min`);

export type OverblikStatus = "I gang" | "Ikke startet" | "Færdig";
export interface OverblikCourse {
  slug: string;
  title: string;
  level: string;
  status: OverblikStatus;
  p: number;
  done: number;
  total: number;
  minutes: number;
  modules: { nr: number; lessons: number; done: number; state: "done" | "current" | "todo" }[];
  nextHref: string | null;
}
export interface LearningDay {
  label: string;
  minutes: number;
}
type CourseView = OverblikCourse;
const FILTERS = ["Alle", "I gang", "Ikke startet", "Færdig"] as const;

const STAGE = "linear-gradient(160deg, var(--pf-33231f) 0%, var(--pf-201613) 55%, var(--pf-1a0f0c) 100%)";

function Segments({ c, dark }: { c: CourseView; dark?: boolean }) {
  return (
    <div className="flex gap-1">
      {c.modules.map((m) => (
        <span key={m.nr} className={`h-[5px] flex-1 overflow-hidden rounded-full ${dark ? "bg-pf-white/12" : "bg-[var(--pf-f1e9e4)]"}`}>
          <span className="block h-full rounded-full" style={{ width: `${(m.done / Math.max(1, m.lessons)) * 100}%`, background: m.state === "done" ? (dark ? "var(--pf-f6b49b)" : GREEN) : O }} />
        </span>
      ))}
    </div>
  );
}

export function KurserOverblik({ courses, days }: { courses: OverblikCourse[]; days: LearningDay[] }) {
  const href = (slug: string) => `/forloeb/${slug}`;
  const sorted = courses;
  // Started courses first; with fewer than three started, the stage fills up with the next ones.
  const going = sorted.filter((c) => c.status !== "Færdig").length >= 3 ? sorted.filter((c) => c.status !== "Færdig") : sorted;
  const [start, setStart] = useState(0);
  const shown = going.slice(start, start + 3);
  const [cat, setCat] = useState<(typeof FILTERS)[number]>("Alle");
  const rows = sorted.filter((c) => cat === "Alle" || c.status === cat);

  return (
    // lg+: the page fills the window and only the "Alle kurser" box scrolls (Marco 2026-11-03).
    <div className="flex flex-col gap-3 lg:h-[max(560px,calc(100svh-5.9rem))]">
      <section className="grid shrink-0 gap-6 overflow-hidden rounded-[16px] p-6 text-pf-white xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:p-8" style={{ background: STAGE }}>
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-pf-white/55">Dit katalog · {courses.length} kurser</p>
              <h1 className="mt-2 text-[44px] font-bold leading-[0.95] tracking-[-0.035em] !text-pf-white xl:text-[56px]">Mine kurser</h1>
            </div>
            <div className="flex gap-1.5">
              <button aria-label="Forrige" disabled={start === 0} onClick={() => setStart(Math.max(0, start - 1))} className="grid size-9 place-items-center rounded-[10px] border border-pf-white/15 text-pf-white/80 transition hover:bg-pf-white/10 disabled:opacity-30"><CaretLeftIcon size={14} weight="bold" /></button>
              <button aria-label="Næste" disabled={start + 3 >= going.length} onClick={() => setStart(start + 1)} className="grid size-9 place-items-center rounded-[10px] border border-pf-white/15 text-pf-white/80 transition hover:bg-pf-white/10 disabled:opacity-30"><CaretRightIcon size={14} weight="bold" /></button>
            </div>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {shown.map((c, i) => (
              <li key={c.slug}>
                <Link href={href(c.slug)} className={`group flex h-full flex-col rounded-[16px] p-3 transition hover:-translate-y-0.5 ${i === 0 ? "bg-[var(--pf-4a332c)]" : "bg-pf-white/[0.06] hover:bg-pf-white/[0.09]"}`}>
                  <Cover slug={c.slug} sizes="240px" className="h-[118px] rounded-[11px]" />
                  <p className="mt-3 line-clamp-2 min-h-[2.5em] text-[14.5px] font-semibold leading-[1.25] text-pf-white">{c.title}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-pf-white/50">Lektion {c.done}/{c.total}</p>
                  <div className="mt-2"><Segments c={c} dark /></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <LearningCurve days={days} />
      </section>

      <section className={`${card} flex min-h-0 flex-1 flex-col p-[18px] lg:pb-0`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Alle kurser</h2><small className="mt-px block text-[11.5px] text-pf-muted">Sorteret efter hvor langt du er</small></div>
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-8 rounded-full px-3.5 text-[12px] font-medium transition ${cat === c ? "bg-[var(--pf-201613)] text-pf-white" : "bg-[var(--pf-f3eeeb)] text-heading hover:bg-[var(--pf-ebe4e0)]"}`}>{c}</button>
            ))}
          </div>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain lg:pb-[18px]">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-1.5 text-left">
            <thead className="sticky top-0 z-[1] bg-pf-white text-[10.5px] font-semibold uppercase tracking-[0.07em] text-pf-muted">
              <tr><th className="px-3 py-1.5 font-semibold">Kursus</th><th className="px-3 font-semibold">Niveau</th><th className="px-3 font-semibold">Moduler</th><th className="w-[200px] px-3 font-semibold">Fremskridt</th><th className="px-3 font-semibold">Gns. score</th><th className="px-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.slug} className="group text-[12.5px] text-heading [&>td]:bg-[var(--pf-fbf8f6)] [&>td]:transition group-hover:[&>td]:bg-[var(--pf-f5efeb)] [&>td:first-child]:rounded-l-[12px] [&>td:last-child]:rounded-r-[12px]">
                  <td className="px-3 py-2.5">
                    <Link href={href(c.slug)} className="flex items-center gap-3">
                      <Cover slug={c.slug} sizes="44px" className="size-11 shrink-0 rounded-[10px]" />
                      <span className="min-w-0"><b className="block truncate text-[13px] font-semibold">{c.title}</b><small className="block truncate text-[10px] font-medium uppercase tracking-[0.06em] text-pf-muted">Forløb</small></span>
                    </Link>
                  </td>
                  <td className="px-3">{c.level}</td>
                  <td className="px-3 tabular-nums">{c.modules.length} · {fmtMin(c.minutes)}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2.5"><span className="w-[92px] whitespace-nowrap tabular-nums"><b className="font-semibold">{c.done}</b><span className="text-pf-muted">/{c.total}</span> <span className="text-pf-muted">({c.p}%)</span></span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--pf-efe6e1)]"><span className="block h-full rounded-full" style={{ width: `${c.p}%`, background: c.p >= 100 ? GREEN : O }} /></span></div>
                  </td>
                  <td className="px-3 tabular-nums"><span className="text-pf-muted">–</span></td>
                  <td className="px-3 text-right">
                    <Link href={c.status === "I gang" && c.nextHref ? c.nextHref : href(c.slug)} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-semibold transition ${c.status === "I gang" ? "text-pf-white hover:brightness-95" : "border border-[var(--pf-e6dcd6)] text-heading hover:bg-pf-white"}`} style={c.status === "I gang" ? { background: O } : undefined}>
                      {c.status === "I gang" ? "Fortsæt" : c.status === "Færdig" ? "Se kurset" : "Start"}<ArrowRightIcon size={12} weight="bold" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// Learning time for the last 7 days, as a smooth curve with a marked day (reference: "Learning Stats").
// Real: minutes of forløb lessons finished per day (lesson length), last 7 days, compared with the 7 days before.
function LearningCurve({ days: series }: { days: LearningDay[] }) {
  const days = series.slice(-7).map((d) => d.label);
  const min = series.slice(-7).map((d) => d.minutes);
  const prev = series.slice(0, -7).reduce((s, d) => s + d.minutes, 0);
  const sum = min.reduce((s, m) => s + m, 0);
  const change = prev ? Math.round(((sum - prev) / prev) * 100) : null;
  const W = 400, H = 170, max = Math.max(50, ...min);
  const pts = min.map((m, i) => [Math.round((i / (min.length - 1)) * W * 10) / 10, Math.round((H - (m / max) * (H - 20) - 6) * 10) / 10] as const);
  const d = pts.reduce((s, [x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = pts[i - 1], cx = (px + x) / 2;
    return `${s} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const hi = min.indexOf(Math.max(...min));
  return (
    <div className="flex min-w-0 flex-col rounded-[16px] bg-pf-white/[0.05] p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[15px] font-semibold text-pf-white">Læringstid</p><p className="mt-0.5 text-[11.5px] text-pf-white/55">Seneste 7 dage</p></div>
        <p className="text-right"><span className="text-[24px] font-semibold tracking-[-0.03em] text-pf-white">{sum >= 60 ? `${Math.floor(sum / 60)} t ${sum % 60} m` : `${sum} m`}</span>{change !== null && <span className={`block text-[11px] font-semibold ${change >= 0 ? "text-[var(--pf-7fd6a6)]" : "text-pf-white/55"}`}>{change >= 0 ? "↑" : "↓"} {Math.abs(change)} % fra sidste uge</span>}</p>
      </div>
      <div className="relative mt-4 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[170px] w-full overflow-visible">
          <defs><linearGradient id="lc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={O} stopOpacity=".45" /><stop offset="1" stopColor={O} stopOpacity="0" /></linearGradient></defs>
          {pts.map(([x]) => <line key={x} x1={x} x2={x} y1="0" y2={H} stroke="var(--pf-rgba-255-255-255-06)" />)}
          <path d={`${d} L${W},${H} L0,${H}Z`} fill="url(#lc)" />
          <path d={d} fill="none" stroke={O} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1={pts[hi][0]} x2={pts[hi][0]} y1={pts[hi][1]} y2={H} stroke="var(--pf-rgba-255-255-255-35)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-pf-white" style={{ left: `${(pts[hi][0] / W) * 100}%`, top: pts[hi][1], background: O }} />
        <span className="absolute -translate-x-1/2 -translate-y-[150%] whitespace-nowrap rounded-[8px] bg-pf-white px-2 py-1 text-[11px] font-semibold text-[var(--pf-201613)]" style={{ left: `${(pts[hi][0] / W) * 100}%`, top: pts[hi][1] }}>{days[hi]} · {min[hi]} min</span>
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] font-medium uppercase tracking-[0.06em] text-pf-white/45">{days.map((x) => <span key={x}>{x}</span>)}</div>
    </div>
  );
}

