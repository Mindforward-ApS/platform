"use client";
// Version B · Overblik. Course list after the dark "Design Courses" reference (a brown stage with the courses in
// progress and a learning-time curve, then a table of every course); the course page after the "Eduva" reference
// (a brown course profile with a tick gauge on the left, module rows with bar + score + status on the right).
import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, FlaskIcon, PlayIcon, SealCheckIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { categories } from "@/content/academy";
import { all, card, fmtMin, GREEN, O, sorted, type CourseView, type Module } from "./data";
import { Cover } from "./parts";

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

export function KatalogB() {
  const going = sorted.filter((c) => c.status === "I gang");
  const [start, setStart] = useState(0);
  const shown = going.slice(start, start + 3);
  const [cat, setCat] = useState("Alle");
  const rows = sorted.filter((c) => cat === "Alle" || c.category === cat);

  return (
    <div className="flex flex-col gap-3">
      <section className="grid gap-6 overflow-hidden rounded-[16px] p-6 text-white xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:p-8" style={{ background: STAGE }}>
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
                <Link href={`/kurser-forslag/b/${c.slug}`} className={`group flex h-full flex-col rounded-[16px] p-3 transition hover:-translate-y-0.5 ${i === 0 ? "bg-[#4a332c]" : "bg-white/[0.06] hover:bg-white/[0.09]"}`}>
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

      <section className={`${card} p-[18px]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Alle kurser</h2><small className="mt-px block text-[11.5px] text-muted">Sorteret efter hvor langt du er</small></div>
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-8 rounded-full px-3.5 text-[12px] font-medium transition ${cat === c ? "bg-[#201613] text-white" : "bg-[#f3eeeb] text-heading hover:bg-[#ebe4e0]"}`}>{c}</button>
            ))}
            <span className="ml-2 hidden sm:block"><Demo /></span>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-y-1.5 text-left">
            <thead className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted">
              <tr><th className="px-3 py-1.5 font-semibold">Kursus</th><th className="px-3 font-semibold">Niveau</th><th className="px-3 font-semibold">Moduler</th><th className="w-[200px] px-3 font-semibold">Fremskridt</th><th className="px-3 font-semibold">Gns. score</th><th className="px-3" /></tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.slug} className="group text-[12.5px] text-heading [&>td]:bg-[#fbf8f6] [&>td]:transition group-hover:[&>td]:bg-[#f5efeb] [&>td:first-child]:rounded-l-[12px] [&>td:last-child]:rounded-r-[12px]">
                  <td className="px-3 py-2.5">
                    <Link href={`/kurser-forslag/b/${c.slug}`} className="flex items-center gap-3">
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
                    <Link href={`/kurser-forslag/b/${c.slug}`} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-semibold transition ${c.status === "I gang" ? "text-white hover:brightness-95" : "border border-[#e6dcd6] text-heading hover:bg-white"}`} style={c.status === "I gang" ? { background: O } : undefined}>
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

// ——— Course page with its modules ———

function Gauge({ value }: { value: number }) {
  const n = 22;
  return (
    <svg viewBox="0 0 200 112" className="w-full max-w-[220px]">
      {Array.from({ length: n }, (_, i) => {
        const a = Math.PI - (i / (n - 1)) * Math.PI;
        const r2 = (n: number) => Math.round(n * 100) / 100;
        const x1 = r2(100 + Math.cos(a) * 66), y1 = r2(100 - Math.sin(a) * 66), x2 = r2(100 + Math.cos(a) * 92), y2 = r2(100 - Math.sin(a) * 92);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i / (n - 1) <= value / 100 ? O : "#efe6e1"} strokeWidth="8" strokeLinecap="round" />;
      })}
    </svg>
  );
}

export function ModulB({ c }: { c: CourseView }) {
  const [open, setOpen] = useState<number>(c.nextModule?.n ?? 0);
  const lastScored = [...c.lessonsList].reverse().find((l) => l.score !== undefined);
  const stats = [
    { l: "Lektioner", v: c.done, t: c.total },
    { l: "Opgaver", v: c.tasksDone, t: c.tasks },
    { l: "Moduler", v: c.modules.filter((m) => m.state === "done").length, t: c.modules.length },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1 pt-1 text-[12.5px]">
        <Link href="/kurser-forslag/b" aria-label="Tilbage" className="grid size-8 place-items-center rounded-[10px] bg-white text-heading hover:bg-[#f3eeeb]"><ArrowLeftIcon size={14} /></Link>
        <div><p className="text-[17px] font-semibold leading-tight tracking-[-0.01em] text-heading">{c.title}</p><p className="text-[11.5px] text-muted"><Link href="/kurser-forslag/b" className="hover:underline">Mine kurser</Link> › <span className="text-heading">Moduler</span></p></div>
        <span className="ml-auto"><Demo /></span>
      </div>

      <div className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        {/* Course profile */}
        <aside className="flex flex-col gap-2 rounded-[16px] p-2.5" style={{ background: STAGE }}>
          <div className="px-2.5 pb-2 pt-2.5 text-center text-white">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f6ee] px-2 py-0.5 text-[10.5px] font-semibold text-[#2f8a5c]"><span className="size-1.5 rounded-full bg-[#2f8a5c]" />{c.status}</span>
            <Cover slug={c.slug} sizes="300px" className="mx-auto mt-3 h-[132px] rounded-[14px]" icon={48} zoom={false} />
            <p className="mt-3 text-[16px] font-semibold leading-tight">{c.title}</p>
            <p className="mt-1 text-[11.5px] text-white/60">{c.category} · {c.level} · {fmtMin(c.minutes)}</p>
          </div>
          <div className="rounded-[12px] bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-heading">Fremskridt</p><span className="text-[11px] text-muted">{fmtMin(c.minutesLeft)} tilbage</span></div>
            <div className="relative mx-auto mt-2 flex max-w-[220px] justify-center">
              <Gauge value={c.p} />
              <div className="absolute inset-x-0 bottom-0 text-center"><p className="text-[28px] font-semibold leading-none tracking-[-0.03em] text-heading">{c.p}%</p><span className="mt-1 inline-block rounded-full bg-[#fdf0ea] px-2 py-0.5 text-[10.5px] font-semibold text-[#c4502f]">Modul {c.nextModule?.n ?? c.modules.length} af {c.modules.length}</span></div>
            </div>
            <ul className="mt-4 grid gap-1.5">
              {stats.map((s) => (
                <li key={s.l} className="flex items-center gap-3 rounded-[10px] bg-[#fbf8f6] px-3 py-2 text-[12px]">
                  <span className="w-[70px] text-heading">{s.l}</span>
                  <span className="flex flex-1 gap-[3px]">{Array.from({ length: s.t }, (_, i) => <i key={i} className="h-2.5 flex-1 rounded-[2px]" style={{ background: i < s.v ? O : "#efe6e1" }} />)}</span>
                  <b className="w-9 text-right font-semibold tabular-nums text-heading">{s.v}/{s.t}</b>
                </li>
              ))}
            </ul>
          </div>
          {lastScored && (
            <div className="rounded-[12px] bg-white/[0.06] p-4 text-white">
              <p className="text-[11px] text-white/55">Seneste feedback · {lastScored.title}</p>
              <p className="mt-1.5 text-[12.5px] leading-[1.5] text-white/90">“Godt valgt rolle og et klart format. Giv ét eksempel på jeres tone, så rammer svaret endnu tættere.”</p>
              <p className="mt-2 text-[22px] font-semibold tracking-[-0.03em]">{lastScored.score}<span className="text-[12px] text-white/55"> / 100</span></p>
            </div>
          )}
          <Link href={`/kurser/${c.slug}/${c.next?.n ?? 1}`} className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-[12px] text-[13.5px] font-semibold text-white transition hover:brightness-95" style={{ background: O }}><PlayIcon size={14} weight="fill" />{c.p === 0 ? "Start kurset" : c.next ? `Fortsæt: ${c.next.title}` : "Se kurset igen"}</Link>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <section className={`${card} p-[18px]`}>
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Moduler</h2><small className="mt-px block text-[11.5px] text-muted">{c.modules.length} moduler · {c.total} lektioner · {c.tasks} opgaver</small></div>
            </div>
            <ol className="mt-3 flex flex-col gap-2">
              {c.modules.map((m) => <ModuleRowB key={m.n} c={c} m={m} open={open === m.n} onToggle={() => setOpen(open === m.n ? 0 : m.n)} />)}
            </ol>
          </section>
          <TaskScores c={c} />
        </div>
      </div>
    </div>
  );
}

const status = { done: { t: "Færdig", c: "#2f8a5c", bg: "#e8f6ee" }, current: { t: "I gang", c: "#c4502f", bg: "#fdf0ea" }, todo: { t: "Ikke startet", c: "#8a7a73", bg: "#f3eeeb" } };

function ModuleRowB({ c, m, open, onToggle }: { c: CourseView; m: Module; open: boolean; onToggle: () => void }) {
  const p = Math.round((m.done / m.lessons.length) * 100);
  const scores = m.lessons.filter((l) => l.score !== undefined).map((l) => l.score!);
  const s = status[m.state];
  return (
    <li className={`rounded-[12px] ${open ? "bg-[#fbf8f6] ring-1 ring-[#f1e6df]" : "bg-[#fbf8f6]"}`}>
      <button onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[44px_minmax(0,1fr)] items-center gap-3 px-3 py-3 text-left md:grid-cols-[44px_minmax(0,1fr)_180px_64px_96px_16px]">
        <span className="grid size-11 place-items-center rounded-[10px] text-[15px] font-semibold" style={m.state === "done" ? { background: GREEN, color: "#fff" } : m.state === "current" ? { background: O, color: "#fff" } : { background: "#efe6e1", color: "#201613" }}>
          {m.state === "done" ? <CheckIcon size={17} weight="bold" /> : String(m.n).padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <b className="block truncate text-[13.5px] font-semibold text-heading">{m.title}</b>
          <span className="mt-1 flex flex-wrap gap-1.5 text-[10.5px]">
            <span className="rounded-[5px] bg-white px-1.5 py-0.5 text-heading ring-1 ring-[#efe6e1]">{m.lessons.length} lektioner</span>
            <span className="rounded-[5px] bg-white px-1.5 py-0.5 text-heading ring-1 ring-[#efe6e1]">{m.minutes} min</span>
            {m.lessons.some((l) => l.task) && <span className="rounded-[5px] bg-white px-1.5 py-0.5 text-heading ring-1 ring-[#efe6e1]">{m.lessons.filter((l) => l.task).length} opgaver</span>}
          </span>
        </span>
        <span className="hidden items-center gap-2 md:flex"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#efe6e1]"><span className="block h-full rounded-full" style={{ width: `${p}%`, background: m.state === "done" ? GREEN : O }} /></span><b className="w-9 text-right text-[11.5px] font-semibold tabular-nums text-heading">{p}%</b></span>
        <span className="hidden text-right text-[13px] font-semibold tabular-nums text-heading md:block">{scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "–"}<small className="text-[10px] font-normal text-muted">{scores.length ? "/100" : ""}</small></span>
        <span className="hidden justify-end md:flex"><span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: s.c, background: s.bg }}><i className="size-1.5 rounded-full" style={{ background: s.c }} />{s.t}</span></span>
        <CaretDownIcon size={14} className={`hidden text-muted transition md:block ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="grid gap-1 px-3 pb-3 md:pl-[68px]">
          {m.lessons.map((l) => {
            const cur = l.n === c.next?.n;
            return (
              <li key={l.n}>
                <Link href={`/kurser/${c.slug}/${l.n}`} className={`flex items-center gap-3 rounded-[10px] px-3 py-2 text-[12.5px] transition ${cur ? "bg-white shadow-[0_2px_10px_-4px_rgba(32,22,19,.2)]" : "hover:bg-white"}`}>
                  <span className="w-5 text-[11px] tabular-nums text-muted">{String(l.n).padStart(2, "0")}</span>
                  <span className={`min-w-0 flex-1 truncate ${cur ? "font-semibold" : ""} text-heading`}>{l.title}</span>
                  {l.task && <FlaskIcon size={13} className="text-muted" />}
                  <span className="w-12 text-right text-[11px] text-muted">{l.minutes} min</span>
                  {l.done ? <span className="grid size-5 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={10} weight="bold" /></span> : cur ? <span className="inline-flex h-6 items-center rounded-full px-2.5 text-[10.5px] font-semibold text-white" style={{ background: O }}>Næste</span> : <span className="size-5 rounded-full border border-[#e3d8d2]" />}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

function TaskScores({ c }: { c: CourseView }) {
  const t = c.lessonsList.filter((l) => l.task);
  return (
    <section className={`${card} p-[18px]`}>
      <div className="flex items-start justify-between gap-3">
        <div><h2 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Opgaver i øvemiljøet</h2><small className="mt-px block text-[11.5px] text-muted">Score pr. opgave · mål 80</small></div>
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted"><SealCheckIcon size={14} className="text-[#2f8a5c]" weight="fill" />Bevis ved {c.tasks}/{c.tasks}</span>
      </div>
      <div className="relative mt-4 grid h-[150px] items-end gap-2" style={{ gridTemplateColumns: `repeat(${t.length}, minmax(0,1fr))` }}>
        <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[#e3d8d2]" style={{ bottom: `${0.8 * 128 + 22}px` }}><span className="absolute -top-2.5 right-0 bg-white pl-1 text-[10px] text-muted">80</span></span>
        {t.map((l) => (
          <div key={l.n} className="flex h-full flex-col items-center justify-end gap-1.5">
            {l.score !== undefined ? <span className="text-[11px] font-semibold tabular-nums text-heading">{l.score}</span> : null}
            <div className="flex w-full max-w-[36px] flex-1 items-end overflow-hidden rounded-[8px] bg-[#f7f2ee]" style={{ maxHeight: 128 }}>
              {l.score !== undefined ? <div className="w-full rounded-[8px]" style={{ height: `${l.score}%`, background: l.score >= 80 ? GREEN : O }} /> : null}
            </div>
            <span className="text-[10.5px] tabular-nums text-muted">L{l.n}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
