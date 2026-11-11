"use client";
// Mit hold, version H "Liste" (Marco 2026-11-03: "H er klart bedst"; built for up to 400 people), ported 1:1 to /hold.
// A real people table: search, filters, sort, select many, bulk Skub, pagination; only the table scrolls.
// Real data: the company's active employees (status, best score, last activity, forløb progress, job role as
// department, assigned tool). Never answers or prompt texts. "Skub" has no backend yet: the dialog and the toast are
// example behaviour (marked "Eksempeldata"); nothing is sent.
import Link from "next/link";
import { useMemo, useState } from "react";
import { BellRingingIcon, CaretDownIcon, CaretUpIcon, CheckIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, LockSimpleIcon, MagnifyingGlassIcon, SparkleIcon, UserPlusIcon, XIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/platform/ui";

const O = "var(--pf-e2643f)", GREEN = "var(--pf-5cbf8f)", AMBER = "var(--pf-f0b03c)", INK = "var(--pf-201613)", LINE = "var(--pf-f1e9e4)";
const card = "relative min-w-0 rounded-[16px] bg-pf-white";

export type State = "new" | "idle" | "active" | "done";
export type P = { id: number; name: string; first: string; initials: string; dept: string; role: string; tool: string; progress: number; score: number | null; lastDays: number; state: State };
export interface Dept {
  id: string;
  name: string;
}

const count = (l: P[], s: State) => l.filter((p) => p.state === s).length;
const lastLabel = (p: P) => (p.lastDays >= 99 ? "Aldrig" : p.lastDays === 0 ? "I dag" : p.lastDays === 1 ? "I går" : `${p.lastDays} dage siden`);
const STATE = {
  new: { t: "Ikke startet", c: "var(--pf-7d6e68)", bg: "var(--pf-f3eeeb)", bar: "var(--pf-d9ccc5)" },
  idle: { t: "Står stille", c: "var(--pf-8a5a00)", bg: "var(--pf-fdf3dc)", bar: AMBER },
  active: { t: "Øver", c: "var(--pf-c4502f)", bg: "var(--pf-fdf0ea)", bar: O },
  done: { t: "Færdig", c: "var(--pf-2f8a5c)", bg: "var(--pf-e8f6ee)", bar: GREEN },
} as const;

function Pill({ s }: { s: State }) {
  const x = STATE[s];
  return <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: x.c, background: x.bg }}><i className="size-1.5 rounded-full" style={{ background: x.c }} />{x.t}</span>;
}
function Initials({ p, size = 30 }: { p: P; size?: number }) {
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold" style={{ width: size, height: size, fontSize: size * 0.36, background: STATE[p.state].bg, color: p.state === "new" ? INK : STATE[p.state].c }}>{p.initials}</span>;
}
// ——— Bulk Skub ———
function useBulk() {
  const [target, setTarget] = useState<{ label: string; list: P[] } | null>(null);
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const send = () => {
    if (!target) return;
    setSent((s) => new Set([...s, ...target.list.map((p) => p.id)]));
    setToast(`Eksempel: skub til ${target.list.length} ${target.list.length === 1 ? "person" : "personer"} (intet sendt)`);
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
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[var(--pf-201613)]/40 p-4 backdrop-blur-[2px]" onClick={() => b.setTarget(null)}>
          <div role="dialog" aria-modal aria-label={`Skub ${t.label}`} className="w-full max-w-[500px] rounded-[18px] bg-pf-white p-6 shadow-[0_30px_80px_-20px_rgba(32,22,19,.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-full text-pf-white" style={{ background: O }}><BellRingingIcon size={20} weight="fill" /></span>
              <div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-[16px] font-semibold text-heading">Skub {t.list.length.toLocaleString("da-DK")} {t.list.length === 1 ? "person" : "personer"} <Demo /></p><p className="text-[12px] text-pf-muted">{t.label}</p></div>
              <button onClick={() => b.setTarget(null)} aria-label="Luk" className="grid size-8 place-items-center rounded-full text-pf-muted hover:bg-[var(--pf-f3eeeb)]"><XIcon size={15} /></button>
            </div>
            <div className="mt-4 flex -space-x-2">{t.list.slice(0, 8).map((p) => <span key={p.id} className="rounded-full ring-2 ring-pf-white"><Initials p={p} size={30} /></span>)}{t.list.length > 8 && <span className="grid size-[30px] place-items-center rounded-full bg-[var(--pf-201613)] text-[10px] font-semibold text-pf-white ring-2 ring-pf-white">+{t.list.length - 8}</span>}</div>
            <label className="mt-5 block text-[12px] font-semibold text-heading" htmlFor="bulk-text">Besked</label>
            <textarea id="bulk-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1.5 w-full resize-none rounded-[12px] border border-[var(--pf-ece4df)] p-3 text-[13.5px] leading-[1.55] text-heading outline-none focus:border-[var(--pf-201613)]" />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-pf-muted"><SparkleIcon size={12} weight="fill" style={{ color: O }} />{"{fornavn}"} skiftes ud med hver persons navn. Hver får sin egen besked.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-[12px] bg-[var(--pf-f7f2ee)] px-3.5 py-3">
              <span className="flex items-center gap-2 text-[13px] text-heading"><EnvelopeSimpleIcon size={16} />Send også på mail</span>
              <button type="button" role="switch" aria-checked={mail} onClick={() => setMail(!mail)} className="relative h-6 w-10 rounded-full transition" style={{ background: mail ? INK : "var(--pf-d9ccc5)" }}><span className="absolute top-0.5 size-5 rounded-full bg-pf-white transition-all" style={{ left: mail ? 18 : 2 }} /></button>
            </label>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-pf-muted"><LockSimpleIcon size={13} />Skubbet er privat. Ingen kan se, hvem ellers fik det.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => b.setTarget(null)} className="h-10 rounded-full px-4 text-[13px] font-medium text-heading hover:bg-[var(--pf-f3eeeb)]">Annuller</button>
              <button onClick={b.send} disabled={!text.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold text-pf-white disabled:opacity-40" style={{ background: O }}><BellRingingIcon size={14} weight="fill" />Send {t.list.length.toLocaleString("da-DK")} skub</button>
            </div>
          </div>
        </div>
      )}
      {b.toast && <div role="status" className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[var(--pf-201613)] px-4 py-2.5 text-[13px] font-medium text-pf-white shadow-[0_12px_32px_rgba(32,22,19,.35)]"><CheckIcon size={13} weight="bold" className="mr-1.5 inline" style={{ color: GREEN }} />{b.toast}</div>}
    </>
  );
}

