"use client";

// Kalender laid out like an ordinary calendar app (Google Calendar), Marco 2026-11-11: "en helt normal kalender".
// Left: + Opret, mini month, Mine kalendere. Top: I dag, ‹ ›, title, Dag / Uge / Måned. Main: all 7 days and the whole
// day (scrolled to 07:00), or a month grid. Drag to move, drag the bottom edge to resize, drag on an empty slot to
// create, click for details, Fortryd. Greb has no calendar backend yet: example data (October 2026, today = the 23rd),
// marked "Eksempeldata"; nothing is saved. Ported from mindforward-platform /kalender-ny (approved 2026-11-11).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/platform/ui";
import { plan as seed, week, type PlanEvent } from "@/components/platform/demo-data";

type T = PlanEvent["type"];
type Ev = PlanEvent;
type View = "dag" | "uge" | "maaned";
const INK = "var(--pf-201613)", MUTED = "var(--pf-6b625d)", LINE = "var(--pf-ece5e0)", CORAL = "var(--pf-e8664a)";
const CAL: Record<T, { c: string; label: string }> = {
  Lektion: { c: CORAL, label: "Lektioner" },
  Øvelse: { c: "var(--pf-8a6a5e)", label: "Øvelser" },
  Holdmøde: { c: "var(--pf-3f9c6e)", label: "Holdmøder" },
};
const DOW = ["man.", "tir.", "ons.", "tor.", "fre.", "lør.", "søn."];
const FIRST_DOW = 3; // 1 Oct 2026 is a Thursday (Mon = 0)
const TODAY = week.today;
const PX = 80, SNAP = 15; // 80 px per hour: a half-hour block fits two full lines
const mins = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const snap = (m: number) => Math.round(m / SNAP) * SNAP;
const dowOf = (d: number) => (d - 1 + FIRST_DOW) % 7;
const weekStartOf = (d: number) => d - dowOf(d);
const NOW = mins(week.now);
const dayLabel = (d: number) => (d < 1 ? `${30 + d}` : d > 31 ? `${d - 31}` : `${d}`);

