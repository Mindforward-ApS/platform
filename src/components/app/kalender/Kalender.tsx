"use client";
// Kalender. Version K "Uge" is live on /plan with drag to move (Marco 2026-11-03); J and L stay as previews.
// Three calendar versions (Marco 2026-11-03: "laver du 3 versioner af Kalender"). Refs in design/references/kalender/.
// J Måned  — month grid with a side panel: mini month, today's list, type filters (Caleican / slothUI).
// K Uge    — week timeline 08–17 with event cards, a now-line and a "now" card (Caleican 3D / Aloplanner).
// L Plan   — agenda grouped by day, today as a brown card, plus a week summary and reminders (Mondly planner).
// Demo data from src/content/platform.ts (October 2026, today = the 23rd). /plan is untouched.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { ArrowRightIcon, BookOpenIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, ClockIcon, FlaskIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { courseBySlug, plan, week, type PlanEvent } from "@/content/platform";

const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613", LINE = "#f1e9e4";
const card = "relative min-w-0 rounded-[16px] bg-white";
const STAGE = "linear-gradient(160deg, #33231f 0%, #201613 55%, #1a0f0c 100%)";
const TODAY = week.today, NOW = week.now;
const DOW = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const DOW_LONG = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];
const FIRST_DOW = 3; // 1 Oct 2026 is a Thursday (Mon = 0)
const dow = (d: number) => (d - 1 + FIRST_DOW) % 7;

type T = PlanEvent["type"];
const TYPE: Record<T, { c: string; soft: string; ink: string; icon: typeof BookOpenIcon; label: string }> = {
  Lektion: { c: O, soft: "#fdf0ea", ink: "#a8432a", icon: BookOpenIcon, label: "Lektioner" },
  Øvelse: { c: INK, soft: "#efe8e4", ink: INK, icon: FlaskIcon, label: "Øvelser" },
  Holdmøde: { c: GREEN, soft: "#e8f6ee", ink: "#2f8a5c", icon: UsersThreeIcon, label: "Holdmøder" },
};
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const past = (e: PlanEvent) => e.date < TODAY || (e.date === TODAY && mins(e.end) <= mins(NOW));
const byDay = (d: number, l = plan) => l.filter((e) => e.date === d).sort((a, b) => a.start.localeCompare(b.start));
const course = (e: PlanEvent) => (e.course ? courseBySlug.get(e.course)?.title : e.type === "Holdmøde" ? "Salg & service" : undefined);
const dur = (e: PlanEvent) => mins(e.end) - mins(e.start);

function useFilter() {
  const [on, setOn] = useState<Record<T, boolean>>({ Lektion: true, Øvelse: true, Holdmøde: true });
  const list = useMemo(() => plan.filter((e) => on[e.type]), [on]);
  return { on, setOn, list };
}

function Head({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
      <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">{title}</h1><p className="mt-1.5 text-[12.5px] text-muted">10 minutter ad gangen er nok. Sæt tiden af, så bliver det en vane.</p></div>
      <div className="flex items-center gap-2">{children}<Demo /><button className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white" style={{ background: INK }}><PlusIcon size={14} weight="bold" />Planlæg tid</button></div>
    </header>
  );
}

function Nav({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-[19px] font-semibold tracking-[-0.015em] text-heading">{label}</p>
      <button aria-label="Forrige" className="grid size-8 place-items-center rounded-[9px] border border-[#ece4df] text-heading hover:bg-[#f7f2ee]"><CaretLeftIcon size={13} /></button>
      <button className="h-8 rounded-[9px] border border-[#ece4df] px-3 text-[12px] font-medium text-heading hover:bg-[#f7f2ee]">I dag</button>
      <button aria-label="Næste" className="grid size-8 place-items-center rounded-[9px] border border-[#ece4df] text-heading hover:bg-[#f7f2ee]"><CaretRightIcon size={13} /></button>
    </div>
  );
}

