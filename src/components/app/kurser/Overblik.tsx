"use client";
// Mine kurser · version B "Overblik" (Marco 2026-11-03: "B i kurser skal være overblik, fastgør det").
// A brown stage with the courses in progress and a learning-time curve, then a table of every course.
// After the dark "Design Courses" Dribbble reference (design/references/kursus-sider/22019053.png).
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { categories } from "@/content/academy";
import { all, card, fmtMin, GREEN, O, sorted, type CourseView } from "@/content/kurser-view";
import { Cover } from "./Cover";

const STAGE = "linear-gradient(160deg, #33231f 0%, #201613 55%, #1a0f0c 100%)";

function Segments({ c, dark }: { c: CourseView; dark?: boolean }) {
  return (
    <div className="flex gap-1">
      {c.modules.map((m) => (
        <span key={m.n} className={`h-[5px] flex-1 overflow-hidden rounded-full ${dark ? "bg-white/12" : "bg-[#f1e9e4]"}`}>
          <span className="block h-full rounded-full" style={{ width: `${(m.done / m.lessons.length) * 100}%`, background: m.state === "done" ? (dark ? "#f6b49b" : GREEN) : O }} />
        </span>
      ))}
    </div>
  );
}

export function KurserOverblik({ href = (slug: string) => `/kurser/${slug}` }: { href?: (slug: string) => string }) {
  const going = sorted.filter((c) => c.status === "I gang");
  const [start, setStart] = useState(0);
  const shown = going.slice(start, start + 3);
  const [cat, setCat] = useState("Alle");
  const rows = sorted.filter((c) => cat === "Alle" || c.category === cat);

  return (
    // lg+: the page fills the window and only the "Alle kurser" box scrolls (Marco 2026-11-03).
    <div className="flex flex-col gap-3 lg:h-[max(560px,calc(100svh-5.9rem))]">
      <section className="grid shrink-0 gap-6 overflow-hidden rounded-[16px] p-6 text-white xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:p-8" style={{ background: STAGE }}>
        <div className="min-w-0">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">Dit katalog · {all.length} kurser</p>
              <h1 className="mt-2 text-[44px] font-bold leading-[0.95] tracking-[-0.035em] !text-white xl:text-[56px]">Mine kurser</h1>
            </div>
            <div className="flex gap-1.5">
              <button aria-label="Forrige" disabled={start === 0} onClick={() => setStart(Math.max(0, start - 1))} className="grid size-9 place-items-center rounded-[10px] border border-white/15 text-white/80 transition hover:bg-white/10 disabled:opacity-30"><CaretLeftIcon size={14} weight="bold" /></button>
              <button aria-label="Næste" disabled={start + 3 >= going.length} onClick={() => setStart(start + 1)} className="grid size-9 place-items-center rounded-[10px] border border-white/15 text-white/80 transition hover:bg-white/10 disabled:opacity-30"><CaretRightIcon size={14} weight="bold" /></button>
            </div>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {shown.map((c, i) => (
              <li key={c.slug}>
                <Link href={href(c.slug)} className={`group flex h-full flex-col rounded-[16px] p-3 transition hover:-translate-y-0.5 ${i === 0 ? "bg-[#4a332c]" : "bg-white/[0.06] hover:bg-white/[0.09]"}`}>
                  <Cover slug={c.slug} sizes="240px" className="h-[118px] rounded-[11px]" icon={40} />
                  <p className="mt-3 line-clamp-2 min-h-[2.5em] text-[14.5px] font-semibold leading-[1.25] text-white">{c.title}</p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">Lektion {c.done}/{c.total}</p>
                  <div className="mt-2"><Segments c={c} dark /></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <LearningCurve />
      </section>

      <section className={`${card} flex min-h-0 flex-1 flex-col p-[18px] lg:pb-0`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Alle kurser</h2><small className="mt-px block text-[11.5px] text-muted">Sorteret efter hvor langt du er</small></div>
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-8 rounded-full px-3.5 text-[12px] font-medium transition ${cat === c ? "bg-[#201613] text-white" : "bg-[#f3eeeb] text-heading hover:bg-[#ebe4e0]"}`}>{c}</button>
            ))}
            <span className="ml-2 hidden sm:block"><Demo /></span>
          </div>
        </div>
        <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain lg:pb-[18px]">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-1.5 text-left">
            <thead className="sticky top-0 z-[1] bg-white text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
              <tr><th className="px-3 py-1.5 font-semibold">Kursus</th><th className="px-3 font-semibold">Niveau</th><th className="px-3 font-semibold">Moduler</th><th className="w-[200px] px-3 font-semibold">Fremskridt</th><th className="px-3 font-semibold">Gns. score</th><th className="px-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.slug} className="group text-[12.5px] text-heading [&>td]:bg-[#fbf8f6] [&>td]:transition group-hover:[&>td]:bg-[#f5efeb] [&>td:first-child]:rounded-l-[12px] [&>td:last-child]:rounded-r-[12px]">
                  <td className="px-3 py-2.5">
                    <Link href={href(c.slug)} className="flex items-center gap-3">
                      <Cover slug={c.slug} sizes="44px" className="size-11 shrink-0 rounded-[10px]" icon={20} />
                      <span className="min-w-0"><b className="block truncate text-[13px] font-semibold">{c.title}</b><small className="block truncate text-[10px] font-medium uppercase tracking-[0.06em] text-muted">{c.category}</small></span>
                    </Link>
                  </td>
                  <td className="px-3">{c.level}</td>
                  <td className="px-3 tabular-nums">{c.modules.length} · {fmtMin(c.minutes)}</td>
                  <td className="px-3">
                    <div className="flex items-center gap-2.5"><span className="w-[92px] whitespace-nowrap tabular-nums"><b className="font-semibold">{c.done}</b><span className="text-muted">/{c.total}</span> <span className="text-muted">({c.p}%)</span></span><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#efe6e1]"><span className="block h-full rounded-full" style={{ width: `${c.p}%`, background: c.p >= 100 ? GREEN : O }} /></span></div>
                  </td>
                  <td className="px-3 tabular-nums">{c.avgScore ?? <span className="text-muted">–</span>}</td>
                  <td className="px-3 text-right">
                    <Link href={href(c.slug)} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-semibold transition ${c.status === "I gang" ? "text-white hover:brightness-95" : "border border-[#e6dcd6] text-heading hover:bg-white"}`} style={c.status === "I gang" ? { background: O } : undefined}>
                      {c.status === "I gang" ? "Fortsæt" : c.status === "Færdig" ? "Se bevis" : "Start"}<ArrowRightIcon size={12} weight="bold" />
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
function LearningCurve() {
  const days = ["Tir", "Ons", "Tor", "Fre", "Lør", "Søn", "Man"];
  const min = [34, 22, 41, 28, 8, 12, 46];
  const W = 400, H = 170, max = 50;
  const pts = min.map((m, i) => [Math.round((i / (min.length - 1)) * W * 10) / 10, Math.round((H - (m / max) * (H - 20) - 6) * 10) / 10] as const);
  const d = pts.reduce((s, [x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = pts[i - 1], cx = (px + x) / 2;
    return `${s} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const hi = 2;
  return (
    <div className="flex min-w-0 flex-col rounded-[16px] bg-white/[0.05] p-5">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[15px] font-semibold text-white">Læringstid</p><p className="mt-0.5 text-[11.5px] text-white/55">Seneste 7 dage</p></div>
        <p className="text-right"><span className="text-[24px] font-semibold tracking-[-0.03em] text-white">3 t 11 m</span><span className="block text-[11px] font-semibold text-[#7fd6a6]">↑ 18 % fra sidste uge</span></p>
      </div>
      <div className="relative mt-4 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-[170px] w-full overflow-visible">
          <defs><linearGradient id="lc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={O} stopOpacity=".45" /><stop offset="1" stopColor={O} stopOpacity="0" /></linearGradient></defs>
          {pts.map(([x]) => <line key={x} x1={x} x2={x} y1="0" y2={H} stroke="rgba(255,255,255,.06)" />)}
          <path d={`${d} L${W},${H} L0,${H}Z`} fill="url(#lc)" />
          <path d={d} fill="none" stroke={O} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <line x1={pts[hi][0]} x2={pts[hi][0]} y1={pts[hi][1]} y2={H} stroke="rgba(255,255,255,.35)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white" style={{ left: `${(pts[hi][0] / W) * 100}%`, top: pts[hi][1], background: O }} />
        <span className="absolute -translate-x-1/2 -translate-y-[150%] whitespace-nowrap rounded-[8px] bg-white px-2 py-1 text-[11px] font-semibold text-[#201613]" style={{ left: `${(pts[hi][0] / W) * 100}%`, top: pts[hi][1] }}>Tor · {min[hi]} min</span>
      </div>
      <div className="mt-2 flex justify-between text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/45">{days.map((x) => <span key={x}>{x}</span>)}</div>
    </div>
  );
}

