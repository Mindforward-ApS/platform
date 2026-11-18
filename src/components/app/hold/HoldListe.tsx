"use client";
// Mit hold. Version H "Liste" is live on /hold (Marco 2026-11-03: "H er klart bedst"); G and I stay as previews.
// Round 3 of "Mit hold", built for scale (Marco 2026-11-03: "der kan være 400 på et hold"). 400 generated people in
// six departments. Nobody is shown as a card by default; the leader works with groups, filters and bulk actions.
// G Afdelinger  — org overview: funnel + one row per department with adoption, score and who is stuck; bulk Skub
//                 per department; click a department to drill down (Culture Amp / Lattice people analytics).
// H Liste       — a real people table: search, filters, sort, select many, bulk Skub, pagination; only the table
//                 scrolls (Linear / Notion / Google Admin user lists).
// I Opmærksomhed — management by exception: groups that need something, each with one bulk action, plus the
//                 progress distribution and department × week activity (Microsoft Viva Insights style).
// Example data only.
import { Fragment, useMemo, useState } from "react";
import { ArrowRightIcon, BellRingingIcon, CaretDownIcon, CaretUpIcon, CheckIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, LockSimpleIcon, MagnifyingGlassIcon, SealCheckIcon, SparkleIcon, UserPlusIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { courses } from "@/content/academy";

const O = "#e2643f", GREEN = "#5cbf8f", AMBER = "#f0b03c", INK = "#201613", LINE = "#f1e9e4";
const card = "relative min-w-0 rounded-[16px] bg-white";
const STAGE = "linear-gradient(160deg, #33231f 0%, #201613 55%, #1a0f0c 100%)";

// ——— 400 generated people (seeded, so every render is identical) ———
function rng(seed: number) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const R = rng(20261103);
const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
const FIRST = ["Anne", "Mette", "Sofie", "Ida", "Emma", "Freja", "Maja", "Laura", "Camilla", "Louise", "Nora", "Julie", "Mads", "Jonas", "Emil", "Lars", "Henrik", "Søren", "Thomas", "Mikkel", "Rasmus", "Anders", "Kasper", "Jesper", "Peter", "Morten", "Frederik", "Oliver", "Malthe", "Christian", "Line", "Hanne", "Bente", "Karina", "Tina", "Ali", "Fatima", "Yusuf", "Amira", "Omar"];
const LAST = ["Jensen", "Nielsen", "Hansen", "Pedersen", "Andersen", "Christensen", "Larsen", "Sørensen", "Rasmussen", "Jørgensen", "Petersen", "Madsen", "Kristensen", "Olsen", "Thomsen", "Poulsen", "Johansen", "Møller", "Mortensen", "Lund", "Holm", "Brandt", "Kirk", "Vang", "Dahl", "Bach", "Friis", "Kjær", "Winther", "Krogh"];
export const DEPTS = [
  { id: "salg", name: "Salg", n: 70, roles: ["Sælger", "Key account", "Salgschef"] },
  { id: "kunde", name: "Kundeservice", n: 110, roles: ["Kundeservice", "Teamleder"] },
  { id: "lager", name: "Lager og logistik", n: 120, roles: ["Lagermedarbejder", "Planlægger", "Vagtleder"] },
  { id: "okonomi", name: "Økonomi", n: 40, roles: ["Bogholder", "Controller"] },
  { id: "marketing", name: "Marketing", n: 35, roles: ["Marketing", "Indholdsansvarlig"] },
  { id: "ledelse", name: "Ledelse", n: 25, roles: ["Afdelingsleder", "Direktion"] },
] as const;
const TOOLS = ["ChatGPT", "Copilot", "Claude"];
type State = "new" | "idle" | "active" | "done";
export type P = { id: number; name: string; first: string; initials: string; dept: string; role: string; tool: string; course: string; progress: number; score: number | null; minutes: number; lastDays: number; invitedDays: number; state: State };
// Each department has its own adoption level, so the overview has something to say.
const deptBias: Record<string, number> = { salg: 0.72, kunde: 0.82, lager: 0.42, okonomi: 0.66, marketing: 0.9, ledelse: 0.5 };
export const people: P[] = DEPTS.flatMap((d) => Array.from({ length: d.n }, () => {
  const first = pick(FIRST), last = pick(LAST);
  const b = deptBias[d.id];
  const started = R() < b + 0.12;
  const progress = !started ? 0 : R() < b * 0.32 ? 100 : Math.max(5, Math.round(R() * 95));
  const lastDays = !started ? 99 : progress === 100 ? Math.floor(R() * 20) : R() < b ? Math.floor(R() * 3) : 4 + Math.floor(R() * 20);
  const minutes = lastDays <= 6 && progress < 100 ? 8 + Math.floor(R() * 70) : progress === 100 ? Math.floor(R() * 25) : 0;
  const state: State = progress === 0 ? "new" : progress === 100 ? "done" : lastDays > 3 ? "idle" : "active";
  return { id: 0, name: `${first} ${last}`, first, initials: `${first[0]}${last[0]}`, dept: d.id, role: pick([...d.roles]), tool: pick(TOOLS), course: pick(courses).title, progress, score: started ? 62 + Math.floor(R() * 36) : null, minutes, lastDays, invitedDays: 3 + Math.floor(R() * 40), state };
})).map((p, i) => ({ ...p, id: i + 1 }));

const deptName = (id: string) => DEPTS.find((d) => d.id === id)?.name ?? id;
const fmt = (min: number) => (min >= 60 ? `${Math.floor(min / 60).toLocaleString("da-DK")} t` : `${min} m`);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const count = (l: P[], s: State) => l.filter((p) => p.state === s).length;
const avg = (l: P[]) => { const s = l.filter((p) => p.score !== null); return s.length ? Math.round(s.reduce((a, p) => a + (p.score ?? 0), 0) / s.length) : 0; };
const lastLabel = (p: P) => (p.lastDays >= 99 ? "Aldrig" : p.lastDays === 0 ? "I dag" : p.lastDays === 1 ? "I går" : `${p.lastDays} dage siden`);
const STATE = {
  new: { t: "Ikke startet", c: "#7d6e68", bg: "#f3eeeb", bar: "#d9ccc5" },
  idle: { t: "Står stille", c: "#8a5a00", bg: "#fdf3dc", bar: AMBER },
  active: { t: "Øver", c: "#c4502f", bg: "#fdf0ea", bar: O },
  done: { t: "Færdig", c: "#2f8a5c", bg: "#e8f6ee", bar: GREEN },
} as const;

function Pill({ s }: { s: State }) {
  const x = STATE[s];
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: x.c, background: x.bg }}><i className="size-1.5 rounded-full" style={{ background: x.c }} />{x.t}</span>;
}
function Initials({ p, size = 30 }: { p: P; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold" style={{ width: size, height: size, fontSize: size * 0.36, background: STATE[p.state].bg, color: p.state === "new" ? INK : STATE[p.state].c }}>{p.initials}</span>;
}
function Split({ l, h = 10 }: { l: P[]; h?: number }) {
  return <div className="flex overflow-hidden rounded-full" style={{ height: h }}>{(["done", "active", "idle", "new"] as State[]).map((s) => { const n = count(l, s); return n ? <span key={s} title={`${STATE[s].t}: ${n}`} style={{ width: `${(n / l.length) * 100}%`, background: STATE[s].bar }} /> : null; })}</div>;
}

// ——— Bulk Skub ———
function useBulk() {
  const [target, setTarget] = useState<{ label: string; list: P[] } | null>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const send = () => {
    if (!target) return;
    setSent((s) => new Set([...s, ...target.list.map((p) => p.id)]));
    setToast(`Skub sendt til ${target.list.length} ${target.list.length === 1 ? "person" : "personer"}`);
    setTarget(null);
    setTimeout(() => setToast(null), 2800);
  };
  return { target, setTarget, sent, send, toast };
}
type Bulk = ReturnType<typeof useBulk>;

function BulkDialog({ b }: { b: Bulk }) {
  const t = b.target;
  const [text, setText] = useState("");
  const [mail, setMail] = useState(true);
  const [forLabel, setForLabel] = useState<string | null>(null);
  if (t && forLabel !== t.label) {
    setForLabel(t.label);
    setMail(true);
    setText(t.list.every((p) => p.state === "new") ? "Hej {fornavn}. Dit første kursus starter med en lektion på 10 minutter. Tag den, når du har en pause i dag." : "Hej {fornavn}. Du er godt i gang med dit kursus. Næste lektion tager 10 minutter. Tag den, før ugen er gået.");
  }
  return (
    <>
      {t && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#201613]/40 p-4 backdrop-blur-[2px]" onClick={() => b.setTarget(null)}>
          <div role="dialog" aria-modal aria-label={`Skub ${t.label}`} className="w-full max-w-[500px] rounded-[18px] bg-white p-6 shadow-[0_30px_80px_-20px_rgba(32,22,19,.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full text-white" style={{ background: O }}><BellRingingIcon size={20} weight="fill" /></span>
              <div className="min-w-0 flex-1"><p className="text-[16px] font-semibold text-heading">Skub {t.list.length.toLocaleString("da-DK")} {t.list.length === 1 ? "person" : "personer"}</p><p className="text-[12px] text-muted">{t.label}</p></div>
              <button onClick={() => b.setTarget(null)} aria-label="Luk" className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#f3eeeb]"><XIcon size={15} /></button>
            </div>
            <div className="mt-4 flex -space-x-2">{t.list.slice(0, 8).map((p) => <span key={p.id} className="rounded-full ring-2 ring-white"><Initials p={p} size={30} /></span>)}{t.list.length > 8 && <span className="grid size-[30px] place-items-center rounded-full bg-[#201613] text-[10px] font-semibold text-white ring-2 ring-white">+{t.list.length - 8}</span>}</div>
            <label className="mt-5 block text-[12px] font-semibold text-heading" htmlFor="bulk-text">Besked</label>
            <textarea id="bulk-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1.5 w-full resize-none rounded-[12px] border border-[#ece4df] p-3 text-[13.5px] leading-[1.55] text-heading outline-none focus:border-[#201613]" />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><SparkleIcon size={12} weight="fill" style={{ color: O }} />{"{fornavn}"} skiftes ud med hver persons navn. Hver får sin egen besked.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-[12px] bg-[#f7f2ee] px-3.5 py-3">
              <span className="flex items-center gap-2 text-[13px] text-heading"><EnvelopeSimpleIcon size={16} />Send også på mail</span>
              <button type="button" role="switch" aria-checked={mail} onClick={() => setMail(!mail)} className="relative h-6 w-10 rounded-full transition" style={{ background: mail ? INK : "#d9ccc5" }}><span className="absolute top-0.5 size-5 rounded-full bg-white transition-all" style={{ left: mail ? 18 : 2 }} /></button>
            </label>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted"><LockSimpleIcon size={13} />Skubbet er privat. Ingen kan se, hvem ellers fik det.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => b.setTarget(null)} className="h-10 rounded-full px-4 text-[13px] font-medium text-heading hover:bg-[#f3eeeb]">Annuller</button>
              <button onClick={b.send} disabled={!text.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: O }}><BellRingingIcon size={14} weight="fill" />Send {t.list.length.toLocaleString("da-DK")} skub</button>
            </div>
          </div>
        </div>
      )}
      {b.toast && <div role="status" className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#201613] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]"><CheckIcon size={13} weight="bold" className="mr-1.5 inline" style={{ color: GREEN }} />{b.toast}</div>}
    </>
  );
}

function BulkBtn({ b, label, list, dark, small }: { b: Bulk; label: string; list: P[]; dark?: boolean; small?: boolean }) {
  const open = list.filter((p) => !b.sent.has(p.id));
  if (!list.length) return null;
  if (!open.length) return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 font-semibold ${small ? "h-7 text-[11px]" : "h-9 text-[12px]"}`} style={{ color: "#2f8a5c", background: dark ? "rgba(92,191,143,.15)" : "#e8f6ee" }}><CheckIcon size={12} weight="bold" />Skubbet</span>;
  return <button onClick={() => b.setTarget({ label, list: open })} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 font-semibold text-white transition hover:-translate-y-px ${small ? "h-7 text-[11px]" : "h-9 text-[12px]"}`} style={{ background: O }}><BellRingingIcon size={small ? 12 : 13} weight="fill" />Skub{list.length > 1 ? ` ${open.length.toLocaleString("da-DK")}` : ""}</button>;
}

function Header({ sub }: { sub?: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
      <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">Mit hold</h1><p className="mt-1.5 text-[12.5px] text-muted">{sub ?? `Nordlys Logistik · ${people.length.toLocaleString("da-DK")} medarbejdere i ${DEPTS.length} afdelinger`}</p></div>
      <div className="flex items-center gap-2"><Demo /><button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-medium text-heading hover:bg-[#f3eeeb]"><DownloadSimpleIcon size={14} />Eksportér</button><button className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-white" style={{ background: INK }}><UserPlusIcon size={14} />Inviter</button></div>
    </header>
  );
}

function Funnel({ l }: { l: P[] }) {
  const started = l.filter((p) => p.state !== "new").length;
  const weekly = l.filter((p) => p.state === "active").length + l.filter((p) => p.state === "done" && p.minutes > 0).length;
  const done = count(l, "done");
  const steps = [["Inviteret", l.length], ["Startet", started], ["Øver hver uge", weekly], ["Kursusbevis", done]] as const;
  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map(([t, n], i) => (
        <div key={t} className="min-w-0">
          <div className="flex h-[92px] items-end"><div className="w-full rounded-t-[10px]" style={{ height: `${Math.max(8, pct(n, l.length))}%`, background: i === 0 ? "#e9dfd9" : i === 3 ? GREEN : O, opacity: i === 1 ? 0.55 : 1 }} /></div>
          <p className="mt-2 text-[20px] font-semibold leading-none tracking-[-0.02em] text-heading">{n.toLocaleString("da-DK")}</p>
          <p className="mt-1 text-[11px] text-muted">{t} · {pct(n, l.length)}%</p>
        </div>
      ))}
    </div>
  );
}

