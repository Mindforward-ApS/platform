"use client";
// Kalender, version K "Uge" (Marco 2026-11-03: "man skal kunne rykke rundt på tingene selv"), ported 1:1 to /kalender:
// week timeline 08–17 with event cards, a now-line and a "now" card; events can be dragged to another day or time.
// Greb has no calendar yet, so this is the approved example week (October 2026, today = the 23rd), marked
// "Eksempeldata". Moving events only changes this page until it is reloaded.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRightIcon, BookOpenIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, FlaskIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/platform/ui";
import { courseTitle, plan, week, type PlanEvent } from "@/components/platform/demo-data";

const O = "var(--pf-e2643f)", GREEN = "var(--pf-5cbf8f)", INK = "var(--pf-201613)", LINE = "var(--pf-f1e9e4)";
const card = "relative min-w-0 rounded-[16px] bg-pf-white";
const STAGE = "linear-gradient(160deg, var(--pf-33231f) 0%, var(--pf-201613) 55%, var(--pf-1a0f0c) 100%)";
const TODAY = week.today, NOW = week.now;
const DOW = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const DOW_LONG = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];
const FIRST_DOW = 3; // 1 Oct 2026 is a Thursday (Mon = 0)
const dow = (d: number) => (d - 1 + FIRST_DOW) % 7;

type T = PlanEvent["type"];
const TYPE: Record<T, { c: string; soft: string; ink: string; icon: typeof BookOpenIcon; label: string }> = {
  Lektion: { c: O, soft: "var(--pf-fdf0ea)", ink: "var(--pf-a8432a)", icon: BookOpenIcon, label: "Lektioner" },
  Øvelse: { c: INK, soft: "var(--pf-efe8e4)", ink: INK, icon: FlaskIcon, label: "Øvelser" },
  Holdmøde: { c: GREEN, soft: "var(--pf-e8f6ee)", ink: "var(--pf-2f8a5c)", icon: UsersThreeIcon, label: "Holdmøder" },
};
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const past = (e: PlanEvent) => e.date < TODAY || (e.date === TODAY && mins(e.end) <= mins(NOW));
const course = (e: PlanEvent) => (e.course ? courseTitle[e.course] : e.type === "Holdmøde" ? "Salg & service" : undefined);
const dur = (e: PlanEvent) => mins(e.end) - mins(e.start);

type Filter = { on: Record<T, boolean>; setOn: (on: Record<T, boolean>) => void; list: PlanEvent[] };

function Head({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
      <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">{title}</h1><p className="mt-1.5 text-[12.5px] text-pf-muted">10 minutter ad gangen er nok. Sæt tiden af, så bliver det en vane.</p></div>
      <div className="flex items-center gap-2">{children}<Demo /><button className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-pf-white" style={{ background: INK }}><PlusIcon size={14} weight="bold" />Planlæg tid</button></div>
    </header>
  );
}

function Nav({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <p className="text-[19px] font-semibold tracking-[-0.015em] text-heading">{label}</p>
      <button aria-label="Forrige" className="grid size-8 place-items-center rounded-[9px] border border-[var(--pf-ece4df)] text-heading hover:bg-[var(--pf-f7f2ee)]"><CaretLeftIcon size={13} /></button>
      <button className="h-8 rounded-[9px] border border-[var(--pf-ece4df)] px-3 text-[12px] font-medium text-heading hover:bg-[var(--pf-f7f2ee)]">I dag</button>
      <button aria-label="Næste" className="grid size-8 place-items-center rounded-[9px] border border-[var(--pf-ece4df)] text-heading hover:bg-[var(--pf-f7f2ee)]"><CaretRightIcon size={13} /></button>
    </div>
  );
}