function Filters({ f, dark }: { f: ReturnType<typeof useFilter>; dark?: boolean }) {
  return (
    <ul className="grid gap-1">
      {(Object.keys(TYPE) as T[]).map((t) => {
        const n = plan.filter((e) => e.type === t).length;
        return (
          <li key={t}>
            <button onClick={() => f.setOn({ ...f.on, [t]: !f.on[t] })} aria-pressed={f.on[t]} className={`flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-[12.5px] ${dark ? "text-white hover:bg-white/[0.06]" : "text-heading hover:bg-[#f7f2ee]"}`}>
              <span className="grid size-4 place-items-center rounded-[4px] border-[1.5px]" style={{ borderColor: TYPE[t].c, background: f.on[t] ? TYPE[t].c : "transparent" }}>{f.on[t] && <CheckIcon size={10} weight="bold" color="#fff" />}</span>
              <span className="flex-1 text-left">{TYPE[t].label}</span>
              <span className={`text-[11px] tabular-nums ${dark ? "text-white/50" : "text-muted"}`}>{n}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MiniMonth({ sel, setSel }: { sel: number; setSel: (d: number) => void }) {
  const cells = [...Array(FIRST_DOW).fill(0), ...Array.from({ length: 31 }, (_, i) => i + 1)];
  return (
    <div>
      <div className="flex items-center justify-between"><p className="text-[13px] font-semibold text-heading">Oktober 2026</p><span className="flex gap-1 text-muted"><CaretLeftIcon size={12} /><CaretRightIcon size={12} /></span></div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[10.5px] text-muted">{DOW.map((d) => <span key={d}>{d[0]}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-y-1 text-center">
        {cells.map((d, i) => d === 0 ? <span key={i} /> : (
          <button key={i} onClick={() => setSel(d)} className={`relative mx-auto grid size-7 place-items-center rounded-full text-[11.5px] tabular-nums transition ${d === sel ? "font-semibold text-white" : d === TODAY ? "font-semibold text-[#c4502f]" : d < TODAY ? "text-muted hover:bg-[#f7f2ee]" : "text-heading hover:bg-[#f7f2ee]"}`} style={d === sel ? { background: O } : undefined}>
            {d}{byDay(d).length > 0 && d !== sel && <i className="absolute bottom-0.5 size-1 rounded-full" style={{ background: O }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

function EventRow({ e, compact }: { e: PlanEvent; compact?: boolean }) {
  const x = TYPE[e.type];
  const done = past(e);
  return (
    <Link href={e.href} className={`group flex min-w-0 items-center gap-2.5 rounded-[12px] border p-2.5 transition hover:border-[#e6d9d2] ${done ? "opacity-55" : ""}`} style={{ borderColor: LINE }}>
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px]" style={{ background: x.soft, color: x.ink }}>{done ? <CheckIcon size={15} weight="bold" /> : <x.icon size={16} weight="fill" />}</span>
      <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold text-heading">{e.title}</b>{!compact && <small className="block truncate text-[11px] text-muted">{course(e)}</small>}</span>
      <span className="shrink-0 text-right text-[11px] leading-tight tabular-nums text-muted">{e.start}<br />{dur(e)} min</span>
    </Link>
  );
}

// ——— J · Måned ———
export function J() {
  const f = useFilter();
  const [sel, setSel] = useState(TODAY);
  const cells = [...Array(FIRST_DOW).fill(0), ...Array.from({ length: 31 }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(0);
  const selList = byDay(sel, f.list);
  return (
    <div className="flex flex-col gap-3">
      <Head title="Kalender" />
      <section className="grid gap-3 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-3">
          <div className={`${card} p-4`}><MiniMonth sel={sel} setSel={setSel} /></div>
          <div className={`${card} p-4`}>
            <p className="text-[13px] font-semibold text-heading">{sel === TODAY ? "I dag" : `${DOW_LONG[dow(sel)]} ${sel}. okt`}</p>
            <p className="text-[11.5px] text-muted">{selList.length ? `${selList.length} aftaler · ${selList.reduce((a, e) => a + dur(e), 0)} min` : "Ingen aftaler"}</p>
            <div className="mt-3 grid gap-2">{selList.map((e) => <EventRow key={e.id} e={e} compact />)}</div>
          </div>
          <div className={`${card} p-4`}><p className="mb-2 text-[13px] font-semibold text-heading">Vis</p><Filters f={f} /></div>
        </aside>
        <div className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><Nav label="Oktober 2026" /><div className="flex gap-1 rounded-[10px] bg-[#f7f2ee] p-1">{["Dag", "Uge", "Måned"].map((v) => <span key={v} className={`h-8 rounded-[8px] px-3.5 text-[12px] font-medium leading-8 ${v === "Måned" ? "bg-white text-heading shadow-[0_1px_3px_rgba(32,22,19,.12)]" : "text-muted"}`}>{v}</span>)}</div></div>
          <div className="mt-4 grid grid-cols-7 border-b pb-2 text-[11px] font-medium text-muted" style={{ borderColor: LINE }}>{DOW.map((d) => <span key={d} className="px-2">{d}</span>)}</div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const l = d ? byDay(d, f.list) : [];
              return (
                <button key={i} disabled={!d} onClick={() => d && setSel(d)} className={`flex min-h-[112px] flex-col gap-1 border-b border-r p-1.5 text-left transition ${i % 7 === 0 ? "border-l" : ""} ${!d ? "bg-[#fbf9f7]" : d === sel ? "bg-[#fdf6f2]" : "hover:bg-[#fbf8f6]"} ${dow(d || 1) >= 5 && d ? "bg-[#fcfaf9]" : ""}`} style={{ borderColor: LINE }}>
                  {d > 0 && <span className={`grid size-6 place-items-center self-end rounded-full text-[11.5px] font-semibold tabular-nums ${d === TODAY ? "text-white" : d < TODAY ? "text-muted" : "text-heading"}`} style={d === TODAY ? { background: O } : undefined}>{d}</span>}
                  {l.slice(0, 3).map((e) => (
                    <span key={e.id} className={`flex items-center gap-1 truncate rounded-[6px] px-1.5 py-[3px] text-[10.5px] font-medium ${past(e) ? "opacity-50" : ""}`} style={{ background: TYPE[e.type].soft, color: TYPE[e.type].ink }}>
                      <i className="size-1.5 shrink-0 rounded-full" style={{ background: TYPE[e.type].c }} /><span className="truncate">{e.title}</span>
                    </span>
                  ))}
                  {l.length > 3 && <span className="px-1.5 text-[10.5px] font-semibold" style={{ color: O }}>+{l.length - 3} mere</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

// ——— K · Uge ——— (chosen by Marco 2026-11-03; "man skal kunne rykke rundt på tingene selv")
// Drag an event to another day or time: pointer events (mouse and touch), 15-minute snapping, a ghost while dragging,
// and a toast with Fortryd. A click without moving opens the event. Arrow keys move a focused event too.
const H0 = 8, H1 = 17, PX = 64; // 08–17, px per hour
const SNAP = 15;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
type Drag = { id: string; dx: number; dy: number; x0: number; y0: number; moved: boolean; date: number; start: number };

export function K() {
  const router = useRouter();
  const [evs, setEvs] = useState<PlanEvent[]>(plan);
  const [on, setOn] = useState<Record<T, boolean>>({ Lektion: true, Øvelse: true, Holdmøde: true });
  const f = { on, setOn, list: evs.filter((e) => on[e.type]) };
  const [drag, setDrag] = useState<Drag | null>(null);
  const [undo, setUndo] = useState<{ prev: PlanEvent[]; text: string } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const days = Array.from({ length: 7 }, (_, i) => week.weekStart + i);
  const nowY = ((mins(NOW) - H0 * 60) / 60) * PX;
  const next = f.list.filter((e) => e.date === TODAY && mins(e.start) >= mins(NOW)).sort((a, b) => a.start.localeCompare(b.start))[0];
  const weekMin = f.list.filter((e) => days.includes(e.date)).reduce((a, e) => a + dur(e), 0);

  const place = (clientX: number, clientY: number, d: Drag, e: PlanEvent) => {
    const r = grid.current!.getBoundingClientRect();
    const colW = (r.width - 52) / 7;
    const col = Math.max(0, Math.min(6, Math.floor((clientX - d.dx - r.left - 52 + colW / 2) / colW)));
    const raw = H0 * 60 + ((clientY - d.dy - r.top) / PX) * 60;
    const start = Math.max(H0 * 60, Math.min(H1 * 60 - dur(e), Math.round(raw / SNAP) * SNAP));
    return { date: days[col], start };
  };
  const commit = (id: string, date: number, start: number) => {
    const e = evs.find((x) => x.id === id)!;
    if (e.date === date && mins(e.start) === start) return;
    const prev = evs;
    setEvs(evs.map((x) => (x.id === id ? { ...x, date, start: hhmm(start), end: hhmm(start + dur(x)) } : x)));
    setUndo({ prev, text: `"${e.title}" flyttet til ${DOW_LONG[dow(date)]} kl. ${hhmm(start).replace(":", ".")}` });
    window.setTimeout(() => setUndo((u) => (u?.prev === prev ? null : u)), 5000);
  };
  const onDown = (ev: React.PointerEvent, e: PlanEvent) => {
    if (ev.button !== 0) return;
    const el = ev.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    el.setPointerCapture(ev.pointerId);
    setDrag({ id: e.id, dx: ev.clientX - r.left, dy: ev.clientY - r.top, x0: ev.clientX, y0: ev.clientY, moved: false, date: e.date, start: mins(e.start) });
  };
  const onMove = (ev: React.PointerEvent, e: PlanEvent) => {
    if (!drag || drag.id !== e.id) return;
    const moved = drag.moved || Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 4;
    if (!moved) return;
    const p = place(ev.clientX, ev.clientY, drag, e);
    setDrag({ ...drag, moved, ...p });
  };
  const onUp = (e: PlanEvent) => {
    if (!drag || drag.id !== e.id) return;
    if (drag.moved) commit(e.id, drag.date, drag.start);
    else router.push(e.href);
    setDrag(null);
  };
  const onKey = (ev: React.KeyboardEvent, e: PlanEvent) => {
    const m = mins(e.start), i = days.indexOf(e.date);
    const map: Record<string, [number, number]> = { ArrowUp: [e.date, m - SNAP], ArrowDown: [e.date, m + SNAP], ArrowLeft: [days[Math.max(0, i - 1)], m], ArrowRight: [days[Math.min(6, i + 1)], m] };
    if (ev.key === "Enter") return router.push(e.href);
    const t = map[ev.key];
    if (!t) return;
    ev.preventDefault();
    commit(e.id, t[0], Math.max(H0 * 60, Math.min(H1 * 60 - dur(e), t[1])));
  };

  return (
    <div className="flex flex-col gap-3">
      <Head title="Kalender" />
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><Nav label="Uge 43 · 19.–25. okt" /><div className="flex gap-1 rounded-[10px] bg-[#f7f2ee] p-1">{["Dag", "Uge", "Måned"].map((v) => <span key={v} className={`h-8 rounded-[8px] px-3.5 text-[12px] font-medium leading-8 ${v === "Uge" ? "bg-white text-heading shadow-[0_1px_3px_rgba(32,22,19,.12)]" : "text-muted"}`}>{v}</span>)}</div></div>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b pb-2" style={{ borderColor: LINE }}>
                <span />
                {days.map((d, i) => <div key={d} className="text-center"><p className="text-[11px] text-muted">{DOW[i]}</p><p className={`mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-[15px] font-semibold tabular-nums ${d === TODAY ? "text-white" : "text-heading"}`} style={d === TODAY ? { background: O } : undefined}>{d}</p></div>)}
              </div>
              <div ref={grid} className={`relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))] ${drag?.moved ? "cursor-grabbing select-none" : ""}`} style={{ height: (H1 - H0) * PX }}>
                <div className="relative">{Array.from({ length: H1 - H0 }, (_, i) => <span key={i} className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular-nums text-muted" style={{ top: i * PX }}>{String(H0 + i).padStart(2, "0")}:00</span>)}</div>
                {days.map((d, di) => (
                  <div key={d} className={`relative border-l transition-colors ${drag?.moved && drag.date === d ? "bg-[#fdf0ea]/60" : d === TODAY ? "bg-[#fdf8f5]" : di >= 5 ? "bg-[#fcfaf9]" : ""}`} style={{ borderColor: LINE }}>
                    {Array.from({ length: H1 - H0 }, (_, i) => <i key={i} className="absolute inset-x-0 border-t border-dashed" style={{ top: i * PX, borderColor: "#f3ece8" }} />)}
                    {d === TODAY && nowY > 0 && <div className="pointer-events-none absolute inset-x-0 z-[3] flex items-center" style={{ top: nowY }}><i className="-ml-1 size-2.5 rounded-full" style={{ background: O }} /><span className="h-[2px] flex-1" style={{ background: O }} /></div>}
                  </div>
                ))}
                {/* events sit on top of the columns so they can move between them */}
                {f.list.filter((e) => days.includes(e.date)).map((e) => {
                  const x = TYPE[e.type];
                  const dragging = drag?.id === e.id && drag.moved;
                  const date = dragging ? drag.date : e.date, start = dragging ? drag.start : mins(e.start);
                  const col = days.indexOf(date);
                  const top = ((start - H0 * 60) / 60) * PX, h = Math.max(30, (dur(e) / 60) * PX - 3);
                  return (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${e.title}, ${DOW_LONG[dow(date)]} ${hhmm(start)}. Træk eller brug piletasterne for at flytte.`}
                      onPointerDown={(ev) => onDown(ev, e)}
                      onPointerMove={(ev) => onMove(ev, e)}
                      onPointerUp={() => onUp(e)}
                      onPointerCancel={() => setDrag(null)}
                      onKeyDown={(ev) => onKey(ev, e)}
                      className={`absolute z-[2] touch-none overflow-hidden rounded-[9px] border-l-[3px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#201613] ${dragging ? "z-[5] cursor-grabbing shadow-[0_14px_30px_-8px_rgba(32,22,19,.45)] ring-2 ring-white" : "cursor-grab transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(32,22,19,.3)]"} ${past(e) && !dragging ? "opacity-55" : ""}`}
                      style={{ top, height: h, left: `calc(52px + (100% - 52px) * ${col} / 7 + 4px)`, width: "calc((100% - 52px) / 7 - 8px)", background: x.soft, borderColor: x.c }}
                    >
                      <b className="block truncate text-[11px] font-semibold leading-tight" style={{ color: x.ink }}>{e.title}</b>
                      {(h > 40 || dragging) && <small className="block text-[10px] tabular-nums" style={{ color: x.ink, opacity: 0.75 }}>{hhmm(start)}–{hhmm(start + dur(e))}</small>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted"><span aria-hidden>⠿</span>Træk en aftale til en anden dag eller et andet tidspunkt. Den lægger sig på hele kvarter.</p>
        </div>
        <aside className="flex flex-col gap-3">
          <div className="rounded-[16px] p-5 text-white" style={{ background: STAGE }}>
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-white/55"><i className="size-2 animate-pulse rounded-full" style={{ background: O }} />Nu · kl. {NOW.replace(":", ".")}</p>
            {next ? (
              <>
                <p className="mt-3 text-[11.5px] text-white/55">Næste · {next.start}–{next.end}</p>
                <p className="mt-1 text-[20px] font-semibold leading-tight">{next.title}</p>
                <p className="mt-1 text-[12px] text-white/60">{course(next)}</p>
                <Link href={next.href} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-white text-[13px] font-semibold text-[#201613]">{next.type === "Øvelse" ? "Åbn øvemiljøet" : "Start lektionen"} <ArrowRightIcon size={13} weight="bold" /></Link>
              </>
            ) : <p className="mt-3 text-[15px] font-semibold">Ikke mere i dag</p>}
          </div>
          <div className={`${card} p-5`}>
            <p className="text-[13px] font-semibold text-heading">Ugens læring</p>
            <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-heading">{Math.floor(weekMin / 60)} t {weekMin % 60} m</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f3eeeb]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (weekMin / week.goal) * 100)}%`, background: O }} /></div>
            <p className="mt-2 text-[11.5px] text-muted">Planlagt denne uge · mål {week.goal / 60} timer</p>
          </div>
          <div className={`${card} p-5`}><p className="mb-2 text-[13px] font-semibold text-heading">Vis</p><Filters f={f} /></div>
        </aside>
      </section>
      {undo && (
        <div role="status" className="fixed bottom-20 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#201613] py-2 pl-4 pr-2 text-[13px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
          <CheckIcon size={13} weight="bold" style={{ color: GREEN }} /><span className="max-w-[60vw] truncate">{undo.text}</span>
          <button onClick={() => { setEvs(undo.prev); setUndo(null); }} className="h-8 rounded-full bg-white/10 px-3 text-[12px] font-semibold hover:bg-white/20">Fortryd</button>
        </div>
      )}
    </div>
  );
}

// ——— L · Plan ———
export function L() {
  const f = useFilter();
  const days = Array.from({ length: 7 }, (_, i) => week.weekStart + i);
  const [open, setOpen] = useState<Record<number, boolean>>({ [TODAY]: true, [TODAY + 1]: true });
  const [rem, setRem] = useState<Record<string, boolean>>({ r1: true });
  const doneMin = plan.filter((e) => days.includes(e.date) && past(e)).reduce((a, e) => a + dur(e), 0);
  const active = days.filter((d) => byDay(d).some(past)).length;
  return (
    <div className="flex flex-col gap-3">
      <Head title="Min plan" />
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Nav label="Uge 43" />
            <div className="flex flex-wrap gap-1.5">{(Object.keys(TYPE) as T[]).map((t) => <button key={t} onClick={() => f.setOn({ ...f.on, [t]: !f.on[t] })} aria-pressed={f.on[t]} className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition ${f.on[t] ? "text-white" : "bg-[#f3eeeb] text-muted"}`} style={f.on[t] ? { background: TYPE[t].c } : undefined}>{TYPE[t].label}</button>)}</div>
          </div>
          <ol className="mt-4 grid gap-2.5">
            {days.map((d, i) => {
              const l = byDay(d, f.list);
              const isToday = d === TODAY, isOpen = open[d] ?? false;
              return (
                <li key={d} className={`overflow-hidden rounded-[14px] ${isToday ? "text-white" : "border"}`} style={isToday ? { background: STAGE } : { borderColor: LINE }}>
                  <button onClick={() => setOpen({ ...open, [d]: !isOpen })} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                    <span className={`text-[17px] font-semibold capitalize ${isToday ? "" : d < TODAY ? "text-muted" : "text-heading"}`}>{DOW_LONG[i]} {d}.</span>
                    {isToday && <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ background: O }}>I dag</span>}
                    {l.length > 0 && <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${isToday ? "bg-white/15" : "bg-[#fdf0ea] text-[#c4502f]"}`}>{l.length}</span>}
                    <span className={`ml-auto text-[11.5px] ${isToday ? "text-white/55" : "text-muted"}`}>{l.length ? `${l.reduce((a, e) => a + dur(e), 0)} min` : "Fri"}</span>
                    <CaretDownIcon size={14} className={`transition ${isOpen ? "rotate-180" : ""} ${isToday ? "text-white/70" : "text-muted"}`} />
                  </button>
                  {isOpen && l.length > 0 && (
                    <ul className="grid gap-2 px-3 pb-3">
                      {l.map((e) => {
                        const x = TYPE[e.type], done = past(e);
                        return (
                          <li key={e.id} className={`flex items-center gap-3 rounded-[12px] p-3 ${isToday ? "bg-white/[0.07]" : "bg-[#fbf8f6]"} ${done ? "opacity-60" : ""}`}>
                            <span className="w-[86px] shrink-0 text-[12px] tabular-nums">{e.start} – {e.end}</span>
                            <span className="min-w-0 flex-1"><b className={`block truncate text-[13.5px] font-semibold ${done ? "line-through decoration-1" : ""}`}>{e.title}</b><small className={`flex items-center gap-1.5 text-[11px] ${isToday ? "text-white/55" : "text-muted"}`}><i className="size-1.5 rounded-full" style={{ background: x.c }} />{e.type} · {course(e)}</small></span>
                            {done ? <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={12} weight="bold" /></span>
                              : <Link href={e.href} className={`inline-flex h-8 items-center gap-1 rounded-full px-3.5 text-[11.5px] font-semibold ${isToday ? "bg-white text-[#201613]" : "text-white"}`} style={isToday ? undefined : { background: INK }}>{e.type === "Holdmøde" ? "Deltag" : "Start"}</Link>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <aside className="flex flex-col gap-3 xl:sticky xl:top-3 xl:self-start">
          <div className={`${card} p-5`}>
            <p className="text-[15px] font-semibold text-heading">Ugen</p>
            <div className="mt-3 grid grid-cols-7 gap-1 text-center">
              {days.map((d, i) => {
                const did = byDay(d).some(past);
                return <div key={d}><p className="text-[10.5px] text-muted">{DOW[i]}</p><span className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-[12px] font-semibold tabular-nums ${d === TODAY ? "text-white" : did ? "text-[#2f8a5c]" : "text-heading"}`} style={{ background: d === TODAY ? O : did ? "#e8f6ee" : "#f7f2ee" }}>{d}</span></div>;
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[12px] bg-[#f7f2ee] p-3"><p className="text-[11px] text-muted">Læringstid</p><p className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] text-heading">{Math.floor(doneMin / 60)},{Math.round(((doneMin % 60) / 60) * 10)} t</p><p className="text-[10.5px] text-muted">denne uge</p></div>
              <div className="rounded-[12px] bg-[#f7f2ee] p-3"><p className="text-[11px] text-muted">Aktive dage</p><p className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] text-heading">{active}</p><p className="text-[10.5px] text-muted">af 5 hverdage</p></div>
            </div>
          </div>
          <div className={`${card} p-5`}>
            <div className="flex items-center justify-between"><p className="text-[15px] font-semibold text-heading">Husk</p><button aria-label="Tilføj" className="grid size-7 place-items-center rounded-full bg-[#f3eeeb] text-heading"><PlusIcon size={13} weight="bold" /></button></div>
            <ul className="mt-3 grid gap-2">
              {[["r1", "Aflever \"Omskriv en dårlig prompt\"", "Øvemiljø"], ["r2", "Læs AI-politik Nordlys v1", "Til holdmødet mandag"], ["r3", "Tag lektion 6 før fredag", "AI på arbejdet"]].map(([id, t, s]) => (
                <li key={id}>
                  <button onClick={() => setRem({ ...rem, [id]: !rem[id] })} className="flex w-full items-start gap-2.5 rounded-[10px] p-2 text-left hover:bg-[#fbf8f6]">
                    <span className="mt-px grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px]" style={{ borderColor: rem[id] ? GREEN : "#d9ccc5", background: rem[id] ? GREEN : "transparent" }}>{rem[id] && <CheckIcon size={10} weight="bold" color="#fff" />}</span>
                    <span><b className={`block text-[12.5px] font-medium text-heading ${rem[id] ? "text-muted line-through" : ""}`}>{t}</b><small className="text-[11px] text-muted">{s}</small></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-[14px] p-3.5 text-[13px] font-semibold text-white" style={{ background: O }}><ClockIcon size={16} weight="fill" />Find 10 minutter i min kalender</button>
        </aside>
      </section>
    </div>
  );
}
