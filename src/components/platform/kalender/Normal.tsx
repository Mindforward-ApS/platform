"use client";

// Kalender laid out like an ordinary calendar app (Google Calendar), Marco 2026-11-11: "en helt normal kalender".
// Left: + Opret, mini month, Mine kalendere. Top: I dag, ‹ ›, title, Dag / Uge / Måned. Main: all 7 days and the whole
// day (scrolled to 07:00), or a month grid. Drag to move, drag the bottom edge to resize, drag on an empty slot to
// create, click for details, Fortryd. Real dates in Europe/Copenhagen; the learner's own blocks are saved on the server
// (optimistic, rolled back on error). Completed lessons and øvemiljø sessions are shown read-only ("Gennemført").
// Ported from mindforward-platform /kalender-ny (approved 2026-11-11).
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CaretLeftIcon, CaretRightIcon, CheckIcon, PlusIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import { createCalendarEvent, deleteCalendarEvent, loadCalendarRange, updateCalendarEvent } from "@/app/(learner)/kalender/actions";
import {
  addDays,
  addMonths,
  cph,
  cphToUtc,
  daysBetween,
  DEFAULT_HREF,
  dowOf,
  loadRange,
  monthGrid,
  monthOf,
  TYPE_KEY,
  TYPE_LABEL,
  weekStartOf,
  type CalendarItem,
  type CalendarTypeLabel,
  type Day,
} from "@/lib/calendar";
import { CALENDAR_MAX_MINUTES } from "@/lib/schemas/calendar";

