"use client";
// Version C · Forløbet. Course list after the "Mivo" reference (a big continue card, courses in progress as wide rows,
// the rest as a compact grid); the course page after the "Chaiwala" learning path (modules as stations on a winding
// line, lessons as nodes, a sticky course panel on the right).
import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, FlaskIcon, LockSimpleIcon, PlayIcon, SealCheckIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { card, fmtMin, GREEN, O, sorted, type CourseView, type Module } from "./data";
import { Cover, Ring } from "./parts";

export function KatalogC() {
  const going = sorted.filter((c) => c.status === "I gang");
  const rest = sorted.filter((c) => c.status !== "I gang");
  const top = going[0];
  return (
    <div className="flex flex-col gap-3">
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Link href={`/kurser-forslag/c/${top.slug}`} className="group relative grid min-h-[260px] overflow-hidden rounded-[16px] bg-[#201613] text-white md:grid-cols-[1fr_1fr]">
          <div className="relative z-[1] flex flex-col p-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">Du er i gang med</p>
            <h1 className="mt-2 max-w-[16ch] text-[32px] font-bold leading-[1.05] tracking-[-0.03em] !text-white">{top.title}</h1>
            <div className="mt-5 flex items-center gap-1.5">
              {top.modules.map((m) => <span key={m.n} className="grid size-7 place-items-center rounded-full text-[11px] font-semibold" style={m.state === "done" ? { background: GREEN } : m.state === "current" ? { background: O } : { background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)" }}>{m.state === "done" ? <CheckIcon size={12} weight="bold" /> : m.n}</span>)}
              <span className="ml-2 text-[12px] text-white/65">Modul {top.nextModule?.n} · {top.nextModule?.title}</span>
            </div>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-6">
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[#111] transition group-hover:-translate-y-px">Fortsæt: {top.next?.title} <ArrowRightIcon size={15} weight="bold" /></span>
              <span className="text-[12px] text-white/60">{top.next?.minutes} min</span>
            </div>
          </div>
          <Cover slug={top.slug} sizes="600px" className="hidden md:block [mask-image:linear-gradient(90deg,transparent,#000_35%)]" />
        </Link>
        <div className={`${card} flex flex-col p-[18px]`}>
          <h2 className="text-[15.5px] font-semibold leading-[1.2] text-heading">Ugens mål</h2>
          <small className="text-[11.5px] text-muted">5 lektioner om ugen</small>
          <div className="mt-3 flex items-center gap-4">
            <Ring value={60} size={92} stroke={9}><span className="text-center"><b className="block text-[22px] font-semibold leading-none text-heading">3/5</b><small className="text-[10px] text-muted">lektioner</small></span></Ring>
            <p className="text-[12.5px] leading-[1.5] text-heading">To lektioner mere, så holder du din rytme. Det tager cirka <b>18 min</b>.</p>
          </div>
          <ul className="mt-auto grid gap-1.5 pt-4">
            {[["I dag 14.00", "Tjek et AI-svar for fejl"], ["Man 08.30", "AI til møder og referater"]].map(([t, n]) => <li key={n} className="flex items-center gap-3 rounded-[10px] bg-[#f7f2ee] px-3 py-2 text-[12px]"><span className="w-[70px] text-muted">{t}</span><span className="truncate font-medium text-heading">{n}</span></li>)}
          </ul>
        </div>
      </section>

      <section className={`${card} p-[18px]`}>
        <div className="flex items-center justify-between"><h2 className="text-[15.5px] font-semibold text-heading">I gang <span className="text-muted">· {going.length}</span></h2><Demo /></div>
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {going.map((c) => (
            <li key={c.slug}>
              <Link href={`/kurser-forslag/c/${c.slug}`} className="group flex gap-4 rounded-[14px] border border-[#f1e9e4] p-2.5 transition hover:border-[#e6d9d2] hover:shadow-[0_10px_28px_-14px_rgba(32,22,19,.3)]">
                <Cover slug={c.slug} sizes="170px" className="h-[108px] w-[150px] shrink-0 rounded-[10px]" icon={36} />
                <div className="flex min-w-0 flex-1 flex-col py-1 pr-1">
                  <p className="flex justify-between text-[11px] text-muted"><span>{c.category}</span><span>{fmtMin(c.minutesLeft)} tilbage</span></p>
                  <p className="mt-1 truncate text-[14.5px] font-semibold text-heading">{c.title}</p>
                  <p className="truncate text-[11.5px] text-muted">Næste: {c.next?.title}</p>
                  <div className="mt-auto flex items-center gap-3">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${c.p}%`, background: O }} /></span>
                    <span className="text-[11px] font-semibold tabular-nums text-heading">{c.p}%</span>
                    <span className="inline-flex h-8 items-center rounded-full bg-[#201613] px-3.5 text-[11.5px] font-semibold text-white">Fortsæt</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${card} p-[18px]`}>
        <h2 className="text-[15.5px] font-semibold text-heading">Flere kurser</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {rest.map((c, i) => (
            <li key={c.slug}>
              <Link href={`/kurser-forslag/c/${c.slug}`} className="group block">
                <div className="relative">
                  <Cover slug={c.slug} sizes="280px" className="h-[130px] rounded-[12px]" icon={42} />
                  {c.status === "Færdig" ? <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10.5px] font-semibold text-[#2f8a5c]"><SealCheckIcon size={12} weight="fill" />Færdig</span> : i === 0 ? <span className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: O }}>Anbefalet til dig</span> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-[13.5px] font-semibold leading-tight text-heading">{c.title}</p>
                <p className="mt-1 text-[11px] text-muted">{c.modules.length} moduler · {fmtMin(c.minutes)} · {c.level}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ——— Course page: the learning path ———

const ROW = 92;

function ModulePath({ c, m, startIndex }: { c: CourseView; m: Module; startIndex: number }) {
  const xs = m.lessons.map((_, i) => Math.round((50 + Math.sin((startIndex + i) * 1.1) * 26) * 10) / 10);
  const h = m.lessons.length * ROW;
  const pts = xs.map((x, i) => [x, i * ROW + ROW / 2] as const);
  const d = pts.reduce((s, [x, y], i) => (i ? `${s} C${pts[i - 1][0]},${y - ROW / 2} ${x},${pts[i - 1][1] + ROW / 2} ${x},${y}` : `M50,0 C50,${y / 2} ${x},${y / 2} ${x},${y}`), "") + ` C${pts.at(-1)![0]},${h - 10} 50,${h - 20} 50,${h}`;
  return (
    <div className="relative" style={{ height: h }}>
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        <path d={d} fill="none" stroke={m.state === "todo" ? "#e8ddd7" : m.state === "done" ? GREEN : "#f2c3b2"} strokeWidth="3" strokeDasharray={m.state === "todo" ? "6 7" : undefined} vectorEffect="non-scaling-stroke" />
      </svg>
      {m.lessons.map((l, i) => {
        const cur = l.n === c.next?.n;
        const right = xs[i] < 50;
        return (
          <div key={l.n} className="absolute" style={{ left: `${xs[i]}%`, top: i * ROW + ROW / 2 }}>
            <Link href={`/kurser/${c.slug}/${l.n}`} aria-label={l.title} className={`absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition hover:scale-105 ${cur ? "size-[60px] text-white shadow-[0_0_0_8px_rgba(226,100,63,.15),0_10px_24px_-6px_rgba(226,100,63,.6)]" : l.done ? "size-12 text-white" : "size-12 border-2 border-[#e8ddd7] bg-white text-muted"}`} style={cur ? { background: O } : l.done ? { background: GREEN } : undefined}>
              {l.done ? <CheckIcon size={18} weight="bold" /> : cur ? <PlayIcon size={20} weight="fill" className="translate-x-[1px]" /> : l.task ? <FlaskIcon size={17} /> : <span className="text-[13px] font-semibold">{l.n}</span>}
            </Link>
            <div className={`absolute top-0 w-[220px] -translate-y-1/2 ${right ? (cur ? "left-[50px]" : "left-[40px]") : (cur ? "right-[50px] text-right" : "right-[40px] text-right")}`}>
              <p className={`text-[13px] leading-tight ${cur ? "font-semibold text-heading" : l.done ? "text-heading" : "text-muted"}`}>{l.title}</p>
              <p className="mt-0.5 text-[11px] text-muted">{l.minutes} min{l.task ? " · opgave" : ""}{l.score !== undefined ? ` · ${l.score} point` : ""}</p>
              {cur && <Link href={`/kurser/${c.slug}/${l.n}`} className="mt-1.5 inline-flex h-7 items-center rounded-full px-3 text-[11px] font-semibold text-white" style={{ background: O }}>Start lektion</Link>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ModulC({ c }: { c: CourseView }) {
  let idx = 0;
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
      <section className={`${card} px-5 pb-8 pt-5`}>
        <div className="flex items-center gap-2 text-[12.5px]">
          <Link href="/kurser-forslag/c" aria-label="Tilbage" className="grid size-8 place-items-center rounded-[10px] bg-[#f3eeeb] text-heading hover:bg-[#ebe4e0]"><ArrowLeftIcon size={14} /></Link>
          <Link href="/kurser-forslag/c" className="text-muted hover:underline">Kurser</Link><span className="text-muted">/</span><span className="truncate text-heading">{c.title}</span>
          <span className="ml-auto"><Demo /></span>
        </div>
        <div className="mx-auto mt-6 max-w-[640px] text-center">
          <h1 className="text-[30px] font-bold leading-[1.08] tracking-[-0.03em] text-heading">{c.title}</h1>
          <p className="mt-2 text-[13px] text-muted">{c.modules.length} moduler · {c.total} lektioner · {fmtMin(c.minutes)}</p>
        </div>
        <div className="mx-auto mt-6 max-w-[640px]">
          {c.modules.map((m) => {
            const start = idx;
            idx += m.lessons.length;
            return (
              <div key={m.n}>
                <div className={`relative z-[1] flex items-center gap-4 rounded-[16px] p-4 ${m.state === "current" ? "text-white" : m.state === "done" ? "bg-[#f2faf5]" : "bg-[#f7f2ee]"}`} style={m.state === "current" ? { background: "linear-gradient(140deg, #3a2722 0%, #201613 100%)" } : undefined}>
                  <span className="grid size-12 shrink-0 place-items-center rounded-[12px] text-[16px] font-bold" style={m.state === "done" ? { background: GREEN, color: "#fff" } : m.state === "current" ? { background: O, color: "#fff" } : { background: "#fff", color: "#201613" }}>{m.state === "done" ? <CheckIcon size={20} weight="bold" /> : m.n}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-medium uppercase tracking-[0.07em] ${m.state === "current" ? "text-white/60" : "text-muted"}`}>Modul {m.n}</p>
                    <p className={`text-[17px] font-semibold leading-tight ${m.state === "current" ? "text-white" : "text-heading"}`}>{m.title}</p>
                  </div>
                  <span className={`text-right text-[11.5px] ${m.state === "current" ? "text-white/70" : "text-muted"}`}><b className={`block text-[14px] tabular-nums ${m.state === "current" ? "text-white" : "text-heading"}`}>{m.done}/{m.lessons.length}</b>{m.minutes} min</span>
                </div>
                <ModulePath c={c} m={m} startIndex={start} />
              </div>
            );
          })}
          <div className="flex items-center gap-4 rounded-[16px] border-2 border-dashed border-[#e8ddd7] p-4">
            <span className="grid size-12 place-items-center rounded-[12px] bg-[#f7f2ee] text-muted"><LockSimpleIcon size={20} /></span>
            <div><p className="text-[15px] font-semibold text-heading">Kursusbevis</p><p className="text-[11.5px] text-muted">Låses op, når alle moduler og opgaver er færdige</p></div>
          </div>
        </div>
      </section>

      <aside className="xl:sticky xl:top-3 xl:self-start">
        <div className={`${card} overflow-hidden p-2.5`}>
          <Cover slug={c.slug} sizes="320px" className="h-[150px] rounded-[12px]" icon={50} zoom={false} />
          <div className="p-2.5">
            <div className="flex items-center gap-3">
              <Ring value={c.p} size={56} stroke={6}><b className="text-[13px] font-semibold tabular-nums text-heading">{c.p}%</b></Ring>
              <div><p className="text-[14px] font-semibold text-heading">{c.done} af {c.total} lektioner</p><p className="text-[11.5px] text-muted">{fmtMin(c.minutesLeft)} tilbage</p></div>
            </div>
            <Link href={`/kurser/${c.slug}/${c.next?.n ?? 1}`} className="mt-4 flex h-11 items-center justify-center gap-2 rounded-full text-[13.5px] font-semibold text-white transition hover:brightness-95" style={{ background: O }}><PlayIcon size={14} weight="fill" />{c.p === 0 ? "Start kurset" : "Fortsæt"}</Link>
            <ul className="mt-4 grid gap-2 border-t border-[#f1e9e4] pt-4 text-[12px]">
              <li className="flex justify-between"><span className="text-muted">Opgaver afleveret</span><b className="font-semibold tabular-nums text-heading">{c.tasksDone} af {c.tasks}</b></li>
              <li className="flex justify-between"><span className="text-muted">Gns. score</span><b className="font-semibold tabular-nums text-heading">{c.avgScore ?? "–"}</b></li>
              <li className="flex justify-between"><span className="text-muted">Niveau</span><b className="font-semibold text-heading">{c.level}</b></li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  );
}