export function Normal() {
  const [events, setEvents] = useState<Ev[]>(seed);
  const [view, setView] = useState<View>("uge");
  const [cur, setCur] = useState(TODAY); // the day the view is built around
  const [show, setShow] = useState<Record<T, boolean>>({ Lektion: true, Øvelse: true, Holdmøde: true });
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ date: number; s: number; e: number; title: string; type: T } | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo: Ev[] } | null>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; dx: number; dy: number; ox: number; oy: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const days = view === "dag" ? [cur] : Array.from({ length: 7 }, (_, i) => weekStartOf(cur) + i);
  const n = days.length;
  const shown = events.filter((e) => show[e.type]);
  const commit = (next: Ev[], msg: string) => { setToast({ msg, undo: events }); setEvents(next); };
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 7 * PX; }, [view]);

  const step = (dir: number) => setCur((c) => clamp(c + dir * (view === "dag" ? 1 : view === "uge" ? 7 : 31), 1, 31));
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
      if (e.key.toLowerCase() === "t") setCur(TODAY);
      if (e.key.toLowerCase() === "d") setView("dag");
      if (e.key.toLowerCase() === "w") setView("uge");
      if (e.key.toLowerCase() === "m") setView("maaned");
      if (e.key === "Escape") { setOpen(null); setDraft(null); }
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }); // re-bound each render so `step` sees the current view

  const at = (x: number, y: number) => {
    const r = grid.current!.getBoundingClientRect();
    const col = clamp(Math.floor(((x - r.left) / r.width) * n), 0, n - 1);
    return { date: days[col], m: clamp(snap(((y - r.top) / PX) * 60), 0, 24 * 60) };
  };

  // Move / resize with the pointer.
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((d) => d && { ...d, dx: e.clientX - d.ox, dy: e.clientY - d.oy });
    const up = (e: PointerEvent) => {
      const d = drag; setDrag(null);
      const ev = events.find((x) => x.id === d.id); if (!ev) return;
      if (Math.abs(e.clientX - d.ox) + Math.abs(e.clientY - d.oy) < 4) { setOpen(ev.id); return; }
      const len = mins(ev.end) - mins(ev.start);
      if (d.mode === "resize") {
        const end = clamp(snap(mins(ev.end) + ((e.clientY - d.oy) / PX) * 60), mins(ev.start) + SNAP, 24 * 60);
        commit(events.map((x) => (x.id === ev.id ? { ...x, end: hhmm(end) } : x)), `${ev.title} slutter nu kl. ${hhmm(end)}`);
      } else {
        const r = grid.current!.getBoundingClientRect();
        const col = Math.round(((e.clientX - d.ox) / r.width) * n);
        const s = clamp(snap(mins(ev.start) + ((e.clientY - d.oy) / PX) * 60), 0, 24 * 60 - len);
        const date = clamp(ev.date + col, 1, 31);
        commit(events.map((x) => (x.id === ev.id ? { ...x, date, start: hhmm(s), end: hhmm(s + len) } : x)), `${ev.title} er flyttet til ${DOW[dowOf(date)]} ${date}. okt. kl. ${hhmm(s)}`);
      }
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [drag, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const createDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const a = at(e.clientX, e.clientY); setOpen(null);
    setDraft({ date: a.date, s: a.m, e: a.m + 30, title: "", type: "Lektion" });
    const move = (ev: PointerEvent) => { const b = at(ev.clientX, ev.clientY); setDraft((d) => d && { ...d, e: Math.max(d.s + SNAP, b.m) }); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  };
  const saveDraft = () => {
    if (!draft) return;
    const ev: Ev = { id: `n${Date.now()}`, date: draft.date, start: hhmm(draft.s), end: hhmm(draft.e), type: draft.type, title: draft.title.trim() || "(Ingen titel)", href: "/kurser" };
    commit([...events, ev], `${ev.title} er oprettet`); setDraft(null);
  };

  // Overlapping events share the column.
  const lanes = new Map<string, { lane: number; of: number }>();
  for (const d of days) {
    const list = shown.filter((e) => e.date === d).sort((a, b) => mins(a.start) - mins(b.start));
    let group: Ev[] = [], ends: number[] = [], groupEnd = -1;
    const close = () => { group.forEach((g) => lanes.set(g.id, { lane: lanes.get(g.id)!.lane, of: Math.max(1, ends.length) })); group = []; ends = []; };
    for (const e of list) {
      if (mins(e.start) >= groupEnd) { close(); groupEnd = -1; }
      let lane = ends.findIndex((x) => x <= mins(e.start));
      if (lane === -1) { lane = ends.length; ends.push(mins(e.end)); } else ends[lane] = mins(e.end);
      lanes.set(e.id, { lane, of: 1 }); group.push(e); groupEnd = Math.max(groupEnd, mins(e.end));
    }
    close();
  }

  const title = view === "maaned" ? "Oktober 2026" : view === "dag" ? `${["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"][dowOf(cur)]} ${cur}. oktober 2026` : days[6] > 31 ? "Okt. – nov. 2026" : "Oktober 2026";
  const openEv = events.find((e) => e.id === open);

  return (
    <div className="flex min-h-[calc(100svh-7rem)] gap-4">
      {/* Left column, as in an ordinary calendar app */}
      <aside className="hidden w-[232px] shrink-0 flex-col gap-5 lg:flex">
        <button type="button" onClick={() => { setOpen(null); setDraft({ date: cur, s: 9 * 60, e: 9 * 60 + 30, title: "", type: "Lektion" }); }} className="flex h-12 w-fit items-center gap-2 rounded-[14px] bg-pf-white pl-4 pr-5 text-[0.9375rem] font-medium shadow-[0_1px_3px_rgba(32,22,19,0.15)] transition hover:shadow-md" style={{ color: INK }}>
          <PlusIcon size={20} weight="bold" style={{ color: CORAL }} />Opret
        </button>
        <div>
          <p className="px-1 text-[0.875rem] font-medium" style={{ color: INK }}>Oktober 2026</p>
          <div className="mt-2 grid grid-cols-7 text-center text-[0.6875rem]" style={{ color: MUTED }}>
            {["M", "T", "O", "T", "F", "L", "S"].map((d, k) => <span key={k} className="py-1">{d}</span>)}
            {Array.from({ length: 35 }, (_, i) => i - FIRST_DOW + 1).map((d, k) => {
              const inMonth = d >= 1 && d <= 31;
              return (
                <button key={k} type="button" onClick={() => setCur(clamp(d, 1, 31))} className="mx-auto grid size-7 place-items-center rounded-full text-[0.75rem] hover:bg-[var(--pf-f3eeeb)]"
                  style={d === TODAY ? { background: CORAL, color: "var(--pf-fff)", fontWeight: 600 } : d === cur ? { background: "var(--pf-f3d9cf)", color: INK } : { color: inMonth ? INK : "var(--pf-c4bab4)" }}>{dayLabel(d)}</button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="px-1 text-[0.875rem] font-medium" style={{ color: INK }}>Mine kalendere</p>
          <div className="mt-2 grid gap-1">
            {(Object.keys(CAL) as T[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-3 rounded-[8px] px-1 py-1 text-[0.875rem] hover:bg-[var(--pf-f5f0ed)]" style={{ color: INK }}>
                <input type="checkbox" checked={show[k]} onChange={() => setShow({ ...show, [k]: !show[k] })} className="size-4" style={{ accentColor: CAL[k].c }} />{CAL[k].label}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Calendar */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-pf-white">
        <header className="flex flex-wrap items-center gap-2 px-4 py-3">
          <button type="button" onClick={() => setCur(TODAY)} className="h-9 rounded-full border px-4 text-[0.875rem] font-medium hover:bg-[var(--pf-f5f0ed)]" style={{ borderColor: LINE, color: INK }}>I dag</button>
          <button type="button" aria-label="Forrige" onClick={() => step(-1)} className="grid size-9 place-items-center rounded-full hover:bg-[var(--pf-f3eeeb)]" style={{ color: INK }}><CaretLeftIcon size={18} /></button>
          <button type="button" aria-label="Næste" onClick={() => step(1)} className="grid size-9 place-items-center rounded-full hover:bg-[var(--pf-f3eeeb)]" style={{ color: INK }}><CaretRightIcon size={18} /></button>
          <h1 className="ml-2 text-[1.375rem] font-normal" style={{ color: INK }}>{title}</h1>
          <Demo />
          <div className="ml-auto flex rounded-full border p-0.5" style={{ borderColor: LINE }}>
            {([["dag", "Dag"], ["uge", "Uge"], ["maaned", "Måned"]] as [View, string][]).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setView(v)} className="h-8 rounded-full px-4 text-[0.875rem] font-medium" style={view === v ? { background: "var(--pf-f3d9cf)", color: INK } : { color: MUTED }}>{l}</button>
            ))}
          </div>
        </header>

        {view === "maaned" ? (
          <div className="grid flex-1 grid-cols-7 border-t" style={{ borderColor: LINE }}>
            {DOW.map((d) => <div key={d} className="border-l py-2 text-center text-[0.6875rem] font-medium uppercase" style={{ borderColor: LINE, color: MUTED }}>{d}</div>)}
            {Array.from({ length: 35 }, (_, i) => i - FIRST_DOW + 1).map((d, k) => {
              const list = shown.filter((e) => e.date === d).sort((a, b) => a.start.localeCompare(b.start));
              return (
                <div key={k} className="min-h-[7rem] border-l border-t p-1" style={{ borderColor: LINE }}>
                  <button type="button" onClick={() => { setCur(clamp(d, 1, 31)); setView("dag"); }} className="mx-auto mb-1 grid size-7 place-items-center rounded-full text-[0.75rem] font-medium hover:bg-[var(--pf-f3eeeb)]" style={d === TODAY ? { background: CORAL, color: "var(--pf-fff)" } : { color: d >= 1 && d <= 31 ? INK : "var(--pf-c4bab4)" }}>{dayLabel(d)}</button>
                  {list.slice(0, 3).map((e) => (
                    <button key={e.id} type="button" title={`${e.start} ${e.title}`} onClick={() => setOpen(e.id)} className="flex w-full items-start gap-1.5 rounded-[4px] px-1 py-0.5 text-left text-[0.75rem] leading-[1.25] hover:bg-[var(--pf-f5f0ed)]" style={{ color: INK }}>
                      {/* Month view: the title gets the room (two lines); the time is in the tooltip and the details. */}
                      <span className="mt-[5px] size-2 shrink-0 rounded-full" style={{ background: CAL[e.type].c }} /><span className="line-clamp-2">{e.title}</span>
                    </button>
                  ))}
                  {list.length > 3 && <button type="button" onClick={() => { setCur(d); setView("dag"); }} className="px-1 text-[0.75rem] font-medium" style={{ color: MUTED }}>{list.length - 3} mere</button>}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Day header */}
            <div className="grid border-b pr-[10px]" style={{ borderColor: LINE, gridTemplateColumns: `64px repeat(${n}, minmax(0,1fr))` }}>
              <span />
              {days.map((d) => (
                <div key={d} className="flex flex-col items-center py-2">
                  <span className="text-[0.6875rem] font-medium uppercase" style={{ color: d === TODAY ? CORAL : MUTED }}>{DOW[dowOf(d)]}</span>
                  <button type="button" onClick={() => { setCur(clamp(d, 1, 31)); setView("dag"); }} className="mt-0.5 grid size-11 place-items-center rounded-full text-[1.375rem] hover:bg-[var(--pf-f3eeeb)]" style={d === TODAY ? { background: CORAL, color: "var(--pf-fff)" } : { color: d >= 1 && d <= 31 ? INK : "var(--pf-c4bab4)" }}>{dayLabel(d)}</button>
                </div>
              ))}
            </div>
            {/* Hours */}
            <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto" style={{ maxHeight: "calc(100svh - 15rem)" }}>
              <div className="grid" style={{ gridTemplateColumns: "64px minmax(0,1fr)" }}>
                <div>{Array.from({ length: 24 }, (_, h) => <div key={h} className="relative pr-2 text-right text-[0.6875rem] tabular-nums" style={{ height: PX, color: MUTED }}>{h > 0 && <span className="relative -top-2">{String(h).padStart(2, "0")}:00</span>}</div>)}</div>
                <div ref={grid} className="relative grid" style={{ height: 24 * PX, gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}
                  onPointerDown={(e) => { if ((e.target as HTMLElement).dataset.slot) createDown(e); }}>
                  {days.map((d) => <div key={d} data-slot="1" className="border-l" style={{ borderColor: LINE, backgroundImage: `repeating-linear-gradient(to bottom, ${LINE} 0 1px, transparent 1px ${PX}px)` }} />)}
                  {days.includes(TODAY) && (
                    <div className="pointer-events-none absolute z-20 flex items-center" style={{ top: (NOW / 60) * PX, left: `${(days.indexOf(TODAY) / n) * 100}%`, width: `${100 / n}%` }}>
                      <i className="-ml-1.5 size-3 rounded-full" style={{ background: CORAL }} /><span className="h-[2px] flex-1" style={{ background: CORAL }} />
                    </div>
                  )}
                  {shown.filter((e) => days.includes(e.date)).map((ev) => {
                    const s = mins(ev.start), e = mins(ev.end), col = days.indexOf(ev.date);
                    const L = lanes.get(ev.id) ?? { lane: 0, of: 1 };
                    const d = drag?.id === ev.id ? drag : null;
                    const top = (s / 60) * PX + (d?.mode === "move" ? d.dy : 0);
                    const h = Math.max(20, ((e - s) / 60) * PX - 2 + (d?.mode === "resize" ? d.dy : 0));
                    const past = ev.date < TODAY || (ev.date === TODAY && e <= NOW);
                    return (
                      <div key={ev.id} role="button" tabIndex={0} title={`${ev.title}, ${ev.start}–${ev.end}`} aria-label={`${ev.title}, ${ev.start}–${ev.end}`} onKeyDown={(k) => { if (k.key === "Enter") setOpen(ev.id); }}
                        onPointerDown={(p) => { p.stopPropagation(); if (p.button === 0) setDrag({ id: ev.id, mode: "move", dx: 0, dy: 0, ox: p.clientX, oy: p.clientY }); }}
                        className={`group absolute z-10 cursor-pointer select-none overflow-hidden rounded-[6px] px-1.5 py-0.5 text-pf-white ${d ? "z-30 shadow-lg" : ""}`}
                        style={{ top, height: h, left: `calc(${((col + L.lane / L.of) / n) * 100}% + 1px)`, width: `calc(${100 / n / L.of}% - 4px)`, transform: d?.mode === "move" ? `translateX(${d.dx}px)` : undefined, background: CAL[ev.type].c, opacity: past ? 0.55 : 1, boxShadow: "0 0 0 1px var(--pf-fff)" }}>
                        {/* Short block: title and time run on as text (two lines at most); taller block: time on its own line. */}
                        <p className={`text-[0.75rem] font-medium leading-[1.2] ${h < 60 ? "line-clamp-2" : "line-clamp-3"}`}>{ev.title}{h < 60 && <span className="font-normal opacity-90">, {ev.start}</span>}</p>
                        {h >= 60 && <p className="text-[0.6875rem] tabular-nums opacity-90">{ev.start}–{ev.end}</p>}
                        <span aria-hidden onPointerDown={(p) => { p.stopPropagation(); setDrag({ id: ev.id, mode: "resize", dx: 0, dy: 0, ox: p.clientX, oy: p.clientY }); }} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" />
                      </div>
                    );
                  })}
                  {draft && days.includes(draft.date) && (
                    <div className="pointer-events-none absolute z-30 rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-medium text-pf-white shadow-lg" style={{ top: (draft.s / 60) * PX, height: ((draft.e - draft.s) / 60) * PX - 2, left: `calc(${(days.indexOf(draft.date) / n) * 100}% + 1px)`, width: `calc(${100 / n}% - 4px)`, background: CAL[draft.type].c }}>
                      {draft.title || "(Ingen titel)"}<p className="font-normal opacity-90">{hhmm(draft.s)}–{hhmm(draft.e)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Event details */}
      {openEv && (
        <div className="fixed left-1/2 top-1/3 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[16px] bg-pf-white p-5 shadow-[0_24px_60px_-20px_rgba(32,22,19,0.5)] ring-1 ring-[var(--pf-ebe4e0)]">
          <div className="flex justify-end gap-1" style={{ color: MUTED }}>
            <button type="button" aria-label="Slet" onClick={() => { commit(events.filter((x) => x.id !== openEv.id), `${openEv.title} er slettet`); setOpen(null); }} className="grid size-8 place-items-center rounded-full hover:bg-[var(--pf-f3eeeb)]"><TrashIcon size={16} /></button>
            <button type="button" aria-label="Luk" onClick={() => setOpen(null)} className="grid size-8 place-items-center rounded-full hover:bg-[var(--pf-f3eeeb)]"><XIcon size={16} /></button>
          </div>
          <div className="flex gap-3">
            <span className="mt-1.5 size-3.5 shrink-0 rounded-[4px]" style={{ background: CAL[openEv.type].c }} />
            <div><p className="text-[1.25rem] leading-snug" style={{ color: INK }}>{openEv.title}</p><p className="mt-1 text-[0.875rem]" style={{ color: MUTED }}>{["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"][dowOf(openEv.date)]} {openEv.date}. oktober · {openEv.start}–{openEv.end}</p><p className="text-[0.875rem]" style={{ color: MUTED }}>{CAL[openEv.type].label}</p></div>
          </div>
          {openEv.type !== "Holdmøde" && <Link href={openEv.href} className="mt-5 flex h-10 items-center justify-center rounded-full text-[0.875rem] font-semibold" style={{ background: CORAL, color: INK }}>Åbn</Link>}
        </div>
      )}

      {/* Quick create */}
      {draft && (
        <div className="fixed left-1/2 top-1/3 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[16px] bg-pf-white p-5 shadow-[0_24px_60px_-20px_rgba(32,22,19,0.5)] ring-1 ring-[var(--pf-ebe4e0)]">
          <input autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") saveDraft(); }} placeholder="Tilføj titel" className="w-full border-b pb-2 text-[1.25rem] outline-none focus:border-[var(--pf-e8664a)]" style={{ borderColor: LINE, color: INK }} />
          <p className="mt-3 text-[0.875rem]" style={{ color: MUTED }}>{["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"][dowOf(draft.date)]} {draft.date}. oktober · {hhmm(draft.s)}–{hhmm(draft.e)}</p>
          <div className="mt-3 flex gap-2">
            {(Object.keys(CAL) as T[]).map((k) => <button key={k} type="button" onClick={() => setDraft({ ...draft, type: k })} className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.8125rem]" style={{ borderColor: draft.type === k ? CAL[k].c : LINE, color: INK }}><span className="size-2 rounded-full" style={{ background: CAL[k].c }} />{k}</button>)}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setDraft(null)} className="h-9 rounded-full px-4 text-[0.875rem] font-medium hover:bg-[var(--pf-f3eeeb)]" style={{ color: INK }}>Annullér</button>
            <button type="button" onClick={saveDraft} className="h-9 rounded-full px-5 text-[0.875rem] font-semibold" style={{ background: CORAL, color: INK }}>Gem</button>
          </div>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 left-6 z-50 flex items-center gap-4 rounded-[8px] py-3 pl-4 pr-2 text-[0.875rem] text-pf-white shadow-xl" style={{ background: INK }}>
          <span className="max-w-[60vw] truncate">{toast.msg}</span>
          <button type="button" onClick={() => { setEvents(toast.undo); setToast(null); }} className="rounded-[6px] px-3 py-1 font-semibold hover:bg-pf-white/10" style={{ color: "var(--pf-f6c9b6)" }}>Fortryd</button>
        </div>
      )}
    </div>
  );
}