type T = CalendarTypeLabel;
/** One block: `s`/`e` are minutes after local midnight of `day` (`e` may pass 24:00). `done` = computed, read-only. */
type Ev = { id: string; day: Day; s: number; e: number; type: T; title: string; href: string | null; done: boolean };
type View = "dag" | "uge" | "maaned";
const INK = "var(--pf-201613)", MUTED = "var(--pf-6b625d)", LINE = "var(--pf-ece5e0)", CORAL = "var(--pf-e8664a)";
const CAL: Record<T, { c: string; label: string }> = {
  Lektion: { c: CORAL, label: "Lektioner" },
  Øvelse: { c: "var(--pf-8a6a5e)", label: "Øvelser" },
  Holdmøde: { c: "var(--pf-3f9c6e)", label: "Holdmøder" },
};
const DOW = ["man.", "tir.", "ons.", "tor.", "fre.", "lør.", "søn."];
const WEEKDAY = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
const MONTH = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const MONTH_SHORT = ["jan.", "feb.", "mar.", "apr.", "maj", "jun.", "jul.", "aug.", "sep.", "okt.", "nov.", "dec."];
const PX = 80, SNAP = 15; // 80 px per hour: a half-hour block fits two full lines
const hhmm = (m: number) => { const x = ((m % 1440) + 1440) % 1440; return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const snap = (m: number) => Math.round(m / SNAP) * SNAP;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const dayNum = (d: Day) => Number(d.slice(8, 10));
const sameMonth = (a: Day, b: Day) => a.slice(0, 7) === b.slice(0, 7);
const dateText = (d: Day) => `${WEEKDAY[dowOf(d)]} ${dayNum(d)}. ${MONTH[monthOf(d).m]}`;
const ERROR = "Kunne ikke gemme. Prøv igen.";

function toEv(i: CalendarItem): Ev {
  const a = cph(new Date(i.startsAt)), b = cph(new Date(i.endsAt));
  return { id: i.id, day: a.day, s: a.min, e: Math.max(a.min + 1, b.min + daysBetween(a.day, b.day) * 1440), type: TYPE_LABEL[i.type], title: i.title, href: i.href, done: i.done };
}
const times = (ev: Pick<Ev, "day" | "s" | "e">) => ({ startsAt: cphToUtc(ev.day, ev.s).toISOString(), endsAt: cphToUtc(ev.day, ev.e).toISOString() });

export function Normal({ today: initialToday, now: initialNow, events: initial }: { today: Day; now: string; events: CalendarItem[] }) {
  const [events, setEvents] = useState<Ev[]>(() => initial.map(toEv));
  const [clock, setClock] = useState(() => cph(new Date(initialNow)));
  const [view, setView] = useState<View>("uge");
  const [cur, setCur] = useState<Day>(initialToday); // the day the view is built around
  const [show, setShow] = useState<Record<T, boolean>>({ Lektion: true, Øvelse: true, Holdmøde: true });
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ day: Day; s: number; e: number; title: string; type: T } | null>(null);
  const [toast, setToast] = useState<{ msg: string; undo?: () => void } | null>(null);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; dx: number; dy: number; ox: number; oy: number } | null>(null);
  const [loadedMonths, setLoadedMonths] = useState<string[]>(() => [initialToday.slice(0, 7)]);
  const grid = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  // Client ids stay stable; blocks created here get "tmp-…" ids and learn their server id when the create returns.
  const requested = useRef(new Set([initialToday.slice(0, 7)]));
  const pendingSid = useRef(new Map<string, Promise<string | null>>());
  const sid = useRef(new Map<string, string>());
  const busy = useRef(new Set<string>()); // client ids with a change in flight: a range load must not overwrite them
  const gone = useRef(new Set<string>()); // server ids deleted here: a range load must not bring them back
  const TODAY = clock.day, NOW = clock.min;

  const days = view === "dag" ? [cur] : Array.from({ length: 7 }, (_, i) => addDays(weekStartOf(cur), i));
  const n = days.length;
  const shown = events.filter((e) => show[e.type]);
  const month = monthGrid(cur);
  const cells = Array.from({ length: month.weeks * 7 }, (_, i) => addDays(month.start, i));
  const monthKey = cur.slice(0, 7);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 7 * PX; }, [view]);
  useEffect(() => { const t = setInterval(() => setClock(cph(new Date())), 30_000); return () => clearInterval(t); }, []);

  // Load the six weeks around the month in view the first time it is shown.
  useEffect(() => {
    if (requested.current.has(monthKey)) return;
    requested.current.add(monthKey);
    const { from, to } = loadRange(cur);
    loadCalendarRange({ from: from.toISOString(), to: to.toISOString() }).then(
      (r) => {
        if (!r.ok) { requested.current.delete(monthKey); return; }
        setEvents((prev) => {
          const fresh = new Map(r.events.filter((i) => !gone.current.has(i.id)).map((i) => [i.id, i]));
          const next = prev.map((e) => {
            const i = fresh.get(sid.current.get(e.id) ?? e.id);
            if (!i) return e;
            fresh.delete(i.id);
            return busy.current.has(e.id) ? e : { ...toEv(i), id: e.id };
          });
          return [...next, ...[...fresh.values()].map(toEv)];
        });
        setLoadedMonths((m) => [...m, monthKey]);
      },
      () => requested.current.delete(monthKey),
    );
  }, [monthKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const failed = () => setToast({ msg: ERROR });
  const patchLocal = (id: string, patch: Partial<Ev>) => setEvents((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const serverId = async (id: string) => sid.current.get(id) ?? (pendingSid.current.has(id) ? await pendingSid.current.get(id)! : id);
  const track = async (id: string, run: () => Promise<boolean>) => {
    busy.current.add(id);
    const ok = await run().catch(() => false);
    busy.current.delete(id);
    return ok;
  };

  /** Saves new times for a block; puts it back where it was if the server says no. */
  const saveTimes = (id: string, to: Pick<Ev, "day" | "s" | "e">, from: Pick<Ev, "day" | "s" | "e">) => {
    patchLocal(id, to);
    void track(id, async () => {
      const s = await serverId(id);
      return !!s && (await updateCalendarEvent({ id: s, ...times(to) })).ok;
    }).then((ok) => { if (!ok) { patchLocal(id, from); failed(); } });
  };
  const move = (ev: Ev, to: Pick<Ev, "day" | "s" | "e">, msg: string) => {
    const from = { day: ev.day, s: ev.s, e: ev.e };
    saveTimes(ev.id, to, from);
    setToast({ msg, undo: () => saveTimes(ev.id, from, to) });
  };
  const createOnServer = (ev: Ev) => {
    setEvents((list) => [...list, ev]);
    const p = createCalendarEvent({ title: ev.title, type: TYPE_KEY[ev.type], ...times(ev), href: ev.href }).then((r) => (r.ok ? r.event.id : null), () => null);
    pendingSid.current.set(ev.id, p);
    void track(ev.id, async () => {
      const s = await p;
      if (s) sid.current.set(ev.id, s);
      return !!s;
    }).then((ok) => { if (!ok) { setEvents((list) => list.filter((x) => x.id !== ev.id)); failed(); } });
  };
  const remove = (ev: Ev) => {
    setEvents((list) => list.filter((x) => x.id !== ev.id));
    void track(ev.id, async () => {
      const s = await serverId(ev.id);
      if (!s) return false;
      gone.current.add(s);
      const ok = (await deleteCalendarEvent({ id: s })).ok;
      if (!ok) gone.current.delete(s);
      return ok;
    }).then((ok) => { if (!ok) { setEvents((list) => [...list, ev]); failed(); } });
  };
  const newId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const step = (dir: number) => setCur((c) => (view === "maaned" ? addMonths(c, dir) : addDays(c, dir * (view === "dag" ? 1 : 7))));
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
    return { day: days[col], m: clamp(snap(((y - r.top) / PX) * 60), 0, 24 * 60) };
  };

  // Move / resize with the pointer.
  useEffect(() => {
    if (!drag) return;
    const moveP = (e: PointerEvent) => setDrag((d) => d && { ...d, dx: e.clientX - d.ox, dy: e.clientY - d.oy });
    const up = (e: PointerEvent) => {
      const d = drag; setDrag(null);
      const ev = events.find((x) => x.id === d.id); if (!ev) return;
      if (Math.abs(e.clientX - d.ox) + Math.abs(e.clientY - d.oy) < 4) { setOpen(ev.id); return; }
      const len = ev.e - ev.s;
      if (d.mode === "resize") {
        const end = clamp(snap(ev.e + ((e.clientY - d.oy) / PX) * 60), ev.s + SNAP, Math.min(24 * 60, ev.s + CALENDAR_MAX_MINUTES));
        if (end !== ev.e) move(ev, { day: ev.day, s: ev.s, e: end }, `${ev.title} slutter nu kl. ${hhmm(end)}`);
      } else {
        const r = grid.current!.getBoundingClientRect();
        const col = Math.round(((e.clientX - d.ox) / r.width) * n);
        const s = clamp(snap(ev.s + ((e.clientY - d.oy) / PX) * 60), 0, 24 * 60 - len);
        const idx = days.indexOf(ev.day);
        const day = idx === -1 ? ev.day : days[clamp(idx + col, 0, n - 1)];
        if (day !== ev.day || s !== ev.s) move(ev, { day, s, e: s + len }, `${ev.title} er flyttet til ${DOW[dowOf(day)]} ${dayNum(day)}. ${MONTH_SHORT[monthOf(day).m]} kl. ${hhmm(s)}`);
      }
    };
    window.addEventListener("pointermove", moveP); window.addEventListener("pointerup", up, { once: true });
    return () => { window.removeEventListener("pointermove", moveP); window.removeEventListener("pointerup", up); };
  }, [drag, events]); // eslint-disable-line react-hooks/exhaustive-deps

  const createDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault(); // no text selection, and the title field keeps its focus
    const a = at(e.clientX, e.clientY); setOpen(null);
    const s0 = Math.min(a.m, 24 * 60 - 30);
    setDraft({ day: a.day, s: s0, e: s0 + 30, title: "", type: "Lektion" });
    const moveP = (ev: PointerEvent) => { const b = at(ev.clientX, ev.clientY); setDraft((d) => d && { ...d, e: clamp(b.m, d.s + SNAP, d.s + CALENDAR_MAX_MINUTES) }); };
    window.addEventListener("pointermove", moveP);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", moveP), { once: true });
  };
  const saveDraft = () => {
    if (!draft) return;
    const ev: Ev = { id: newId(), day: draft.day, s: draft.s, e: draft.e, type: draft.type, title: draft.title.trim().slice(0, 120) || "(Ingen titel)", href: DEFAULT_HREF[TYPE_KEY[draft.type]], done: false };
    createOnServer(ev);
    setToast({ msg: `${ev.title} er oprettet`, undo: () => remove(ev) });
    setDraft(null);
  };
  const removeWithUndo = (ev: Ev) => {
    remove(ev);
    setToast({ msg: `${ev.title} er slettet`, undo: () => createOnServer({ ...ev, id: newId() }) });
  };

  // Overlapping events share the column.
  const lanes = new Map<string, { lane: number; of: number }>();
  for (const d of days) {
    const list = shown.filter((e) => e.day === d).sort((a, b) => a.s - b.s);
    let group: Ev[] = [], ends: number[] = [], groupEnd = -1;
    const close = () => { group.forEach((g) => lanes.set(g.id, { lane: lanes.get(g.id)!.lane, of: Math.max(1, ends.length) })); group = []; ends = []; };
    for (const e of list) {
      if (e.s >= groupEnd) { close(); groupEnd = -1; }
      let lane = ends.findIndex((x) => x <= e.s);
      if (lane === -1) { lane = ends.length; ends.push(e.e); } else ends[lane] = e.e;
      lanes.set(e.id, { lane, of: 1 }); group.push(e); groupEnd = Math.max(groupEnd, e.e);
    }
    close();
  }

  const { y: cy, m: cm } = monthOf(cur);
  const monthTitle = `${cap(MONTH[cm])} ${cy}`;
  const weekTitle = () => {
    const a = monthOf(days[0]), b = monthOf(days[n - 1]);
    if (a.m === b.m && a.y === b.y) return `${cap(MONTH[a.m])} ${a.y}`;
    return a.y === b.y ? `${cap(MONTH_SHORT[a.m])} – ${MONTH_SHORT[b.m]} ${b.y}` : `${cap(MONTH_SHORT[a.m])} ${a.y} – ${MONTH_SHORT[b.m]} ${b.y}`;
  };
  const title = view === "maaned" ? monthTitle : view === "dag" ? `${dateText(cur)} ${cy}` : weekTitle();
  const openEv = events.find((e) => e.id === open);
  const emptyWeek = view !== "maaned" && loadedMonths.includes(monthKey) && !events.some((e) => days.includes(e.day));

  return (
    <div className="flex min-h-[calc(100svh-7rem)] gap-4">
      {/* Left column, as in an ordinary calendar app */}
      <aside className="hidden w-[232px] shrink-0 flex-col gap-5 lg:flex">
        <button type="button" onClick={() => { setOpen(null); setDraft({ day: cur, s: 9 * 60, e: 9 * 60 + 30, title: "", type: "Lektion" }); }} className="flex h-12 w-fit items-center gap-2 rounded-[14px] bg-pf-white pl-4 pr-5 text-[0.9375rem] font-medium shadow-[0_1px_3px_rgba(32,22,19,0.15)] transition hover:shadow-md" style={{ color: INK }}>
          <PlusIcon size={20} weight="bold" style={{ color: CORAL }} />Opret
        </button>
        <div>
          <p className="px-1 text-[0.875rem] font-medium" style={{ color: INK }}>{monthTitle}</p>
          <div className="mt-2 grid grid-cols-7 text-center text-[0.6875rem]" style={{ color: MUTED }}>
            {["M", "T", "O", "T", "F", "L", "S"].map((d, k) => <span key={k} className="py-1">{d}</span>)}
            {cells.map((d) => (
              <button key={d} type="button" onClick={() => setCur(d)} className="mx-auto grid size-7 place-items-center rounded-full text-[0.75rem] hover:bg-[var(--pf-f3eeeb)]"
                style={d === TODAY ? { background: CORAL, color: "var(--pf-fff)", fontWeight: 600 } : d === cur ? { background: "var(--pf-f3d9cf)", color: INK } : { color: sameMonth(d, cur) ? INK : "var(--pf-c4bab4)" }}>{dayNum(d)}</button>
            ))}
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
          {emptyWeek && <p className="text-[0.8125rem]" style={{ color: MUTED }}>Træk i kalenderen for at planlægge din første lektion</p>}
          <div className="ml-auto flex rounded-full border p-0.5" style={{ borderColor: LINE }}>
            {([["dag", "Dag"], ["uge", "Uge"], ["maaned", "Måned"]] as [View, string][]).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setView(v)} className="h-8 rounded-full px-4 text-[0.875rem] font-medium" style={view === v ? { background: "var(--pf-f3d9cf)", color: INK } : { color: MUTED }}>{l}</button>
            ))}
          </div>
        </header>

        {view === "maaned" ? (
          <div className="grid flex-1 grid-cols-7 border-t" style={{ borderColor: LINE }}>
            {DOW.map((d) => <div key={d} className="border-l py-2 text-center text-[0.6875rem] font-medium uppercase" style={{ borderColor: LINE, color: MUTED }}>{d}</div>)}
            {cells.map((d) => {
              const list = shown.filter((e) => e.day === d).sort((a, b) => a.s - b.s);
              return (
                <div key={d} className="min-h-[7rem] border-l border-t p-1" style={{ borderColor: LINE }}>
                  <button type="button" onClick={() => { setCur(d); setView("dag"); }} className="mx-auto mb-1 grid size-7 place-items-center rounded-full text-[0.75rem] font-medium hover:bg-[var(--pf-f3eeeb)]" style={d === TODAY ? { background: CORAL, color: "var(--pf-fff)" } : { color: sameMonth(d, cur) ? INK : "var(--pf-c4bab4)" }}>{dayNum(d)}</button>
                  {list.slice(0, 3).map((e) => (
                    <button key={e.id} type="button" title={`${hhmm(e.s)} ${e.title}`} onClick={() => setOpen(e.id)} className="flex w-full items-start gap-1.5 rounded-[4px] px-1 py-0.5 text-left text-[0.75rem] leading-[1.25] hover:bg-[var(--pf-f5f0ed)]" style={{ color: INK }}>
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
                  <button type="button" onClick={() => { setCur(d); setView("dag"); }} className="mt-0.5 grid size-11 place-items-center rounded-full text-[1.375rem] hover:bg-[var(--pf-f3eeeb)]" style={d === TODAY ? { background: CORAL, color: "var(--pf-fff)" } : { color: sameMonth(d, cur) ? INK : "var(--pf-c4bab4)" }}>{dayNum(d)}</button>
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
                  {shown.filter((e) => days.includes(e.day)).map((ev) => {
                    const s = ev.s, e = Math.min(ev.e, 24 * 60), col = days.indexOf(ev.day);
                    const start = hhmm(ev.s), end = hhmm(ev.e);
                    const L = lanes.get(ev.id) ?? { lane: 0, of: 1 };
                    const d = drag?.id === ev.id ? drag : null;
                    const top = (s / 60) * PX + (d?.mode === "move" ? d.dy : 0);
                    const h = Math.max(20, ((e - s) / 60) * PX - 2 + (d?.mode === "resize" ? d.dy : 0));
                    const past = ev.day < TODAY || (ev.day === TODAY && e <= NOW);
                    const label = `${ev.title}, ${start}–${end}${ev.done ? ", gennemført" : ""}`;
                    return (
                      <div key={ev.id} role="button" tabIndex={0} title={label} aria-label={label} onKeyDown={(k) => { if (k.key === "Enter") setOpen(ev.id); }}
                        // Completed activity is read-only: a click opens the details, nothing can be dragged.
                        onPointerDown={(p) => { p.stopPropagation(); if (p.button === 0 && !ev.done) setDrag({ id: ev.id, mode: "move", dx: 0, dy: 0, ox: p.clientX, oy: p.clientY }); }}
                        onClick={ev.done ? () => setOpen(ev.id) : undefined}
                        className={`group absolute z-10 cursor-pointer select-none overflow-hidden rounded-[6px] px-1.5 py-0.5 text-pf-white ${d ? "z-30 shadow-lg" : ""}`}
                        style={{ top, height: h, left: `calc(${((col + L.lane / L.of) / n) * 100}% + 1px)`, width: `calc(${100 / n / L.of}% - 4px)`, transform: d?.mode === "move" ? `translateX(${d.dx}px)` : undefined, background: CAL[ev.type].c, opacity: past ? 0.55 : 1, boxShadow: "0 0 0 1px var(--pf-fff)" }}>
                        {/* Short block: title and time run on as text (two lines at most); taller block: time on its own line. */}
                        <p className={`text-[0.75rem] font-medium leading-[1.2] ${h < 60 ? "line-clamp-2" : "line-clamp-3"}`}>{ev.done && <CheckIcon size={11} weight="bold" aria-hidden className="mr-0.5 inline align-[-1px]" />}{ev.title}{h < 60 && <span className="font-normal opacity-90">, {start}</span>}</p>
                        {h >= 60 && <p className="text-[0.6875rem] tabular-nums opacity-90">{start}–{end}</p>}
                        {!ev.done && <span aria-hidden onPointerDown={(p) => { p.stopPropagation(); setDrag({ id: ev.id, mode: "resize", dx: 0, dy: 0, ox: p.clientX, oy: p.clientY }); }} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" />}
                      </div>
                    );
                  })}
                  {draft && days.includes(draft.day) && (
                    <div className="pointer-events-none absolute z-30 rounded-[6px] px-1.5 py-0.5 text-[0.75rem] font-medium text-pf-white shadow-lg" style={{ top: (draft.s / 60) * PX, height: ((Math.min(draft.e, 24 * 60) - draft.s) / 60) * PX - 2, left: `calc(${(days.indexOf(draft.day) / n) * 100}% + 1px)`, width: `calc(${100 / n}% - 4px)`, background: CAL[draft.type].c }}>
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
            {!openEv.done && <button type="button" aria-label="Slet" onClick={() => { removeWithUndo(openEv); setOpen(null); }} className="grid size-8 place-items-center rounded-full hover:bg-[var(--pf-f3eeeb)]"><TrashIcon size={16} /></button>}
            <button type="button" aria-label="Luk" onClick={() => setOpen(null)} className="grid size-8 place-items-center rounded-full hover:bg-[var(--pf-f3eeeb)]"><XIcon size={16} /></button>
          </div>
          <div className="flex gap-3">
            <span className="mt-1.5 size-3.5 shrink-0 rounded-[4px]" style={{ background: CAL[openEv.type].c }} />
            <div><p className="text-[1.25rem] leading-snug" style={{ color: INK }}>{openEv.title}</p><p className="mt-1 text-[0.875rem]" style={{ color: MUTED }}>{dateText(openEv.day)} · {hhmm(openEv.s)}–{hhmm(openEv.e)}</p><p className="text-[0.875rem]" style={{ color: MUTED }}>{CAL[openEv.type].label}{openEv.done && " · Gennemført"}</p></div>
          </div>
          {openEv.type !== "Holdmøde" && openEv.href && <Link href={openEv.href} className="mt-5 flex h-10 items-center justify-center rounded-full text-[0.875rem] font-semibold" style={{ background: CORAL, color: INK }}>Åbn</Link>}
        </div>
      )}

      {/* Quick create */}
      {draft && (
        <div className="fixed left-1/2 top-1/3 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-[16px] bg-pf-white p-5 shadow-[0_24px_60px_-20px_rgba(32,22,19,0.5)] ring-1 ring-[var(--pf-ebe4e0)]">
          <input autoFocus value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") saveDraft(); }} placeholder="Tilføj titel" className="w-full border-b pb-2 text-[1.25rem] outline-none focus:border-[var(--pf-e8664a)]" style={{ borderColor: LINE, color: INK }} />
          <p className="mt-3 text-[0.875rem]" style={{ color: MUTED }}>{dateText(draft.day)} · {hhmm(draft.s)}–{hhmm(draft.e)}</p>
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
          {toast.undo && <button type="button" onClick={() => { const undo = toast.undo!; setToast(null); undo(); }} className="rounded-[6px] px-3 py-1 font-semibold hover:bg-pf-white/10" style={{ color: "var(--pf-f6c9b6)" }}>Fortryd</button>}
        </div>
      )}
    </div>
  );
}
