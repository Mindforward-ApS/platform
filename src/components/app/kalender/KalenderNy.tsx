"use client";

// Kalender, new version (Marco 2026-11-11: "meget flottere og interaktivt"). Structure of the modern calendar apps:
// a left panel (mini month, lessons waiting to be planned, the week's goal, filters) and a week grid with
// soft colour blocks. Interactions:
//   • drag a waiting lesson from the left panel into the week to plan it
//   • click-drag on an empty slot to create a block (quick form appears)
//   • drag a block to another day/time, drag its bottom edge to change length (15-min snap)
//   • click a block for details (start it, move it, delete it); Fortryd after every change
//   • ← → change week, T jumps to today, Esc closes
// Example data (October 2026, today = the 23rd). Nothing is saved.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpenIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, DotsSixVerticalIcon, FlaskIcon, PlusIcon, TrashIcon, UsersThreeIcon, XIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { plan as seed, week, type PlanEvent } from "@/content/platform";

type T = PlanEvent["type"];
type Ev = PlanEvent & { done?: boolean };
const INK = "#201613", MUTED = "#6b625d", LINE = "#efe7e1", CORAL = "#e8664a";
const TYPE: Record<T, { bar: string; bg: string; ink: string; label: string; icon: typeof BookOpenIcon }> = {
  Lektion: { bar: CORAL, bg: "#fdeee7", ink: "#8f3a22", label: "Lektioner", icon: BookOpenIcon },
  Øvelse: { bar: "#7a5a4e", bg: "#f1ebe7", ink: INK, label: "Øvelser", icon: FlaskIcon },
  Holdmøde: { bar: "#3f9c6e", bg: "#e6f4ec", ink: "#22603f", label: "Holdmøder", icon: UsersThreeIcon },
};
const DOW = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const FIRST_DOW = 3; // 1 Oct 2026 is a Thursday (Mon = 0)
const TODAY = week.today;
// Working hours 08–17 and 120 px per hour, so a half-hour block has room for three lines of title.
const H0 = 8, H1 = 17, PX = 120, SNAP = 15;
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const snap = (m: number) => Math.round(m / SNAP) * SNAP;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const weekStartOf = (d: number) => d - ((d - 1 + FIRST_DOW) % 7);
const NOW = mins(week.now);

// Lessons waiting to be planned (the next ones in the learner's courses).
const waiting = [
  { id: "w1", title: "AI til præsentationer", type: "Lektion" as T, len: 30 },
  { id: "w2", title: "Prompts til tabeller", type: "Lektion" as T, len: 30 },
  { id: "w3", title: "Lav en dagsorden med AI", type: "Øvelse" as T, len: 30 },
  { id: "w4", title: "Tjek kilder i et svar", type: "Øvelse" as T, len: 30 },
];