// ——— G · Afdelinger ———
export function G() {
  const b = useBulk();
  const [open, setOpen] = useState<string | null>(null);
  const stuck = people.filter((p) => p.state === "new" || p.state === "idle");
  return (
    <div className="flex flex-col gap-3">
      <Header />
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className={`${card} p-[18px]`}>
          <div className="flex items-start justify-between"><div><h2 className="text-[15.5px] font-semibold text-heading">Fra invitation til bevis</h2><p className="text-[11.5px] text-muted">Hele virksomheden</p></div><span className="text-[11.5px] text-muted">Gns. score <b className="text-heading">{avg(people)}</b></span></div>
          <div className="mt-4"><Funnel l={people} /></div>
        </div>
        <div className="flex flex-col rounded-[16px] p-5 text-white" style={{ background: STAGE }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold"><WarningCircleIcon size={16} weight="fill" style={{ color: "#f6b49b" }} />{stuck.length} har brug for et skub</p>
          <p className="mt-0.5 text-[11.5px] text-white/55">{count(people, "new")} er ikke startet · {count(people, "idle")} står stille i mere end 3 dage</p>
          <div className="mt-4 grid gap-2">
            {[...DEPTS].map((d) => ({ d, l: stuck.filter((p) => p.dept === d.id) })).sort((a, z) => z.l.length - a.l.length).slice(0, 3).map(({ d, l }) => (
              <div key={d.id} className="flex items-center gap-3 rounded-[12px] bg-white/[0.06] px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{d.name}</span><span className="text-[12px] text-white/60">{l.length} personer</span><BulkBtn b={b} label={`${d.name}: ikke startet eller står stille`} list={l} dark small /></div>
            ))}
          </div>
          <div className="mt-auto pt-4"><BulkBtn b={b} label="Alle, der ikke er startet eller står stille" list={stuck} dark /></div>
        </div>
      </section>
      <section className={`${card} p-[18px]`}>
        <div className="flex items-center justify-between"><h2 className="text-[15.5px] font-semibold text-heading">Afdelinger</h2><div className="flex flex-wrap gap-3 text-[11px] text-muted">{(["done", "active", "idle", "new"] as State[]).map((s) => <span key={s} className="flex items-center gap-1"><i className="size-2 rounded-full" style={{ background: STATE[s].bar }} />{STATE[s].t}</span>)}</div></div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted"><tr className="border-b" style={{ borderColor: LINE }}><th className="py-2.5 pl-2 font-semibold">Afdeling</th><th className="font-semibold">Personer</th><th className="w-[30%] font-semibold">Status</th><th className="font-semibold">I gang</th><th className="font-semibold">Gns. score</th><th className="font-semibold">Øvetid / uge</th><th className="pr-2" /></tr></thead>
            <tbody>
              {DEPTS.map((d) => {
                const l = people.filter((p) => p.dept === d.id);
                const st = l.filter((p) => p.state === "new" || p.state === "idle");
                const isOpen = open === d.id;
                const adoption = pct(l.length - count(l, "new"), l.length);
                return (
                  <Fragment key={d.id}>
                    <tr onClick={() => setOpen(isOpen ? null : d.id)} className={`cursor-pointer border-b text-[12.5px] transition ${isOpen ? "bg-[#fbf6f3]" : "hover:bg-[#fbf8f6]"}`} style={{ borderColor: LINE }}>
                      <td className="py-3.5 pl-2"><span className="flex items-center gap-2 font-semibold text-heading">{isOpen ? <CaretUpIcon size={13} /> : <CaretDownIcon size={13} />}{d.name}</span></td>
                      <td className="tabular-nums text-heading">{l.length}</td>
                      <td className="pr-6"><Split l={l} /></td>
                      <td><span className={`font-semibold tabular-nums ${adoption < 60 ? "text-[#c4502f]" : "text-heading"}`}>{adoption}%</span></td>
                      <td className="font-semibold tabular-nums text-heading">{avg(l)}</td>
                      <td className="tabular-nums text-heading">{fmt(l.reduce((a, p) => a + p.minutes, 0))}</td>
                      <td className="pr-2 text-right" onClick={(e) => e.stopPropagation()}><BulkBtn b={b} label={`${d.name}: ikke startet eller står stille`} list={st} small /></td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b" style={{ borderColor: LINE }}>
                        <td colSpan={7} className="bg-[#fbf6f3] px-4 pb-4 pt-1">
                          <p className="mb-2 text-[11.5px] text-muted">De {Math.min(8, st.length)} der har stået længst stille i {d.name}</p>
                          <ul className="grid gap-1.5 sm:grid-cols-2">
                            {[...st].sort((a, z) => (z.state === "new" ? z.invitedDays : z.lastDays) - (a.state === "new" ? a.invitedDays : a.lastDays)).slice(0, 8).map((p) => (
                              <li key={p.id} className="flex items-center gap-2.5 rounded-[10px] bg-white px-3 py-2"><Initials p={p} /><span className="min-w-0 flex-1"><b className="block truncate text-[12.5px] font-semibold text-heading">{p.name}</b><small className="text-[11px] text-muted">{p.role} · {p.state === "new" ? `inviteret for ${p.invitedDays} dage siden` : `sidst aktiv ${lastLabel(p).toLowerCase()}`}</small></span><Pill s={p.state} /></li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <BulkDialog b={b} />
    </div>
  );
}

// ——— H · Liste ———
function Th({ k, sort, setSort, children, className = "" }: { k: SortKey; sort: { k: SortKey; dir: 1 | -1 }; setSort: (s: { k: SortKey; dir: 1 | -1 }) => void; children: React.ReactNode; className?: string }) {
  return (
    <th className={`font-semibold ${className}`}><button onClick={() => setSort({ k, dir: sort.k === k ? (sort.dir === 1 ? -1 : 1) : -1 })} className="inline-flex items-center gap-1 uppercase hover:text-heading">{children}{sort.k === k && (sort.dir === 1 ? <CaretUpIcon size={11} /> : <CaretDownIcon size={11} />)}</button></th>
  );
}
type SortKey = "name" | "progress" | "score" | "lastDays";
const PAGE = 25;
export function H() {
  const b = useBulk();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("alle");
  const [state, setState] = useState<State | "alle">("alle");
  const [tool, setTool] = useState("alle");
  const [sort, setSort] = useState<{ k: SortKey; dir: 1 | -1 }>({ k: "lastDays", dir: -1 });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return people
      .filter((p) => (!n || p.name.toLowerCase().includes(n) || p.role.toLowerCase().includes(n)) && (dept === "alle" || p.dept === dept) && (state === "alle" || p.state === state) && (tool === "alle" || p.tool === tool))
      .sort((a, z) => { const x = a[sort.k] ?? -1, y = z[sort.k] ?? -1; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
  }, [q, dept, state, tool, sort]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const p0 = Math.min(page, pages - 1);
  const rows = list.slice(p0 * PAGE, p0 * PAGE + PAGE);
  const allOnPage = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const reset = () => setPage(0);

  const chips: [State | "alle", string, number][] = [["alle", "Alle", people.length], ["new", "Ikke startet", count(people, "new")], ["idle", "Står stille", count(people, "idle")], ["active", "Øver", count(people, "active")], ["done", "Færdige", count(people, "done")]];
  const selected = people.filter((p) => sel.has(p.id));
  return (
    <div className="flex flex-col gap-3 lg:h-[max(600px,calc(100svh-5.9rem))]">
      <Header />
      <section className="flex flex-wrap gap-2">
        {chips.map(([k, t, n]) => <button key={k} onClick={() => { setState(k); reset(); }} aria-pressed={state === k} className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-medium transition ${state === k ? "bg-[#201613] text-white" : "bg-white text-heading hover:bg-[#f3eeeb]"}`}>{k !== "alle" && <i className="size-2 rounded-full" style={{ background: STATE[k as State].bar }} />}{t}<span className={`tabular-nums ${state === k ? "text-white/60" : "text-muted"}`}>{n}</span></button>)}
      </section>
      <section className={`${card} flex min-h-0 flex-1 flex-col p-[18px] pb-3`}>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1"><span className="sr-only">Søg</span><MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder={`Søg blandt ${people.length} personer …`} className="h-9 w-full rounded-[10px] border border-[#ece4df] pl-9 pr-3 text-[12.5px] outline-none focus:border-[#201613]" /></label>
          {[["Afdeling", dept, setDept, [["alle", "Alle afdelinger"], ...DEPTS.map((d) => [d.id, d.name])]], ["Værktøj", tool, setTool, [["alle", "Alle værktøjer"], ...TOOLS.map((t) => [t, t])]]].map(([label, val, set, opts]) => (
            <label key={label as string} className="relative"><span className="sr-only">{label as string}</span><select value={val as string} onChange={(e) => { (set as (v: string) => void)(e.target.value); reset(); }} className="h-9 appearance-none rounded-[10px] border border-[#ece4df] bg-white pl-3 pr-8 text-[12.5px] font-medium text-heading outline-none">{(opts as string[][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select><CaretDownIcon size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" /></label>
          ))}
          <span className="ml-auto text-[12px] tabular-nums text-muted">{list.length.toLocaleString("da-DK")} personer</span>
        </div>
        {sel.size > 0 && (
          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-white" style={{ background: INK }}>
            <span className="text-[13px] font-semibold">{sel.size} valgt</span>
            <button onClick={() => setSel(new Set())} className="text-[12px] text-white/60 underline underline-offset-4 hover:text-white">Fravælg</button>
            <span className="ml-auto flex gap-2">
              <button className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/10 px-3 text-[12px] font-medium hover:bg-white/15"><DownloadSimpleIcon size={13} />Eksportér</button>
              <BulkBtn b={b} label={`${sel.size} valgte personer`} list={selected} dark small />
            </span>
          </div>
        )}
        <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain">
          <table className="w-full min-w-[880px] text-left">
            <thead className="sticky top-0 z-[1] bg-white text-[10.5px] tracking-[0.07em] text-muted"><tr className="border-b" style={{ borderColor: LINE }}>
              <th className="w-10 py-2.5 pl-2"><input type="checkbox" aria-label="Vælg alle på siden" checked={allOnPage} onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n; })} className="size-4 accent-[#201613]" /></th>
              <Th k="name" sort={sort} setSort={setSort}>Navn</Th><th className="font-semibold uppercase">Afdeling</th><th className="font-semibold uppercase">Status</th><Th k="progress" sort={sort} setSort={setSort}>Fremskridt</Th><Th k="score" sort={sort} setSort={setSort} className="text-right">Score</Th><Th k="lastDays" sort={sort} setSort={setSort} className="pl-6">Sidst aktiv</Th><th className="pr-2" />
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={`border-b text-[12.5px] last:border-0 ${sel.has(p.id) ? "bg-[#fbf6f3]" : "hover:bg-[#fbf8f6]"}`} style={{ borderColor: LINE }}>
                  <td className="py-2.5 pl-2"><input type="checkbox" aria-label={`Vælg ${p.name}`} checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="size-4 accent-[#201613]" /></td>
                  <td><span className="flex items-center gap-2.5"><Initials p={p} /><span className="min-w-0"><b className="block truncate font-semibold text-heading">{p.name}</b><small className="text-[11px] text-muted">{p.role} · {p.tool}</small></span></span></td>
                  <td className="text-heading">{deptName(p.dept)}</td>
                  <td><Pill s={p.state} /></td>
                  <td><span className="flex items-center gap-2"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${p.progress}%`, background: STATE[p.state].bar }} /></span><small className="w-8 text-[11px] tabular-nums text-muted">{p.progress}%</small></span></td>
                  <td className="text-right font-semibold tabular-nums text-heading">{p.score ?? "–"}</td>
                  <td className={`pl-6 tabular-nums ${p.lastDays > 3 && p.lastDays < 99 ? "font-semibold text-[#8a5a00]" : "text-muted"}`}>{lastLabel(p)}</td>
                  <td className="pr-2 text-right">{(p.state === "new" || p.state === "idle") && <BulkBtn b={b} label={p.name} list={[p]} small />}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-[13px] text-muted">Ingen passer til filtrene.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t pt-3 text-[12px] text-muted" style={{ borderColor: LINE }}>
          <span className="tabular-nums">Viser {list.length ? p0 * PAGE + 1 : 0}–{Math.min(list.length, (p0 + 1) * PAGE)} af {list.length.toLocaleString("da-DK")}</span>
          <span className="flex items-center gap-1">
            <button disabled={p0 === 0} onClick={() => setPage(p0 - 1)} className="h-8 rounded-[8px] px-3 font-medium text-heading hover:bg-[#f3eeeb] disabled:opacity-30">Forrige</button>
            <span className="px-2 tabular-nums">Side {p0 + 1} af {pages}</span>
            <button disabled={p0 >= pages - 1} onClick={() => setPage(p0 + 1)} className="h-8 rounded-[8px] px-3 font-medium text-heading hover:bg-[#f3eeeb] disabled:opacity-30">Næste</button>
          </span>
        </div>
      </section>
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-kf]) { padding-bottom: 0; } [data-kf] { padding-bottom: 0 !important; } }`}</style>
      <BulkDialog b={b} />
    </div>
  );
}

// ——— I · Opmærksomhed ———
export function I() {
  const b = useBulk();
  const groups = [
    { t: "Ikke startet efter 14 dage", d: "Fik invitationen for over to uger siden og har ikke åbnet kurset", l: people.filter((p) => p.state === "new" && p.invitedDays > 14), tone: "#7d6e68" },
    { t: "Gået i stå midt i kurset", d: "Mere end halvvejs, men ingen øvetid i over en uge", l: people.filter((p) => p.state === "idle" && p.progress >= 50 && p.lastDays > 7), tone: AMBER },
    { t: "Ledere uden aktivitet", d: "Ledere, der ikke selv har øvet. Holdet følger lederen", l: people.filter((p) => (p.dept === "ledelse" || /leder|chef/i.test(p.role)) && (p.state === "new" || p.state === "idle")), tone: O },
    { t: "Lav score i øvemiljøet", d: "Gennemsnit under 70. Kan bruge et ekstra kursus eller en snak", l: people.filter((p) => p.score !== null && p.score < 70 && p.state !== "done"), tone: "#b3261e" },
  ];
  const buckets = Array.from({ length: 10 }, (_, i) => people.filter((p) => p.progress >= i * 10 && (i === 9 ? p.progress <= 100 : p.progress < i * 10 + 10)).length);
  const top = [...people].filter((p) => p.score !== null).sort((a, z) => (z.score ?? 0) - (a.score ?? 0) || z.progress - a.progress).slice(0, 5);
  const weeks = ["Uge 40", "Uge 41", "Uge 42", "Uge 43", "Uge 44", "Uge 45"];
  return (
    <div className="flex flex-col gap-3">
      <Header />
      <section className="rounded-[16px] p-6 text-white xl:p-7" style={{ background: STAGE }}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">Kræver opmærksomhed</p><h2 className="mt-2 text-[34px] font-bold leading-[1] tracking-[-0.03em] !text-white">4 grupper, {new Set(groups.flatMap((g) => g.l.map((p) => p.id))).size} personer</h2><p className="mt-2 text-[13px] text-white/60">Resten af holdet kører. Det her er der, hvor et skub flytter mest.</p></div>
          <span className="rounded-[4px] border border-dashed border-white/25 px-1.5 py-px text-[10px] text-white/55">Eksempeldata</span>
        </div>
        <ul className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {groups.map((g) => (
            <li key={g.t} className="flex flex-col rounded-[14px] bg-white/[0.06] p-4">
              <span className="flex items-center gap-2"><i className="size-2.5 rounded-full" style={{ background: g.tone }} /><span className="text-[34px] font-semibold leading-none tracking-[-0.04em]">{g.l.length}</span></span>
              <p className="mt-3 text-[14px] font-semibold leading-tight">{g.t}</p>
              <p className="mt-1 text-[11.5px] leading-snug text-white/55">{g.d}</p>
              <div className="mt-3 flex -space-x-1.5">{g.l.slice(0, 6).map((p) => <span key={p.id} className="grid size-7 place-items-center rounded-full bg-white/15 text-[9.5px] font-semibold ring-2 ring-[#2a1d19]">{p.initials}</span>)}{g.l.length > 6 && <span className="grid size-7 place-items-center rounded-full bg-white text-[9.5px] font-semibold text-[#201613] ring-2 ring-[#2a1d19]">+{g.l.length - 6}</span>}</div>
              <div className="mt-auto pt-4"><BulkBtn b={b} label={g.t} list={g.l} dark /></div>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-3 xl:grid-cols-3">
        <div className={`${card} p-[18px]`}>
          <h2 className="text-[15.5px] font-semibold text-heading">Hvor langt er folk</h2>
          <p className="text-[11.5px] text-muted">Antal personer pr. 10 % fremskridt</p>
          <div className="mt-4 flex h-[130px] items-end gap-1.5">{buckets.map((n, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><span className="text-[10px] font-semibold tabular-nums text-heading">{n}</span><i className="w-full rounded-t-[5px]" style={{ height: `${Math.max(3, (n / Math.max(...buckets)) * 100)}px`, background: i === 0 ? "#d9ccc5" : i === 9 ? GREEN : O }} /></div>)}</div>
          <div className="mt-1.5 flex justify-between text-[10px] text-muted"><span>0 %</span><span>50 %</span><span>100 %</span></div>
        </div>
        <div className={`${card} p-[18px]`}>
          <h2 className="text-[15.5px] font-semibold text-heading">Aktivitet pr. afdeling</h2>
          <p className="text-[11.5px] text-muted">Andel der øvede hver uge</p>
          <table className="mt-3 w-full table-fixed border-separate border-spacing-[3px]">
            <thead><tr><th className="w-[38%]" />{weeks.map((w) => <th key={w} className="text-[9.5px] font-medium text-muted">{w.replace("Uge ", "")}</th>)}</tr></thead>
            <tbody>{DEPTS.map((d, di) => (<tr key={d.id}><td className="truncate pr-1 text-[11.5px] font-medium text-heading">{d.name}</td>{weeks.map((w, wi) => { const v = Math.min(95, Math.max(8, Math.round(deptBias[d.id] * 80 + (wi - 2) * 4 + ((di * 7 + wi * 3) % 9) - 4))); return <td key={w}><span title={`${d.name}, ${w}: ${v}%`} className="grid h-7 place-items-center rounded-[6px] text-[9.5px] font-semibold tabular-nums" style={{ background: `rgba(226,100,63,${0.12 + (v / 100) * 0.88})`, color: v > 55 ? "#fff" : "#8a3a22" }}>{v}</span></td>; })}</tr>))}</tbody>
          </table>
        </div>
        <div className={`${card} p-[18px]`}>
          <div className="flex items-start justify-between"><div><h2 className="text-[15.5px] font-semibold text-heading">Går foran</h2><p className="text-[11.5px] text-muted">Højeste score. Gode at dele eksempler fra</p></div><SealCheckIcon size={18} weight="fill" style={{ color: O }} /></div>
          <ol className="mt-3 grid gap-1">{top.map((p, i) => <li key={p.id} className="flex items-center gap-2.5 rounded-[10px] px-2 py-2 hover:bg-[#fbf8f6]"><span className="w-4 text-center text-[12px] font-bold tabular-nums" style={{ color: O }}>{i + 1}</span><Initials p={p} /><span className="min-w-0 flex-1"><b className="block truncate text-[12.5px] font-semibold text-heading">{p.name}</b><small className="text-[11px] text-muted">{deptName(p.dept)}</small></span><b className="text-[13px] tabular-nums text-heading">{p.score}</b></li>)}</ol>
          <button className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-heading">Se hele listen <ArrowRightIcon size={12} /></button>
        </div>
      </section>
      <BulkDialog b={b} />
    </div>
  );
}