function Filters({ f, dark }: { f: Filter; dark?: boolean }) {
  return (
    <ul className="grid gap-1">
      {(Object.keys(TYPE) as T[]).map((t) => {
        const n = plan.filter((e) => e.type === t).length;
        return (
          <li key={t}>
            <button onClick={() => f.setOn({ ...f.on, [t]: !f.on[t] })} aria-pressed={f.on[t]} className={`flex w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-[12.5px] ${dark ? "text-pf-white hover:bg-pf-white/[0.06]" : "text-heading hover:bg-[var(--pf-f7f2ee)]"}`}>
              <span className="grid size-4 place-items-center rounded-[4px] border-[1.5px]" style={{ borderColor: TYPE[t].c, background: f.on[t] ? TYPE[t].c : "transparent" }}>{f.on[t] && <CheckIcon size={10} weight="bold" color="var(--pf-fff)" />}</span>
              <span className="flex-1 text-left">{TYPE[t].label}</span>
              <span className={`text-[11px] tabular-nums ${dark ? "text-pf-white/50" : "text-pf-muted"}`}>{n}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ——— K · Uge ——— (chosen by Marco 2026-11-03; "man skal kunne rykke rundt på tingene selv")
// Drag an event to another day or time: pointer events (mouse and touch), 15-minute snapping, a ghost while dragging,
// and a toast with Fortryd. A click without moving opens the event. Arrow keys move a focused event too.
const H0 = 8, H1 = 17, PX = 64; // 08–17, px per hour
const SNAP = 15;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
type Drag = { id: string; dx: number; dy: number; x0: number; y0: number; moved: boolean; date: number; start: number };

export function Kalender() {
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
          <div className="flex flex-wrap items-center justify-between gap-3"><Nav label="Uge 43 · 19.–25. okt" /><div className="flex gap-1 rounded-[10px] bg-[var(--pf-f7f2ee)] p-1">{["Dag", "Uge", "Måned"].map((v) => <span key={v} className={`h-8 rounded-[8px] px-3.5 text-[12px] font-medium leading-8 ${v === "Uge" ? "bg-pf-white text-heading shadow-[0_1px_3px_rgba(32,22,19,.12)]" : "text-pf-muted"}`}>{v}</span>)}</div></div>
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[52px_repeat(7,minmax(0,1fr))] border-b pb-2" style={{ borderColor: LINE }}>
                <span />
                {days.map((d, i) => <div key={d} className="text-center"><p className="text-[11px] text-pf-muted">{DOW[i]}</p><p className={`mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-[15px] font-semibold tabular-nums ${d === TODAY ? "text-pf-white" : "text-heading"}`} style={d === TODAY ? { background: O } : undefined}>{d}</p></div>)}
              </div>
              <div ref={grid} className={`relative grid grid-cols-[52px_repeat(7,minmax(0,1fr))] ${drag?.moved ? "cursor-grabbing select-none" : ""}`} style={{ height: (H1 - H0) * PX }}>
                <div className="relative">{Array.from({ length: H1 - H0 }, (_, i) => <span key={i} className="absolute right-2 -translate-y-1/2 text-[10.5px] tabular-nums text-pf-muted" style={{ top: i * PX }}>{String(H0 + i).padStart(2, "0")}:00</span>)}</div>
                {days.map((d, di) => (
                  <div key={d} className={`relative border-l transition-colors ${drag?.moved && drag.date === d ? "bg-[var(--pf-fdf0ea)]/60" : d === TODAY ? "bg-[var(--pf-fdf8f5)]" : di >= 5 ? "bg-[var(--pf-fcfaf9)]" : ""}`} style={{ borderColor: LINE }}>
                    {Array.from({ length: H1 - H0 }, (_, i) => <i key={i} className="absolute inset-x-0 border-t border-dashed" style={{ top: i * PX, borderColor: "var(--pf-f3ece8)" }} />)}
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
                      className={`absolute z-[2] touch-none overflow-hidden rounded-[9px] border-l-[3px] px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[var(--pf-201613)] ${dragging ? "z-[5] cursor-grabbing shadow-[0_14px_30px_-8px_rgba(32,22,19,.45)] ring-2 ring-pf-white" : "cursor-grab transition-[box-shadow,transform] hover:-translate-y-px hover:shadow-[0_6px_16px_-6px_rgba(32,22,19,.3)]"} ${past(e) && !dragging ? "opacity-55" : ""}`}
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
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-pf-muted"><span aria-hidden>⠿</span>Træk en aftale til en anden dag eller et andet tidspunkt. Den lægger sig på hele kvarter.</p>
        </div>
        <aside className="flex flex-col gap-3">
          <div className="rounded-[16px] p-5 text-pf-white" style={{ background: STAGE }}>
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-pf-white/55"><i className="size-2 animate-pulse rounded-full" style={{ background: O }} />Nu · kl. {NOW.replace(":", ".")}</p>
            {next ? (
              <>
                <p className="mt-3 text-[11.5px] text-pf-white/55">Næste · {next.start}–{next.end}</p>
                <p className="mt-1 text-[20px] font-semibold leading-tight">{next.title}</p>
                <p className="mt-1 text-[12px] text-pf-white/60">{course(next)}</p>
                <Link href={next.href} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-pf-white text-[13px] font-semibold text-[var(--pf-201613)]">{next.type === "Øvelse" ? "Åbn øvemiljøet" : "Start lektionen"} <ArrowRightIcon size={13} weight="bold" /></Link>
              </>
            ) : <p className="mt-3 text-[15px] font-semibold">Ikke mere i dag</p>}
          </div>
          <div className={`${card} p-5`}>
            <p className="text-[13px] font-semibold text-heading">Ugens læring</p>
            <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-heading">{Math.floor(weekMin / 60)} t {weekMin % 60} m</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--pf-f3eeeb)]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (weekMin / week.goal) * 100)}%`, background: O }} /></div>
            <p className="mt-2 text-[11.5px] text-pf-muted">Planlagt denne uge · mål {week.goal / 60} timer</p>
          </div>
          <div className={`${card} p-5`}><p className="mb-2 text-[13px] font-semibold text-heading">Vis</p><Filters f={f} /></div>
        </aside>
      </section>
      {undo && (
        <div role="status" className="fixed bottom-20 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full bg-[var(--pf-201613)] py-2 pl-4 pr-2 text-[13px] text-pf-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
          <CheckIcon size={13} weight="bold" style={{ color: GREEN }} /><span className="max-w-[60vw] truncate">{undo.text}</span>
          <button onClick={() => { setEvs(undo.prev); setUndo(null); }} className="h-8 rounded-full bg-pf-white/10 px-3 text-[12px] font-semibold hover:bg-pf-white/20">Fortryd</button>
        </div>
      )}
    </div>
  );
}