function MiniMonth({ start, setStart }: { start: number; setStart: (d: number) => void }) {
  const cells = Array.from({ length: 35 }, (_, i) => i - FIRST_DOW + 1);
  return (
    <div>
      <div className="flex items-center justify-between"><p className="text-[0.875rem] font-semibold" style={{ color: INK }}>Oktober 2026</p></div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[0.6875rem]" style={{ color: MUTED }}>
        {["M", "T", "O", "T", "F", "L", "S"].map((d, k) => <span key={k}>{d}</span>)}
        {cells.map((d, k) => {
          const inMonth = d >= 1 && d <= 31;
          const inWeek = d >= start && d < start + 7;
          return (
            <button key={k} type="button" disabled={!inMonth} onClick={() => setStart(weekStartOf(d))}
              className={`mx-auto grid size-7 place-items-center rounded-full text-[0.75rem] transition ${inMonth ? "hover:bg-[#f3ece7]" : "opacity-0"}`}
              style={d === TODAY ? { background: CORAL, color: "#fff", fontWeight: 700 } : inWeek ? { background: "#f3ece7", color: INK, fontWeight: 600 } : { color: INK }}>
              {inMonth ? d : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KalenderNy() {
  const [events, setEvents] = useState<Ev[]>(() => seed.map((e) => ({ ...e, done: e.date < TODAY || (e.date === TODAY && mins(e.end) <= NOW) })));
  const [queue, setQueue] = useState(waiting);
  const [start, setStart] = useState(weekStartOf(TODAY));
  const [show, setShow] = useState<Record<T, boolean>>({ Lektion: true, Øvelse: true, Holdmøde: true });
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ date: number; s: number; e: number; title: string; type: T } | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo: Ev[]; q: typeof waiting } | null>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; dx: number; dy: number; ox: number; oy: number } | null>(null);
  const [overQueue, setOverQueue] = useState<{ date: number; s: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  // Mon–Fri by default (Marco 2026-11-11: the week was too cramped); Weekend shows Sat and Sun too.
  const [weekend, setWeekend] = useState(false);
  const n = weekend ? 7 : 5;
  const days = Array.from({ length: n }, (_, i) => start + i);
  // Column widths: weekdays 1, Saturday and Sunday 0.55, so the working week keeps its room.
  const fr = days.map((_, i) => (i > 4 ? 0.55 : 1));
  const total = fr.reduce((a, b) => a + b, 0);
  const colLeft = (i: number) => (fr.slice(0, i).reduce((a, b) => a + b, 0) / total) * 100;
  const colW = (i: number) => (fr[i] / total) * 100;
  const cols = fr.map((f) => `minmax(0,${f}fr)`).join(" ");

  const commit = (next: Ev[], msg: string, q = queue) => { setToast({ msg, undo: events, q: queue }); setEvents(next); setQueue(q); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  // Keyboard: ← → weeks, T today, Esc closes.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowLeft") setStart((s) => Math.max(weekStartOf(1), s - 7));
      if (e.key === "ArrowRight") setStart((s) => Math.min(weekStartOf(31), s + 7));
      if (e.key.toLowerCase() === "t") setStart(weekStartOf(TODAY));
      if (e.key === "Escape") { setOpen(null); setDraft(null); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  // Position in the grid → day + minutes.
  const at = (x: number, y: number) => {
    const r = grid.current!.getBoundingClientRect();
    const pct = ((x - r.left) / r.width) * 100;
    let col = 0; while (col < n - 1 && pct > colLeft(col + 1)) col++;
    const m = snap(H0 * 60 + ((y - r.top) / PX) * 60);
    return { date: start + col, m: clamp(m, H0 * 60, H1 * 60) };
  };

  // Pointer drag for moving / resizing existing blocks.
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => d && { ...d, dx: e.clientX - d.ox, dy: e.clientY - d.oy });
    const up = (e: PointerEvent) => {
      const d = drag; setDrag(null);
      const ev = events.find((x) => x.id === d.id); if (!ev) return;
      const moved = Math.abs(e.clientX - d.ox) + Math.abs(e.clientY - d.oy) > 4;
      if (!moved) { setOpen(ev.id); return; }
      const len = mins(ev.end) - mins(ev.start);
      if (d.mode === "resize") {
        const end = clamp(snap(mins(ev.end) + ((e.clientY - d.oy) / PX) * 60), mins(ev.start) + SNAP, H1 * 60);
        commit(events.map((x) => (x.id === ev.id ? { ...x, end: hhmm(end) } : x)), `“${ev.title}” varer nu ${end - mins(ev.start)} min`);
      } else {
        const r = grid.current!.getBoundingClientRect();
        const col = clamp(Math.round(((e.clientX - d.ox) / r.width) * n), -n, n);
        const s = clamp(snap(mins(ev.start) + ((e.clientY - d.oy) / PX) * 60), H0 * 60, H1 * 60 - len);
        const date = clamp(ev.date + col, 1, 31);
        commit(events.map((x) => (x.id === ev.id ? { ...x, date, start: hhmm(s), end: hhmm(s + len) } : x)), `“${ev.title}” er flyttet til ${DOW[(date - 1 + FIRST_DOW) % 7].toLowerCase()} ${date}. kl. ${hhmm(s)}`);
      }
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag, events, n]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click-drag on an empty slot to create a block.
  const createDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const a = at(e.clientX, e.clientY);
    setOpen(null);
    setDraft({ date: a.date, s: a.m, e: a.m + 30, title: "", type: "Lektion" });
    const move = (ev: PointerEvent) => { const b = at(ev.clientX, ev.clientY); setDraft((d) => d && { ...d, e: Math.max(d.s + SNAP, b.m) }); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  };
  const saveDraft = () => {
    if (!draft) return;
    const ev: Ev = { id: `n${Date.now()}`, date: draft.date, start: hhmm(draft.s), end: hhmm(draft.e), type: draft.type, title: draft.title.trim() || "Ny aftale", href: "/kurser" };
    commit([...events, ev], `“${ev.title}” er tilføjet`); setDraft(null);
  };

  // Drop a waiting lesson from the left panel into the week.
  const dropQueue = (e: React.DragEvent) => {
    e.preventDefault(); setOverQueue(null);
    const id = e.dataTransfer.getData("text/plain"); const w = queue.find((x) => x.id === id); if (!w) return;
    const a = at(e.clientX, e.clientY);
    const s = clamp(a.m, H0 * 60, H1 * 60 - w.len);
    const ev: Ev = { id: `q${Date.now()}`, date: a.date, start: hhmm(s), end: hhmm(s + w.len), type: w.type, title: w.title, href: "/kurser" };
    commit([...events, ev], `“${w.title}” er planlagt ${DOW[(a.date - 1 + FIRST_DOW) % 7].toLowerCase()} kl. ${hhmm(s)}`, queue.filter((x) => x.id !== id));
  };

  // Touch-friendly: put a waiting lesson in the next free half hour (weekdays 08–16, from now on).
  const planNext = (id: string) => {
    const w = queue.find((x) => x.id === id); if (!w) return;
    for (let d = TODAY; d <= 31; d++) {
      if ((d - 1 + FIRST_DOW) % 7 > 4) continue;
      for (let m = d === TODAY ? Math.ceil(NOW / 30) * 30 : 8 * 60; m + w.len <= 16 * 60; m += 30) {
        const clash = events.some((e) => e.date === d && mins(e.start) < m + w.len && mins(e.end) > m);
        if (!clash) {
          const ev: Ev = { id: `q${Date.now()}`, date: d, start: hhmm(m), end: hhmm(m + w.len), type: w.type, title: w.title, href: "/kurser" };
          setStart(weekStartOf(d));
          commit([...events, ev], `“${w.title}” er planlagt ${DOW[(d - 1 + FIRST_DOW) % 7].toLowerCase()} ${d}. kl. ${hhmm(m)}`, queue.filter((x) => x.id !== id));
          return;
        }
      }
    }
  };
  const shown = events.filter((e) => show[e.type] && e.date >= start && e.date < start + n);
  // Overlapping blocks share their day column side by side (lane / number of lanes in the overlap group).
  const lanes = new Map<string, { lane: number; of: number }>();
  for (const d of days) {
    const list = shown.filter((e) => e.date === d).sort((a, b) => mins(a.start) - mins(b.start));
    let group: Ev[] = [], groupEnd = -1, ends: number[] = [];
    const close = () => { const of = Math.max(1, ends.length); group.forEach((g) => { const l = lanes.get(g.id)!; lanes.set(g.id, { lane: l.lane, of }); }); group = []; ends = []; };
    for (const e of list) {
      if (mins(e.start) >= groupEnd) { close(); groupEnd = -1; }
      let lane = ends.findIndex((end) => end <= mins(e.start));
      if (lane === -1) { lane = ends.length; ends.push(mins(e.end)); } else ends[lane] = mins(e.end);
      lanes.set(e.id, { lane, of: 1 }); group.push(e); groupEnd = Math.max(groupEnd, mins(e.end));
    }
    close();
  }
  const planned = events.filter((e) => e.date >= start && e.date < start + 7 && e.type !== "Holdmøde").reduce((a, e) => a + mins(e.end) - mins(e.start), 0);
  const goal = week.goal;
  const openEv = events.find((e) => e.id === open);
  const hours = Array.from({ length: H1 - H0 }, (_, i) => H0 + i);
  const monthLabel = start + n - 1 > 31 ? "Oktober – november 2026" : "Oktober 2026";

  return (
    <div className="relative grid gap-4 lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* Left panel */}
      <aside className="order-2 grid min-w-0 content-start gap-4 lg:order-none [&>*]:min-w-0">
        <div className="rounded-[18px] bg-white p-4"><MiniMonth start={start} setStart={setStart} /></div>
        <div className="rounded-[18px] bg-white p-4">
          <div className="flex items-center justify-between"><p className="text-[0.875rem] font-semibold" style={{ color: INK }}>Klar til at planlægge</p><span className="text-[0.75rem]" style={{ color: MUTED }}>{queue.length}</span></div>
          <p className="mt-1 text-[0.75rem]" style={{ color: MUTED }}><span className="hidden lg:inline">Træk en lektion ind i ugen.</span><span className="lg:hidden">Tryk Planlæg, så finder vi næste ledige tid.</span></p>
          <ul className="mt-3 grid gap-2">
            {queue.map((w) => { const t = TYPE[w.type]; return (
              <li key={w.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", w.id); e.dataTransfer.effectAllowed = "move"; }}
                className="flex cursor-grab items-center gap-2 rounded-[10px] border px-2.5 py-2 text-[0.8125rem] transition hover:-translate-y-0.5 hover:shadow-sm active:cursor-grabbing" style={{ borderColor: LINE, background: t.bg, color: t.ink }}>
                <DotsSixVerticalIcon size={14} className="shrink-0 opacity-50" />
                <span className="min-w-0 flex-1 truncate font-medium">{w.title}</span>
                <span className="shrink-0 text-[0.6875rem] opacity-70">{w.len} min</span>
                <button type="button" onClick={() => planNext(w.id)} className="shrink-0 rounded-[6px] bg-white/70 px-1.5 py-0.5 text-[0.6875rem] font-semibold lg:hidden" aria-label={`Planlæg ${w.title}`}>Planlæg</button>
              </li>
            ); })}
            {queue.length === 0 && <li className="rounded-[10px] p-3 text-center text-[0.8125rem]" style={{ background: "#f7f2ee", color: MUTED }}>Alt er planlagt. Flot.</li>}
          </ul>
        </div>
        <div className="rounded-[18px] p-4 text-white" style={{ background: "linear-gradient(160deg,#33231f,#1a0f0c)" }}>
          <p className="text-[0.75rem] text-white/60">Planlagt træning denne uge</p>
          <p className="mt-1 text-[1.5rem] font-semibold tabular-nums">{planned} <span className="text-[0.875rem] font-normal text-white/60">/ {goal} min</span></p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.min(100, (planned / goal) * 100)}%`, background: CORAL }} /></div>
        </div>
        <div className="rounded-[18px] bg-white p-4">
          <p className="text-[0.875rem] font-semibold" style={{ color: INK }}>Vis</p>
          <div className="mt-2 grid gap-1.5">
            {(Object.keys(TYPE) as T[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2.5 text-[0.8125rem]" style={{ color: INK }}>
                <input type="checkbox" checked={show[k]} onChange={() => setShow({ ...show, [k]: !show[k] })} className="size-4 rounded" style={{ accentColor: TYPE[k].bar }} />
                <span className="size-2.5 rounded-full" style={{ background: TYPE[k].bar }} />{TYPE[k].label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Week */}
      <section className="order-1 min-w-0 overflow-hidden rounded-[18px] bg-white lg:order-none">
        <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3" style={{ borderColor: LINE }}>
          <h1 className="text-[1.25rem] font-semibold tracking-[-0.01em]" style={{ color: INK }}>{monthLabel}</h1>
          <Demo />
          <div className="ml-auto flex items-center gap-1">
            <button type="button" onClick={() => setWeekend(!weekend)} aria-pressed={weekend} className="mr-1 h-9 rounded-[10px] border px-3 text-[0.8125rem] font-medium" style={weekend ? { borderColor: INK, background: INK, color: "#fff" } : { borderColor: LINE, color: INK }}>Vis weekend</button>
            <button type="button" onClick={() => setStart(weekStartOf(TODAY))} className="h-9 rounded-[10px] border px-3 text-[0.8125rem] font-medium" style={{ borderColor: LINE, color: INK }}>I dag</button>
            <button type="button" aria-label="Forrige uge" onClick={() => setStart((s) => Math.max(weekStartOf(1), s - 7))} className="grid size-9 place-items-center rounded-[10px] hover:bg-[#f7f2ee]" style={{ color: INK }}><CaretLeftIcon size={16} /></button>
            <button type="button" aria-label="Næste uge" onClick={() => setStart((s) => Math.min(weekStartOf(31), s + 7))} className="grid size-9 place-items-center rounded-[10px] hover:bg-[#f7f2ee]" style={{ color: INK }}><CaretRightIcon size={16} /></button>
            <button type="button" onClick={() => { setOpen(null); setDraft({ date: TODAY, s: 15 * 60, e: 15 * 60 + 30, title: "", type: "Lektion" }); }} className="ml-2 flex h-9 items-center gap-1.5 rounded-[10px] px-3 text-[0.8125rem] font-semibold" style={{ background: CORAL, color: INK }}><PlusIcon size={14} weight="bold" />Ny</button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <div className="min-w-[620px] lg:min-w-0">
            {/* Day header */}
            <div className="grid border-b" style={{ borderColor: LINE, gridTemplateColumns: `56px ${cols}` }}>
              <span />
              {days.map((d, i) => {
                const inMonth = d >= 1 && d <= 31; const isToday = d === TODAY;
                return (
                  <div key={d} className="py-2.5 text-center">
                    <p className="text-[0.6875rem] font-medium uppercase tracking-wide" style={{ color: isToday ? CORAL : MUTED }}>{DOW[i]}</p>
                    <p className="mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-[0.9375rem] font-semibold" style={isToday ? { background: CORAL, color: "#fff" } : { color: inMonth ? INK : "#c9bfb9" }}>{inMonth ? d : d - 31}</p>
                  </div>
                );
              })}
            </div>
            {/* Grid */}
            <div className="relative grid grid-cols-[56px_minmax(0,1fr)]">
              <div>{hours.map((h) => <div key={h} className="relative text-right text-[0.6875rem] tabular-nums" style={{ height: PX, color: MUTED }}><span className="absolute -top-2 right-2">{h > H0 ? `${String(h).padStart(2, "0")}:00` : ""}</span></div>)}</div>
              <div ref={grid} className="relative grid" style={{ height: (H1 - H0) * PX, gridTemplateColumns: cols }}
                onPointerDown={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.slot) createDown(e); }}
                onDragOver={(e) => { e.preventDefault(); const a = at(e.clientX, e.clientY); setOverQueue({ date: a.date, s: a.m }); }}
                onDragLeave={() => setOverQueue(null)} onDrop={dropQueue}>
                {days.map((d) => (
                  <div key={d} data-slot="1" className="relative border-l" style={{ borderColor: LINE, background: d === TODAY ? "#fffaf7" : d > 31 || d < 1 ? "#fcfaf9" : undefined, backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${PX - 1}px, ${LINE} ${PX - 1}px ${PX}px)` }} />
                ))}
                {/* now-line */}
                {TODAY >= start && TODAY < start + n && NOW > H0 * 60 && NOW < H1 * 60 && (
                  <div className="pointer-events-none absolute z-20 flex items-center" style={{ top: ((NOW - H0 * 60) / 60) * PX, left: `${colLeft(TODAY - start)}%`, width: `${colW(TODAY - start)}%` }}>
                    <i className="-ml-1 size-2.5 rounded-full" style={{ background: CORAL }} /><span className="h-[2px] flex-1" style={{ background: CORAL }} />
                  </div>
                )}
                {/* drop preview */}
                {overQueue && (
                  <div className="pointer-events-none absolute z-10 rounded-[8px] border-2 border-dashed" style={{ borderColor: CORAL, top: ((overQueue.s - H0 * 60) / 60) * PX, height: PX / 2, left: `calc(${colLeft(overQueue.date - start)}% + 3px)`, width: `calc(${colW(overQueue.date - start)}% - 6px)` }} />
                )}
                {/* events */}
                {shown.map((ev) => {
                  const t = TYPE[ev.type]; const s = mins(ev.start), e = mins(ev.end);
                  const d = drag?.id === ev.id ? drag : null;
                  const top = ((s - H0 * 60) / 60) * PX + (d?.mode === "move" ? d.dy : 0);
                  const h = Math.max(22, ((e - s) / 60) * PX - 3 + (d?.mode === "resize" ? d.dy : 0));
                  const Icon = t.icon;
                  const L = lanes.get(ev.id) ?? { lane: 0, of: 1 };
                  return (
                    <div key={ev.id} role="button" tabIndex={0} aria-label={`${ev.title}, ${ev.start}–${ev.end}`}
                      onKeyDown={(k) => { if (k.key === "Enter") setOpen(ev.id); }}
                      onPointerDown={(p) => { p.stopPropagation(); if (p.button !== 0) return; setDrag({ id: ev.id, mode: "move", dx: 0, dy: 0, ox: p.clientX, oy: p.clientY }); }}
                      className={`group absolute z-10 cursor-grab select-none overflow-hidden rounded-[8px] px-2 py-1.5 transition-shadow ${d ? "z-30 cursor-grabbing shadow-[0_12px_28px_-10px_rgba(32,22,19,0.5)]" : "hover:shadow-md"} ${open === ev.id ? "ring-2 ring-offset-1" : ""}`}
                      style={{ top, height: h, left: `calc(${colLeft(ev.date - start)}% + ${colW(ev.date - start) * (L.lane / L.of)}% + 3px)`, width: `calc(${colW(ev.date - start) / L.of}% - ${L.of > 1 ? 4 : 6}px)`, transform: d?.mode === "move" ? `translateX(${d.dx}px)` : undefined, background: t.bg, color: t.ink, boxShadow: `inset 3px 0 0 ${t.bar}`, opacity: ev.done ? 0.6 : 1, ["--tw-ring-color" as string]: t.bar }}>
                      {/* Short blocks: time in front of the title so two full lines of title fit; taller blocks: time on its own line. */}
                      {h < 80 ? (
                        <p title={`${ev.start} ${ev.title}`} className="line-clamp-3 text-[0.75rem] font-semibold leading-[1.2]"><span className="mr-1 whitespace-nowrap font-normal tabular-nums opacity-70">{ev.done && <CheckIcon size={10} weight="bold" className="mr-0.5 inline align-[-1px]" />}{ev.start}</span>{ev.title}</p>
                      ) : (
                        <>
                          <p className="text-[0.6875rem] tabular-nums opacity-75">{ev.done ? <CheckIcon size={10} weight="bold" className="mr-0.5 inline align-[-1px]" /> : <Icon size={10} className="mr-0.5 inline align-[-1px]" />}{ev.start}–{ev.end}</p>
                          <p title={ev.title} className={`text-[0.75rem] font-semibold leading-[1.2] ${h > 110 ? "line-clamp-5" : "line-clamp-3"}`}>{ev.title}</p>
                        </>
                      )}
                      <span aria-hidden onPointerDown={(p) => { p.stopPropagation(); setDrag({ id: ev.id, mode: "resize", dx: 0, dy: 0, ox: p.clientX, oy: p.clientY }); }} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100" style={{ background: `linear-gradient(transparent, ${t.bar}55)` }} />
                    </div>
                  );
                })}
                {/* new block being drawn */}
                {draft && draft.date >= start && draft.date < start + n && (
                  <div className="pointer-events-none absolute z-30 rounded-[8px] px-2 py-1 text-[0.75rem] font-semibold" style={{ top: ((draft.s - H0 * 60) / 60) * PX, height: ((draft.e - draft.s) / 60) * PX - 3, left: `calc(${colLeft(draft.date - start)}% + 3px)`, width: `calc(${colW(draft.date - start)}% - 6px)`, background: TYPE[draft.type].bg, color: TYPE[draft.type].ink, boxShadow: `inset 3px 0 0 ${TYPE[draft.type].bar}, 0 12px 28px -10px rgba(32,22,19,0.4)` }}>
                    {draft.title || "Ny aftale"}<p className="font-normal opacity-75">{hhmm(draft.s)}–{hhmm(draft.e)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details of a block */}
      {openEv && (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-[16px] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(32,22,19,0.5)] ring-1 ring-black/5 sm:inset-x-auto sm:right-8 sm:bottom-24">
          <div className="flex items-start gap-3">
            <span className="mt-1 size-3 shrink-0 rounded-[4px]" style={{ background: TYPE[openEv.type].bar }} />
            <div className="min-w-0 flex-1"><p className="font-semibold" style={{ color: INK }}>{openEv.title}</p><p className="text-[0.8125rem]" style={{ color: MUTED }}>{DOW[(openEv.date - 1 + FIRST_DOW) % 7]} {openEv.date}. okt. · {openEv.start}–{openEv.end} · {openEv.type}</p></div>
            <button type="button" aria-label="Luk" onClick={() => setOpen(null)} style={{ color: MUTED }}><XIcon size={16} /></button>
          </div>
          <div className="mt-4 flex gap-2">
            {openEv.type !== "Holdmøde" && <Link href={openEv.href} className="flex h-10 flex-1 items-center justify-center rounded-[10px] text-[0.875rem] font-semibold" style={{ background: CORAL, color: INK }}>{openEv.done ? "Gentag" : "Start nu"}</Link>}
            <button type="button" onClick={() => { commit(events.filter((x) => x.id !== openEv.id), `“${openEv.title}” er slettet`); setOpen(null); }} className="flex h-10 items-center gap-1.5 rounded-[10px] px-3 text-[0.875rem] font-medium" style={{ background: "#f7f2ee", color: INK }}><TrashIcon size={14} />Slet</button>
          </div>
          <p className="mt-3 text-[0.75rem]" style={{ color: MUTED }}>Træk blokken for at flytte den. Træk i bunden for at ændre længden.</p>
        </div>
      )}

      {/* Quick form for a new block */}
      {draft && (
        <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-sm rounded-[16px] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(32,22,19,0.5)] ring-1 ring-black/5 sm:inset-x-auto sm:right-8 sm:bottom-24">
          <p className="text-[0.8125rem]" style={{ color: MUTED }}>{DOW[(draft.date - 1 + FIRST_DOW) % 7]} {draft.date}. okt. · {hhmm(draft.s)}–{hhmm(draft.e)}</p>
          <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") saveDraft(); }} placeholder="Hvad vil du lave?" className="mt-2 h-11 w-full rounded-[10px] border px-3 text-[0.9375rem] outline-none focus:border-[#e8664a]" style={{ borderColor: LINE, color: INK }} />
          <div className="mt-3 flex gap-2">
            {(Object.keys(TYPE) as T[]).map((k) => <button key={k} type="button" onClick={() => setDraft({ ...draft, type: k })} className="flex-1 rounded-[10px] py-2 text-[0.8125rem] font-medium" style={draft.type === k ? { background: TYPE[k].bg, color: TYPE[k].ink, boxShadow: `inset 0 0 0 2px ${TYPE[k].bar}` } : { background: "#f7f2ee", color: MUTED }}>{k}</button>)}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={saveDraft} className="h-10 flex-1 rounded-[10px] text-[0.875rem] font-semibold" style={{ background: CORAL, color: INK }}>Gem</button>
            <button type="button" onClick={() => setDraft(null)} className="h-10 rounded-[10px] px-4 text-[0.875rem] font-medium" style={{ background: "#f7f2ee", color: INK }}>Annullér</button>
          </div>
        </div>
      )}

      {/* Undo */}
      {toast && (
        <div role="status" className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full py-2.5 pl-5 pr-2 text-[0.8125rem] text-white shadow-xl" style={{ background: INK }}>
          <span className="max-w-[60vw] truncate">{toast.msg}</span>
          <button type="button" onClick={() => { setEvents(toast.undo); setQueue(toast.q); setToast(null); }} className="rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Fortryd</button>
        </div>
      )}
      <p className="pointer-events-none hidden text-[0.75rem] lg:col-start-2 lg:block" style={{ color: MUTED }}>Tip: træk på en tom plads for at oprette · ← → skifter uge · T går til i dag</p>
    </div>
  );
}