function BulkBtn({ b, label, list, dark, small }: { b: Bulk; label: string; list: P[]; dark?: boolean; small?: boolean }) {
  const open = list.filter((p) => !b.sent.has(p.id));
  if (!list.length) return null;
  if (!open.length) return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 font-semibold ${small ? "h-7 text-[11px]" : "h-9 text-[12px]"}`} style={{ color: "var(--pf-2f8a5c)", background: dark ? "var(--pf-rgba-92-191-143-15)" : "var(--pf-e8f6ee)" }}><CheckIcon size={12} weight="bold" />Skubbet</span>;
  return <button onClick={() => b.setTarget({ label, list: open })} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 font-semibold text-pf-white transition hover:-translate-y-px ${small ? "h-7 text-[11px]" : "h-9 text-[12px]"}`} style={{ background: O }}><BellRingingIcon size={small ? 12 : 13} weight="fill" />Skub{list.length > 1 ? ` ${open.length.toLocaleString("da-DK")}` : ""}</button>;
}

function Header({ sub }: { sub: string }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
      <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">Mit hold</h1><p className="mt-1.5 text-[12.5px] text-pf-muted">{sub}</p></div>
      <div className="flex items-center gap-2"><Link href="/virksomhed/rapport" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-pf-white px-3.5 text-[12.5px] font-medium text-heading hover:bg-[var(--pf-f3eeeb)]"><DownloadSimpleIcon size={14} />Eksportér</Link><Link href="/virksomhed/medarbejdere" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-pf-white" style={{ background: INK }}><UserPlusIcon size={14} />Inviter</Link></div>
    </header>
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
export function HoldListe({ people, depts, tools, orgName }: { people: P[]; depts: Dept[]; tools: string[]; orgName: string }) {
  const deptName = (id: string) => depts.find((d) => d.id === id)?.name ?? id;
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
  }, [people, q, dept, state, tool, sort]);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const p0 = Math.min(page, pages - 1);
  const rows = list.slice(p0 * PAGE, p0 * PAGE + PAGE);
  const allOnPage = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggle = (id: number) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const reset = () => setPage(0);

  const chips: [State | "alle", string, number][] = [["alle", "Alle", people.length], ["new", "Ikke startet", count(people, "new")], ["idle", "Står stille", count(people, "idle")], ["active", "Øver", count(people, "active")], ["done", "Færdige", count(people, "done")]];
  const selected = people.filter((p) => sel.has(p.id));
  return (
    <div data-pf-fill className="flex flex-col gap-3 lg:h-[max(600px,calc(100svh-5.9rem))]">
      <Header sub={`${orgName} · ${people.length.toLocaleString("da-DK")} ${people.length === 1 ? "medarbejder" : "medarbejdere"} i ${depts.length} ${depts.length === 1 ? "afdeling" : "afdelinger"}`} />
      <section className="flex flex-wrap gap-2">
        {chips.map(([k, t, n]) => <button key={k} onClick={() => { setState(k); reset(); }} aria-pressed={state === k} className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[12.5px] font-medium transition ${state === k ? "bg-[var(--pf-201613)] text-pf-white" : "bg-pf-white text-heading hover:bg-[var(--pf-f3eeeb)]"}`}>{k !== "alle" && <i className="size-2 rounded-full" style={{ background: STATE[k as State].bar }} />}{t}<span className={`tabular-nums ${state === k ? "text-pf-white/60" : "text-pf-muted"}`}>{n}</span></button>)}
      </section>
      <section className={`${card} flex min-h-0 flex-1 flex-col p-[18px] pb-3`}>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="relative min-w-[220px] flex-1"><span className="sr-only">Søg</span><MagnifyingGlassIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pf-muted" /><input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder={`Søg blandt ${people.length} personer …`} className="h-9 w-full rounded-[10px] border border-[var(--pf-ece4df)] pl-9 pr-3 text-[12.5px] outline-none focus:border-[var(--pf-201613)]" /></label>
          {[["Afdeling", dept, setDept, [["alle", "Alle afdelinger"], ...depts.map((d) => [d.id, d.name])]], ["Værktøj", tool, setTool, [["alle", "Alle værktøjer"], ...tools.map((t) => [t, t])]]].map(([label, val, set, opts]) => (
            <label key={label as string} className="relative"><span className="sr-only">{label as string}</span><select value={val as string} onChange={(e) => { (set as (v: string) => void)(e.target.value); reset(); }} className="h-9 appearance-none rounded-[10px] border border-[var(--pf-ece4df)] bg-pf-white pl-3 pr-8 text-[12.5px] font-medium text-heading outline-none">{(opts as string[][]).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select><CaretDownIcon size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-pf-muted" /></label>
          ))}
          <span className="ml-auto text-[12px] tabular-nums text-pf-muted">{list.length.toLocaleString("da-DK")} personer</span>
        </div>
        {sel.size > 0 && (
          <div className="mt-3 flex shrink-0 flex-wrap items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-pf-white" style={{ background: INK }}>
            <span className="text-[13px] font-semibold">{sel.size} valgt</span>
            <button onClick={() => setSel(new Set())} className="text-[12px] text-pf-white/60 underline underline-offset-4 hover:text-pf-white">Fravælg</button>
            <span className="ml-auto flex gap-2">
              <Link href="/virksomhed/rapport" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-pf-white/10 px-3 text-[12px] font-medium hover:bg-pf-white/15"><DownloadSimpleIcon size={13} />Eksportér</Link>
              <BulkBtn b={b} label={`${sel.size} valgte personer`} list={selected} dark small />
            </span>
          </div>
        )}
        <div className="mt-3 min-h-0 flex-1 overflow-auto overscroll-contain">
          <table className="w-full min-w-[880px] text-left">
            <thead className="sticky top-0 z-[1] bg-pf-white text-[10.5px] tracking-[0.07em] text-pf-muted"><tr className="border-b" style={{ borderColor: LINE }}>
              <th className="w-10 py-2.5 pl-2"><input type="checkbox" aria-label="Vælg alle på siden" checked={allOnPage} onChange={() => setSel((s) => { const n = new Set(s); rows.forEach((r) => (allOnPage ? n.delete(r.id) : n.add(r.id))); return n; })} className="size-4 accent-[var(--pf-201613)]" /></th>
              <Th k="name" sort={sort} setSort={setSort}>Navn</Th><th className="font-semibold uppercase">Afdeling</th><th className="font-semibold uppercase">Status</th><Th k="progress" sort={sort} setSort={setSort}>Fremskridt</Th><Th k="score" sort={sort} setSort={setSort} className="text-right">Score</Th><Th k="lastDays" sort={sort} setSort={setSort} className="pl-6">Sidst aktiv</Th><th className="pr-2" />
            </tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={`border-b text-[12.5px] last:border-0 ${sel.has(p.id) ? "bg-[var(--pf-fbf6f3)]" : "hover:bg-[var(--pf-fbf8f6)]"}`} style={{ borderColor: LINE }}>
                  <td className="py-2.5 pl-2"><input type="checkbox" aria-label={`Vælg ${p.name}`} checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="size-4 accent-[var(--pf-201613)]" /></td>
                  <td><span className="flex items-center gap-2.5"><Initials p={p} /><span className="min-w-0"><b className="block truncate font-semibold text-heading">{p.name}</b><small className="text-[11px] text-pf-muted">{p.role} · {p.tool}</small></span></span></td>
                  <td className="text-heading">{deptName(p.dept)}</td>
                  <td><Pill s={p.state} /></td>
                  <td><span className="flex items-center gap-2"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--pf-f3eeeb)]"><span className="block h-full rounded-full" style={{ width: `${p.progress}%`, background: STATE[p.state].bar }} /></span><small className="w-8 text-[11px] tabular-nums text-pf-muted">{p.progress}%</small></span></td>
                  <td className="text-right font-semibold tabular-nums text-heading">{p.score ?? "–"}</td>
                  <td className={`pl-6 tabular-nums ${p.lastDays > 3 && p.lastDays < 99 ? "font-semibold text-[var(--pf-8a5a00)]" : "text-pf-muted"}`}>{lastLabel(p)}</td>
                  <td className="pr-2 text-right">{(p.state === "new" || p.state === "idle") && <BulkBtn b={b} label={p.name} list={[p]} small />}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-[13px] text-pf-muted">Ingen passer til filtrene.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex shrink-0 items-center justify-between border-t pt-3 text-[12px] text-pf-muted" style={{ borderColor: LINE }}>
          <span className="tabular-nums">Viser {list.length ? p0 * PAGE + 1 : 0}–{Math.min(list.length, (p0 + 1) * PAGE)} af {list.length.toLocaleString("da-DK")}</span>
          <span className="flex items-center gap-1">
            <button disabled={p0 === 0} onClick={() => setPage(p0 - 1)} className="h-8 rounded-[8px] px-3 font-medium text-heading hover:bg-[var(--pf-f3eeeb)] disabled:opacity-30">Forrige</button>
            <span className="px-2 tabular-nums">Side {p0 + 1} af {pages}</span>
            <button disabled={p0 >= pages - 1} onClick={() => setPage(p0 + 1)} className="h-8 rounded-[8px] px-3 font-medium text-heading hover:bg-[var(--pf-f3eeeb)] disabled:opacity-30">Næste</button>
          </span>
        </div>
      </section>
      <BulkDialog b={b} />
    </div>
  );
}
