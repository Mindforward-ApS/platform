"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowSquareOutIcon, BookOpenIcon, CalendarBlankIcon, CaretLeftIcon, CaretRightIcon, CheckIcon, ClockIcon, CopyIcon,
  DotsSixVerticalIcon, FlaskIcon, PencilSimpleIcon, PlusCircleIcon, TrashIcon, UsersThreeIcon, XIcon, ArrowRightIcon,
} from "@phosphor-icons/react";
import type { PlanEvent } from "@/content/platform";

// Built from the month-calendar reference Marco sent (2026-10-23), calendar part only, our colours.
// Day tiles, events as rows, "+N flere" popover, detail popover beside the event, Dag/Uge/Måned.
// Events can be dragged to another day (Marco: "man skal kunne rykke rundt på kortene").

type Ev = Omit<PlanEvent, "date"> & { iso: string };
type View = "Dag" | "Uge" | "Måned";

const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
const WD_SHORT = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
const WD_LONG = ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"];
const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const mondayIdx = (d: Date) => (d.getDay() + 6) % 7;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const longDate = (iso: string) => { const d = fromIso(iso); return `${WD_LONG[mondayIdx(d)]} ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const shortDate = (iso: string) => { const d = fromIso(iso); return `${WD_SHORT[mondayIdx(d)].toLowerCase()}. ${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}.`; };

const meta = {
  Lektion: { icon: BookOpenIcon, tile: "bg-[var(--accent-soft)] text-[var(--accent)]", action: "Start lektionen" },
  Øvelse: { icon: FlaskIcon, tile: "bg-[var(--ink)] text-white", action: "Åbn i øvemiljøet" },
  Holdmøde: { icon: UsersThreeIcon, tile: "bg-[#ece5e1] text-heading", action: "Se beskeden" },
} as const;

type Props = { year: number; month: number; today: number; now: string; events: PlanEvent[]; courseTitles: Record<string, string> };

export function Calendar({ year, month, today, now, events: initial, courseTitles }: Props) {
  const todayIso = `${year}-${pad(month + 1)}-${pad(today)}`;
  const [events, setEvents] = useState<Ev[]>(() => initial.map(({ date, ...e }) => ({ ...e, iso: `${year}-${pad(month + 1)}-${pad(date)}` })));
  const [view, setView] = useState<View>("Måned");
  const [cursor, setCursor] = useState(() => new Date(year, month, today));
  const [open, setOpen] = useState<{ id: string; x: number; y: number } | null>(null);
  const [more, setMore] = useState<{ iso: string; x: number; y: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => void } | null>(null);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const byDay = useMemo(() => {
    const m = new Map<string, Ev[]>();
    for (const e of [...events].sort((a, b) => a.start.localeCompare(b.start))) m.set(e.iso, [...(m.get(e.iso) ?? []), e]);
    return m;
  }, [events]);
  const isPast = (e: Ev) => e.iso < todayIso || (e.iso === todayIso && e.end <= now);
  const sel = open ? events.find((e) => e.id === open.id) : undefined;

  const close = useCallback(() => { setOpen(null); setMore(null); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [close]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  // Position a popover beside the clicked element, inside the calendar box.
  function place(el: HTMLElement, w: number) {
    const b = box.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    let x = r.right - b.left + 8;
    if (x + w > b.width) x = r.left - b.left - w - 8;
    return { x: Math.max(8, x), y: Math.max(8, Math.min(r.top - b.top - 12, b.height - 360)) };
  }
  function openEvent(e: Ev, el: HTMLElement) { setMore(null); setCopied(false); setOpen({ id: e.id, ...place(el, 304) }); }

  function move(id: string, iso: string) {
    const ev = events.find((e) => e.id === id);
    if (!ev || ev.iso === iso) return;
    const from = ev.iso;
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, iso } : e)));
    setToast({ text: `"${ev.title}" er flyttet til ${shortDate(iso)}`, undo: () => setEvents((es) => es.map((e) => (e.id === id ? { ...e, iso: from } : e))) });
    close();
  }
  function remove(id: string) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setEvents((es) => es.filter((e) => e.id !== id));
    setToast({ text: `"${ev.title}" er slettet`, undo: () => setEvents((es) => [...es, ev]) });
    close();
  }

  // Drop target props for a day tile / column.
  const drop = (iso: string) => ({
    onDragOver: (e: React.DragEvent) => { if (dragId) { e.preventDefault(); setOver(iso); } },
    onDragLeave: () => setOver((o) => (o === iso ? null : o)),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain") || dragId; if (id) move(id, iso); setDragId(null); setOver(null); },
  });

  function row(e: Ev, big?: boolean) {
    const m = meta[e.type];
    const Icon = m.icon;
    const past = isPast(e);
    return (
      <button
        key={e.id}
        draggable
        onDragStart={(d) => { d.dataTransfer.setData("text/plain", e.id); d.dataTransfer.effectAllowed = "move"; setDragId(e.id); close(); }}
        onDragEnd={() => { setDragId(null); setOver(null); }}
        onClick={(c) => { c.stopPropagation(); openEvent(e, c.currentTarget); }}
        className={`group/row flex w-full cursor-grab items-center gap-1.5 rounded-[6px] text-left transition-colors hover:bg-[var(--hover-fill)] active:cursor-grabbing ${big ? "px-2 py-2" : "px-1 py-[3px]"} ${open?.id === e.id ? "bg-[var(--hover-fill)]" : ""} ${dragId === e.id ? "opacity-40" : ""}`}
      >
        <span className={`grid shrink-0 place-items-center rounded-[4px] ${m.tile} ${big ? "h-7 w-7" : "h-4 w-4"}`}>
          {past ? <CheckIcon size={big ? 14 : 9} weight="bold" /> : <Icon size={big ? 14 : 9} weight="bold" />}
        </span>
        <span className={`min-w-0 flex-1 truncate ${big ? "text-[0.8125rem]" : "hidden text-[0.6875rem] sm:block"} ${past ? "text-muted" : "font-medium text-heading"}`}>{e.title}</span>
        <span className={`shrink-0 tabular-nums text-muted ${big ? "text-[0.75rem]" : "hidden text-[0.625rem] sm:inline"}`}>{e.start}</span>
        {big ? <DotsSixVerticalIcon size={14} className="shrink-0 text-[#cfc4bf] opacity-0 group-hover/row:opacity-100" /> : null}
      </button>
    );
  }

  // ---------- views ----------
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(first, -mondayIdx(first));
  const weekStart = addDays(cursor, -mondayIdx(cursor));
  const title =
    view === "Måned" ? `${MONTHS[cursor.getMonth()][0].toUpperCase()}${MONTHS[cursor.getMonth()].slice(1)} ${cursor.getFullYear()}`
    : view === "Uge" ? `${weekStart.getDate()}.–${addDays(weekStart, 6).getDate()}. ${MONTHS[addDays(weekStart, 6).getMonth()]} ${weekStart.getFullYear()}`
    : longDate(isoOf(cursor));
  const step = (dir: number) => {
    close();
    setCursor((c) => (view === "Måned" ? new Date(c.getFullYear(), c.getMonth() + dir, 1) : addDays(c, dir * (view === "Uge" ? 7 : 1))));
  };

  function dayNum(d: Date, inMonth: boolean) {
    const isToday = isoOf(d) === todayIso;
    return (
      <span className={`grid h-6 min-w-6 place-items-center rounded-full px-1 text-[0.75rem] font-semibold tabular-nums ${isToday ? "bg-[var(--coral)] text-white" : inMonth ? "text-heading" : "text-[#b9aca6]"}`}>{d.getDate()}</span>
    );
  }

  const monthView = (
    <div className="rounded-[12px] bg-[var(--hover-fill)] p-1">
      <div className="grid grid-cols-7">
        {WD_SHORT.map((d) => <div key={d} className="py-2 text-center text-[0.75rem] font-medium text-text">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }, (_, i) => {
          const d = addDays(gridStart, i);
          const iso = isoOf(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const list = byDay.get(iso) ?? [];
          if (i >= 35 && addDays(gridStart, 35).getMonth() !== cursor.getMonth()) return null;
          // Marco: "Kun indeværende måned" — days outside the month leave an empty slot.
          if (!inMonth) return <div key={iso} aria-hidden />;
          return (
            <div
              key={iso}
              {...drop(iso)}
              className={`flex min-h-[6.25rem] flex-col rounded-[10px] border p-1.5 transition-colors ${inMonth ? "border-[var(--border)] bg-white" : "border-transparent bg-[#efe9e6]"} ${over === iso ? "!border-[var(--coral)] !bg-[var(--accent-soft)]" : ""}`}
            >
              <div className="flex justify-end">{dayNum(d, inMonth)}</div>
              <div className="mt-0.5 flex flex-col">
                {list.slice(0, 2).map((e) => row(e))}
                {list.length > 2 ? (
                  <button
                    onClick={(c) => { c.stopPropagation(); setOpen(null); setMore({ iso, ...place(c.currentTarget, 272) }); }}
                    className="mt-0.5 self-start px-1 text-[0.6875rem] font-semibold text-[var(--accent)] hover:underline"
                  >
                    +{list.length - 2} mere
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const weekView = (
    <div className="rounded-[12px] bg-[var(--hover-fill)] p-1">
      <div className="app-scroll overflow-x-auto">
        <div className="grid min-w-[48rem] grid-cols-7 gap-1">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(weekStart, i);
            const iso = isoOf(d);
            const list = byDay.get(iso) ?? [];
            return (
              <div key={iso} {...drop(iso)} className={`flex min-h-[26rem] flex-col rounded-[10px] border border-[var(--border)] bg-white p-1.5 transition-colors ${over === iso ? "!border-[var(--coral)] !bg-[var(--accent-soft)]" : ""}`}>
                <div className="mb-1 flex items-center justify-between px-1 pt-0.5">
                  <span className="text-[0.75rem] font-medium text-text">{WD_SHORT[i]}</span>
                  {dayNum(d, true)}
                </div>
                <div className="flex flex-col gap-1">
                  {list.map((e) => (
                    <div key={e.id} className="rounded-[8px] border border-[var(--border)]">{row(e)}</div>
                  ))}
                </div>
                {list.length === 0 ? <div className="mt-6 text-center text-[0.6875rem] text-[#b9aca6]">Fri</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const dayIso = isoOf(cursor);
  const dayList = byDay.get(dayIso) ?? [];
  const dayView = (
    <div className="rounded-[12px] bg-[var(--hover-fill)] p-1">
      <div className="min-h-[26rem] rounded-[10px] border border-[var(--border)] bg-white p-3">
        {dayList.length ? (
          <ul className="flex flex-col gap-1.5">
            {dayList.map((e) => (
              <li key={e.id} className="rounded-[10px] border border-[var(--border)]">{row(e, true)}</li>
            ))}
          </ul>
        ) : (
          <div className="grid h-64 place-items-center text-center text-[0.8125rem] text-muted">Intet planlagt denne dag.</div>
        )}
      </div>
    </div>
  );

  return (
    <div ref={box} className="app-card relative rounded-[14px] p-4" onClick={close}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="min-w-[9.5rem] text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">{title}</h2>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Forrige" onClick={() => step(-1)} className="app-btn app-btn-light !h-8 !w-8 !p-0"><CaretLeftIcon size={13} /></button>
            <button onClick={() => { close(); setCursor(new Date(year, month, today)); }} className="app-btn app-btn-light !h-8">I dag</button>
            <button aria-label="Næste" onClick={() => step(1)} className="app-btn app-btn-light !h-8 !w-8 !p-0"><CaretRightIcon size={13} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div role="tablist" className="flex rounded-[10px] border border-[var(--border)] p-0.5">
            {(["Dag", "Uge", "Måned"] as const).map((v) => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => { close(); setView(v); }} className={`h-8 rounded-[8px] px-3.5 text-[0.75rem] font-medium transition-colors ${view === v ? "bg-[var(--coral)] text-white" : "text-text hover:text-heading"}`}>{v}</button>
            ))}
          </div>
          <button className="app-btn app-btn-primary !h-9 !rounded-[10px]"><PlusCircleIcon size={16} /> Planlæg tid</button>
        </div>
      </div>

      {view === "Måned" ? monthView : view === "Uge" ? weekView : dayView}

      <p className="mt-3 flex items-center gap-1.5 text-[0.6875rem] text-muted">
        <DotsSixVerticalIcon size={13} /> Træk en aftale over på en anden dag for at flytte den.
      </p>

      {/* "+N mere" popover */}
      {more ? (
        <div onClick={(e) => e.stopPropagation()} className="absolute z-30 w-[17rem] rounded-[12px] border border-[var(--border)] bg-white p-2 shadow-[0_16px_40px_-12px_rgb(32_22_19/0.3)]" style={{ left: more.x, top: more.y }}>
          <div className="flex items-center justify-between px-1.5 pb-1.5 pt-0.5">
            <span className="text-[0.75rem] font-semibold text-heading">{longDate(more.iso)}</span>
            <button aria-label="Luk" onClick={() => setMore(null)} className="text-muted hover:text-heading"><XIcon size={13} /></button>
          </div>
          <div className="flex flex-col gap-1">
            {(byDay.get(more.iso) ?? []).map((e) => <div key={e.id} className="rounded-[8px] border border-[var(--border)]">{row(e, true)}</div>)}
          </div>
        </div>
      ) : null}

      {/* Event detail popover */}
      {sel && open ? (
        <div onClick={(e) => e.stopPropagation()} className="absolute z-40 w-[19rem] rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[0_20px_50px_-14px_rgb(32_22_19/0.35)]" style={{ left: open.x, top: open.y }}>
          <div className="flex items-center justify-between">
            <button aria-label="Luk" onClick={() => setOpen(null)} className="grid h-7 w-7 place-items-center rounded-[6px] text-heading hover:bg-[var(--hover-fill)]"><XIcon size={15} /></button>
            <div className="flex items-center gap-0.5 text-heading">
              <Link href={sel.href} aria-label="Åbn" className="grid h-7 w-7 place-items-center rounded-[6px] hover:bg-[var(--hover-fill)]"><ArrowSquareOutIcon size={15} /></Link>
              <button
                aria-label="Kopiér link"
                onClick={() => { navigator.clipboard?.writeText(location.origin + sel.href).catch(() => {}); setCopied(true); }}
                className="relative grid h-7 w-7 place-items-center rounded-[6px] hover:bg-[var(--hover-fill)]"
              >
                <CopyIcon size={15} />
                {copied ? <span className="absolute -top-7 whitespace-nowrap rounded-[5px] bg-[var(--ink)] px-1.5 py-0.5 text-[0.625rem] text-white">Link kopieret</span> : null}
              </button>
              <button aria-label="Slet" onClick={() => remove(sel.id)} className="grid h-7 w-7 place-items-center rounded-[6px] hover:bg-[var(--hover-fill)]"><TrashIcon size={15} /></button>
              <button aria-label="Rediger" className="grid h-7 w-7 place-items-center rounded-[6px] hover:bg-[var(--hover-fill)]"><PencilSimpleIcon size={15} /></button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`grid h-5 w-5 place-items-center rounded-[5px] ${meta[sel.type].tile}`}>{(() => { const I = meta[sel.type].icon; return <I size={11} weight="bold" />; })()}</span>
            {isPast(sel) ? <span className="text-[0.6875rem] font-medium text-muted">Gennemført</span> : null}
          </div>
          <h3 className="mt-2 text-[1rem] font-semibold leading-snug text-heading">{sel.title}</h3>
          <p className="mt-1 text-[0.75rem] leading-relaxed text-muted">
            {sel.course ? courseTitles[sel.course] : "Holdmøde for Salg & service. Tag gerne et eksempel med fra din uge."}
          </p>
          <ul className="mt-4 flex flex-col gap-2.5 text-[0.75rem] text-heading">
            {[
              { icon: meta[sel.type].icon, text: sel.type },
              { icon: CalendarBlankIcon, text: longDate(sel.iso) },
              { icon: ClockIcon, text: `${sel.start}–${sel.end}` },
            ].map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-[7px] border border-[var(--border)] text-text"><I size={14} /></span>{text}</li>
            ))}
          </ul>
          {sel.type === "Holdmøde" ? <Rsvp /> : (
            <Link href={sel.href} className="app-btn app-btn-primary mt-4 w-full !rounded-[10px]">{meta[sel.type].action} <ArrowRightIcon size={13} /></Link>
          )}
        </div>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div onClick={(e) => e.stopPropagation()} className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-[12px] bg-[var(--ink)] px-4 py-3 text-[0.8125rem] text-white shadow-[0_16px_40px_-12px_rgb(0_0_0/0.5)]">
          <span>{toast.text}</span>
          {toast.undo ? <button onClick={() => { toast.undo!(); setToast(null); }} className="font-semibold text-[var(--coral)] hover:underline">Fortryd</button> : null}
        </div>
      ) : null}
    </div>
  );
}

function Rsvp() {
  const [v, setV] = useState<"Ja" | "Nej" | "Måske">("Ja");
  return (
    <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3">
      <span className="text-[0.75rem] text-text">Deltager du?</span>
      <div className="flex gap-1.5">
        {(["Ja", "Nej", "Måske"] as const).map((o) => (
          <button key={o} onClick={() => setV(o)} className={`h-7 rounded-[7px] px-3 text-[0.6875rem] font-semibold transition-colors ${v === o ? "bg-[var(--coral)] text-white" : "border border-[var(--coral)] text-[var(--accent)] hover:bg-[var(--accent-soft)]"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}
