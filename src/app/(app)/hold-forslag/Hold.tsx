"use client";
// Three versions of "Mit hold" (Marco 2026-11-03: "lav 3 versioner af mit hold siden, det skal virkelig også være høj
// kvalitet"). All include Marco's "Skub" idea (2026-11-02): the leader nudges someone who hasn't practised; the nudge
// is private between the two, can go by mail too, and the platform suggests who could use one.
// A Kort    — KPI row + member cards (TaskFlow reference) + suggested nudges on the side.
// B Tabel   — dense table with 7-day activity, a member drawer with profile + nudge composer (FlowAI / Linear).
// C Puls    — brown stage with the team score and status split, nudge list, ranking and an activity heatmap
//             (dark learning dashboards, Rangliste like the website's Holdet card).
// People are initials only; all numbers are example data.
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRightIcon, BellRingingIcon, CheckIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, LockSimpleIcon, SealCheckIcon, SparkleIcon, UserPlusIcon, XIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { courseBySlug, learner, team } from "@/content/platform";

export const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613", LINE = "#f1e9e4";
export const card = "relative min-w-0 rounded-[16px] bg-white";
export const STAGE = "linear-gradient(160deg, #33231f 0%, #201613 55%, #1a0f0c 100%)";
export const DAYS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

// Example activity per member (minutes practised per day this week) and AI tool.
const extra: Record<string, { week: number[]; tool: string; since?: string }> = {
  SL: { week: [12, 8, 0, 15, 10, 0, 0], tool: "ChatGPT" },
  MH: { week: [20, 15, 10, 0, 25, 0, 0], tool: "Copilot" },
  IB: { week: [10, 12, 14, 9, 11, 0, 0], tool: "ChatGPT" },
  JK: { week: [0, 0, 0, 0, 0, 0, 0], tool: "Copilot", since: "3 dage" },
  NV: { week: [0, 0, 0, 0, 0, 0, 0], tool: "Claude", since: "inviteret for 9 dage siden" },
  ED: { week: [15, 0, 20, 12, 0, 0, 0], tool: "Claude" },
};
export type M = (typeof team)[number] & { week: number[]; minutes: number; tool: string; since?: string; courseTitle: string; state: "done" | "active" | "idle" | "new" };
export const members: M[] = team.map((m) => {
  const e = extra[m.initials] ?? { week: [0, 0, 0, 0, 0, 0, 0], tool: "ChatGPT" };
  const minutes = e.week.reduce((a, b) => a + b, 0);
  const state = m.progress >= 100 ? "done" : m.progress === 0 ? "new" : minutes === 0 ? "idle" : "active";
  return { ...m, ...e, minutes, courseTitle: courseBySlug.get(m.course)?.title ?? m.course, state };
});
export const needsNudge = members.filter((m) => m.state === "idle" || m.state === "new");
export const fmt = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} t ${min % 60} m` : `${min} m`);
const scored = members.filter((m) => m.score !== null);
export const avgScore = Math.round(scored.reduce((s, m) => s + (m.score ?? 0), 0) / scored.length);
export const totalMin = members.reduce((s, m) => s + m.minutes, 0);
export const activeWeek = members.filter((m) => m.minutes > 0).length;
export const certs = members.filter((m) => m.state === "done").length;
export const stateLabel = { done: { t: "Færdig", c: "#2f8a5c", bg: "#e8f6ee" }, active: { t: "Øver", c: "#c4502f", bg: "#fdf0ea" }, idle: { t: "Står stille", c: "#8a5a00", bg: "#fdf3dc" }, new: { t: "Ikke startet", c: "#7d6e68", bg: "#f3eeeb" } } as const;

export function reasonFor(m: M) {
  return m.state === "new" ? `Ikke startet · ${m.since ?? ""}` : `Ingen øvetid i ${m.since ?? "en uge"} · ${m.progress}% af kurset`;
}
function draftFor(m: M) {
  const first = m.name.split(" ")[0];
  return m.state === "new"
    ? `Hej ${first}. Dit første kursus, ${m.courseTitle}, starter med en lektion på 10 minutter. Tag den, når du har en pause i dag.`
    : `Hej ${first}. Du er ${m.progress}% inde i ${m.courseTitle}. Næste lektion tager 10 minutter. Tag den, før ugen er gået.`;
}

export function Avatar({ m, size = 40, dark }: { m: M; size?: number; dark?: boolean }) {
  return (
    <span className="relative grid shrink-0 place-items-center rounded-full font-semibold" style={{ width: size, height: size, fontSize: size * 0.34, background: dark ? "rgba(255,255,255,.12)" : m.state === "done" ? "#e8f6ee" : m.state === "active" ? "#fdf0ea" : "#f3eeeb", color: dark ? "#fff" : m.state === "done" ? "#2f8a5c" : m.state === "active" ? "#c4502f" : INK }}>
      {m.initials}
      {m.minutes > 0 && m.last === "I dag" && <span className="absolute -bottom-px -right-px size-3 rounded-full border-2 border-white" style={{ background: GREEN }} />}
    </span>
  );
}

export function Pill({ m }: { m: M }) {
  const s = stateLabel[m.state];
  return <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: s.c, background: s.bg }}><i className="size-1.5 rounded-full" style={{ background: s.c }} />{s.t}</span>;
}

export function WeekBars({ week, h = 28, dark }: { week: number[]; h?: number; dark?: boolean }) {
  const max = 25;
  return (
    <span className="flex items-end gap-[3px]" style={{ height: h }} aria-label={`Øvetid denne uge: ${fmt(week.reduce((a, b) => a + b, 0))}`}>
      {week.map((v, i) => <i key={i} className="w-[6px] rounded-[2px]" style={{ height: v ? Math.max(4, (v / max) * h) : 3, background: v ? O : dark ? "rgba(255,255,255,.12)" : "#efe6e1" }} />)}
    </span>
  );
}

// ——— Skub: shared state + dialog ———
export function useSkub() {
  const [open, setOpen] = useState<M | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const send = (m: M) => { setSent((s) => ({ ...s, [m.initials]: true })); setOpen(null); setToast(`Skub sendt til ${m.name.split(" ")[0]}`); setTimeout(() => setToast(null), 2600); };
  return { open, setOpen, sent, send, toast };
}
type Skub = ReturnType<typeof useSkub>;

export function SkubButton({ m, s, dark, wide }: { m: M; s: Skub; dark?: boolean; wide?: boolean }) {
  if (s.sent[m.initials]) return <span className={`inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[11.5px] font-semibold ${wide ? "w-full" : ""}`} style={{ color: "#2f8a5c", background: dark ? "rgba(92,191,143,.15)" : "#e8f6ee" }}><CheckIcon size={12} weight="bold" />Skubbet i dag</span>;
  return <button onClick={() => s.setOpen(m)} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3.5 text-[11.5px] font-semibold text-white transition hover:-translate-y-px ${wide ? "w-full" : ""}`} style={{ background: O }}><BellRingingIcon size={13} weight="fill" />Skub</button>;
}

export function SkubDialog({ s }: { s: Skub }) {
  const m = s.open;
  const [text, setText] = useState("");
  const [mail, setMail] = useState(true);
  const [forId, setForId] = useState<string | null>(null);
  if (m && forId !== m.initials) { setForId(m.initials); setText(draftFor(m)); setMail(true); }
  return (
    <>
      {m && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#201613]/40 p-4 backdrop-blur-[2px]" onClick={() => s.setOpen(null)}>
          <div role="dialog" aria-modal aria-label={`Skub ${m.name}`} className="w-full max-w-[460px] rounded-[18px] bg-white p-6 shadow-[0_30px_80px_-20px_rgba(32,22,19,.5)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <Avatar m={m} size={44} />
              <div className="min-w-0 flex-1"><p className="text-[16px] font-semibold text-heading">Skub {m.name.split(" ")[0]}</p><p className="text-[12px] text-muted">{reasonFor(m)}</p></div>
              <button onClick={() => s.setOpen(null)} aria-label="Luk" className="grid size-8 place-items-center rounded-full text-muted hover:bg-[#f3eeeb]"><XIcon size={15} /></button>
            </div>
            <label className="mt-5 block text-[12px] font-semibold text-heading" htmlFor="skub-text">Din besked</label>
            <textarea id="skub-text" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-1.5 w-full resize-none rounded-[12px] border border-[#ece4df] p-3 text-[13.5px] leading-[1.55] text-heading outline-none focus:border-[#201613]" />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><SparkleIcon size={12} weight="fill" style={{ color: O }} />Forslag fra Mindforward. Ret det, så det lyder som dig.</p>
            <label className="mt-4 flex cursor-pointer items-center justify-between rounded-[12px] bg-[#f7f2ee] px-3.5 py-3">
              <span className="flex items-center gap-2 text-[13px] text-heading"><EnvelopeSimpleIcon size={16} />Send også på mail</span>
              <button type="button" role="switch" aria-checked={mail} onClick={() => setMail(!mail)} className="relative h-6 w-10 rounded-full transition" style={{ background: mail ? INK : "#d9ccc5" }}><span className="absolute top-0.5 size-5 rounded-full bg-white transition-all" style={{ left: mail ? 18 : 2 }} /></button>
            </label>
            <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-muted"><LockSimpleIcon size={13} />Skubbet er privat. Kun du og {m.name.split(" ")[0]} kan se det.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => s.setOpen(null)} className="h-10 rounded-full px-4 text-[13px] font-medium text-heading hover:bg-[#f3eeeb]">Annuller</button>
              <button onClick={() => s.send(m)} disabled={!text.trim()} className="inline-flex h-10 items-center gap-1.5 rounded-full px-5 text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: O }}><BellRingingIcon size={14} weight="fill" />Send skub</button>
            </div>
          </div>
        </div>
      )}
      {s.toast && <div role="status" className="fixed bottom-20 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-[#201613] px-4 py-2.5 text-[13px] font-medium text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]"><CheckIcon size={13} weight="bold" className="mr-1.5 inline" style={{ color: GREEN }} />{s.toast}</div>}
    </>
  );
}

export function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
      <div><h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">Mit hold</h1><p className="mt-1.5 text-[12.5px] text-muted">{learner.team} · {members.length} medarbejdere</p></div>
      <div className="flex items-center gap-2">
        {children}
        <Demo />
        <button className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-medium text-heading hover:bg-[#f3eeeb]"><DownloadSimpleIcon size={14} />Hent rapport</button>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-white" style={{ background: INK }}><UserPlusIcon size={14} />Inviter</button>
      </div>
    </header>
  );
}

const kpis = [
  { l: "Øvede denne uge", v: `${activeWeek}/${members.length}`, s: "medarbejdere" },
  { l: "Øvetid i alt", v: fmt(totalMin), s: "↑ 22 % fra sidste uge", up: true },
  { l: "Gns. score", v: String(avgScore), s: "i øvemiljøet" },
  { l: "Kursusbeviser", v: String(certs), s: "optjent på holdet" },
];

// ——— A · Kort ———
export function A() {
  const s = useSkub();
  const order = { new: 0, idle: 1, active: 2, done: 3 };
  const list = [...members].sort((a, b) => order[a.state] - order[b.state]);
  return (
    <div className="flex flex-col gap-3">
      <Header />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.l} className={`${card} p-[18px]`}>
            <p className="text-[12px] text-muted">{k.l}</p>
            <p className="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-heading">{k.v}</p>
            <p className={`mt-2 text-[11.5px] ${k.up ? "font-semibold text-[#2f8a5c]" : "text-muted"}`}>{k.s}</p>
          </div>
        ))}
      </section>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className={`${card} p-[18px]`}>
          <div className="flex items-center justify-between"><h2 className="text-[15.5px] font-semibold text-heading">Medarbejdere</h2><span className="text-[11.5px] text-muted">Dem, der står stille, øverst</span></div>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {list.map((m) => (
              <li key={m.initials} className="flex flex-col rounded-[14px] border p-4" style={{ borderColor: LINE }}>
                <div className="flex items-start gap-3">
                  <Avatar m={m} />
                  <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold text-heading">{m.name}</p><p className="text-[11.5px] text-muted">{m.role} · {m.tool}</p></div>
                  <Pill m={m} />
                </div>
                <p className="mt-4 truncate text-[12px] text-heading">{m.courseTitle}</p>
                <div className="mt-1.5 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${m.progress}%`, background: m.state === "done" ? GREEN : O }} /></span><span className="text-[11px] font-semibold tabular-nums text-heading">{m.progress}%</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center" style={{ borderColor: LINE }}>
                  {[[m.score ?? "–", "Score"], [String(m.tasks), "Opgaver"], [fmt(m.minutes), "Øvetid"]].map(([v, l]) => <div key={l}><p className="text-[15px] font-semibold tabular-nums text-heading">{v}</p><p className="text-[10.5px] text-muted">{l}</p></div>)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted">Sidst aktiv: {m.last.toLowerCase()}</span>
                  {(m.state === "idle" || m.state === "new") ? <SkubButton m={m} s={s} /> : <WeekBars week={m.week} h={20} />}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <aside className="flex flex-col gap-3">
          <div className="rounded-[16px] p-5 text-white" style={{ background: STAGE }}>
            <p className="flex items-center gap-2 text-[13px] font-semibold"><SparkleIcon size={15} weight="fill" style={{ color: "#f6b49b" }} />Forslag til skub</p>
            <p className="mt-1 text-[11.5px] text-white/55">Mindforward foreslår, hvem der kunne bruge et skub</p>
            <ul className="mt-4 grid gap-2.5">
              {needsNudge.map((m) => (
                <li key={m.initials} className="rounded-[12px] bg-white/[0.06] p-3">
                  <div className="flex items-center gap-2.5"><Avatar m={m} size={32} dark /><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold">{m.name}</p><p className="truncate text-[11px] text-white/55">{reasonFor(m)}</p></div></div>
                  <div className="mt-2.5"><SkubButton m={m} s={s} dark wide /></div>
                </li>
              ))}
            </ul>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-[13px] font-semibold text-heading">Holdets uge</p>
            <p className="text-[11.5px] text-muted">Minutter øvet pr. dag</p>
            <div className="mt-4 flex h-[96px] items-end justify-between gap-2">
              {DAYS.map((d, i) => {
                const v = members.reduce((a, m) => a + m.week[i], 0);
                return <div key={d} className="flex flex-1 flex-col items-center gap-1.5"><span className="text-[10px] font-semibold tabular-nums text-heading">{v || ""}</span><i className="w-full rounded-[6px]" style={{ height: Math.max(4, (v / 70) * 72), background: v ? O : "#efe6e1" }} /><span className="text-[10px] text-muted">{d}</span></div>;
              })}
            </div>
          </div>
        </aside>
      </section>
      <SkubDialog s={s} />
    </div>
  );
}

// ——— B · Tabel ———
export function B() {
  const s = useSkub();
  const [sel, setSel] = useState<M>(members[3]);
  const [filter, setFilter] = useState<"Alle" | "Står stille" | "Øver" | "Færdige">("Alle");
  const rows = useMemo(() => members.filter((m) => filter === "Alle" || (filter === "Står stille" && (m.state === "idle" || m.state === "new")) || (filter === "Øver" && m.state === "active") || (filter === "Færdige" && m.state === "done")), [filter]);
  return (
    <div className="flex flex-col gap-3">
      <Header />
      <section className="flex flex-wrap gap-x-10 gap-y-3 rounded-[16px] bg-white px-6 py-5">
        {kpis.map((k, i) => <div key={k.l} className={i ? "border-l pl-10" : ""} style={{ borderColor: LINE }}><p className="text-[11.5px] text-muted">{k.l}</p><p className="mt-1 text-[24px] font-semibold leading-none tracking-[-0.03em] text-heading">{k.v}</p></div>)}
      </section>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className={`${card} p-[18px]`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15.5px] font-semibold text-heading">Medarbejdere</h2>
            <div className="flex gap-1 rounded-[10px] bg-[#f7f2ee] p-1">{(["Alle", "Står stille", "Øver", "Færdige"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`h-8 rounded-[8px] px-3 text-[12px] font-medium ${filter === f ? "bg-white text-heading shadow-[0_1px_3px_rgba(32,22,19,.12)]" : "text-muted hover:text-heading"}`}>{f}</button>)}</div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted"><tr className="border-b" style={{ borderColor: LINE }}><th className="py-2.5 pl-2 font-semibold">Medarbejder</th><th className="font-semibold">Kursus</th><th className="font-semibold">Status</th><th className="font-semibold">Denne uge</th><th className="text-right font-semibold">Score</th><th className="pr-2" /></tr></thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.initials} onClick={() => setSel(m)} className={`cursor-pointer border-b text-[12.5px] transition last:border-0 ${sel.initials === m.initials ? "bg-[#fbf6f3]" : "hover:bg-[#fbf8f6]"}`} style={{ borderColor: LINE }}>
                    <td className="py-3 pl-2"><span className="flex items-center gap-3"><Avatar m={m} size={34} /><span><b className="block font-semibold text-heading">{m.name}</b><small className="text-[11px] text-muted">{m.role} · {m.tool}</small></span></span></td>
                    <td className="max-w-[200px] pr-3"><span className="block truncate text-heading">{m.courseTitle}</span><span className="mt-1 flex items-center gap-2"><span className="h-1 w-24 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${m.progress}%`, background: m.state === "done" ? GREEN : O }} /></span><small className="text-[10.5px] tabular-nums text-muted">{m.progress}%</small></span></td>
                    <td><Pill m={m} /></td>
                    <td><span className="flex items-center gap-2.5"><WeekBars week={m.week} h={22} /><small className="w-14 whitespace-nowrap text-[11px] tabular-nums text-muted">{fmt(m.minutes)}</small></span></td>
                    <td className="text-right text-[13px] font-semibold tabular-nums text-heading">{m.score ?? "–"}</td>
                    <td className="pr-2 text-right" onClick={(e) => e.stopPropagation()}>{(m.state === "idle" || m.state === "new") && <SkubButton m={m} s={s} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <aside className={`${card} p-5 xl:sticky xl:top-3 xl:self-start`}>
          <div className="flex items-center gap-3"><Avatar m={sel} size={52} /><div className="min-w-0"><p className="text-[17px] font-semibold leading-tight text-heading">{sel.name}</p><p className="text-[12px] text-muted">{sel.role} · {sel.tool}</p></div></div>
          <div className="mt-4"><Pill m={sel} /></div>
          <div className="mt-5 flex items-center gap-4 rounded-[14px] bg-[#f7f2ee] p-4">
            <div className="relative size-[72px] shrink-0"><svg viewBox="0 0 100 100" className="size-full -rotate-90"><circle cx="50" cy="50" r="42" fill="none" stroke="#e9dfd9" strokeWidth="10" /><circle cx="50" cy="50" r="42" fill="none" stroke={sel.state === "done" ? GREEN : O} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(sel.progress / 100) * 263.9} 263.9`} /></svg><span className="absolute inset-0 grid place-items-center text-[16px] font-semibold tabular-nums text-heading">{sel.progress}%</span></div>
            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-heading">{sel.courseTitle}</p><p className="text-[11.5px] text-muted">{sel.tasks} opgaver · score {sel.score ?? "–"}</p><p className="text-[11.5px] text-muted">Sidst aktiv: {sel.last.toLowerCase()}</p></div>
          </div>
          <p className="mt-5 text-[12px] font-semibold text-heading">Øvetid denne uge · {fmt(sel.minutes)}</p>
          <div className="mt-2 flex h-[70px] items-end justify-between gap-2">{sel.week.map((v, i) => <div key={i} className="flex flex-1 flex-col items-center gap-1"><i className="w-full rounded-[5px]" style={{ height: Math.max(4, (v / 25) * 52), background: v ? O : "#efe6e1" }} /><span className="text-[10px] text-muted">{DAYS[i]}</span></div>)}</div>
          <div className="mt-5 border-t pt-4" style={{ borderColor: LINE }}>
            {(sel.state === "idle" || sel.state === "new") ? (
              <><p className="text-[12px] text-muted">{reasonFor(sel)}</p><div className="mt-2.5"><SkubButton m={sel} s={s} wide /></div></>
            ) : (
              <p className="flex items-center gap-2 text-[12.5px] text-heading"><CheckIcon size={14} weight="bold" style={{ color: GREEN }} />{sel.state === "done" ? "Har gennemført kurset og fået sit bevis." : "Øver jævnt. Intet skub nødvendigt."}</p>
            )}
          </div>
        </aside>
      </section>
      <SkubDialog s={s} />
    </div>
  );
}

// ——— C · Puls ———
export function C() {
  const s = useSkub();
  const ranked = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const split = [
    { l: "Færdige", v: members.filter((m) => m.state === "done").length, c: GREEN },
    { l: "Øver", v: members.filter((m) => m.state === "active").length, c: O },
    { l: "Står stille", v: members.filter((m) => m.state === "idle").length, c: "#f0b03c" },
    { l: "Ikke startet", v: members.filter((m) => m.state === "new").length, c: "rgba(255,255,255,.18)" },
  ];
  const curve = [74, 76, 75, 79, 81, 80, avgScore];
  const W = 300, H = 90, min = 70, max = 90;
  const pts = curve.map((v, i) => [(i / (curve.length - 1)) * W, H - ((v - min) / (max - min)) * H] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <div className="flex flex-col gap-3">
      <section className="grid gap-6 overflow-hidden rounded-[16px] p-6 text-white xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] xl:p-8" style={{ background: STAGE }}>
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">{learner.team} · {members.length} medarbejdere</p><h1 className="mt-2 text-[44px] font-bold leading-[0.95] tracking-[-0.035em] !text-white">Holdets puls</h1></div>
            <span className="rounded-[4px] border border-dashed border-white/25 px-1.5 py-px text-[10px] text-white/55">Eksempeldata</span>
          </div>
          <div className="mt-7 flex flex-wrap items-end gap-10">
            <div><p className="text-[12px] text-white/55">Holdets score</p><p className="text-[72px] font-semibold leading-none tracking-[-0.05em]">{avgScore}</p><p className="mt-1 text-[12px] font-semibold text-[#7fd6a6]">↑ 6 point på 6 uger</p></div>
            <svg viewBox={`0 0 ${W} ${H + 10}`} className="h-[100px] min-w-[220px] flex-1 overflow-visible" aria-hidden>
              <defs><linearGradient id="pc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={O} stopOpacity=".45" /><stop offset="1" stopColor={O} stopOpacity="0" /></linearGradient></defs>
              <path d={`${d} L${W},${H + 10} L0,${H + 10}Z`} fill="url(#pc)" /><path d={d} fill="none" stroke={O} strokeWidth="2.5" />
              <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="5" fill={O} stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
          <div className="mt-7">
            <div className="flex h-3 overflow-hidden rounded-full">{split.map((x) => <span key={x.l} style={{ width: `${(x.v / members.length) * 100}%`, background: x.c }} />)}</div>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-white/70">{split.map((x) => <li key={x.l} className="flex items-center gap-1.5"><i className="size-2.5 rounded-full" style={{ background: x.c }} />{x.l} <b className="font-semibold text-white">{x.v}</b></li>)}</ul>
          </div>
        </div>
        <div className="flex min-w-0 flex-col rounded-[16px] bg-white/[0.05] p-5">
          <p className="flex items-center gap-2 text-[15px] font-semibold"><BellRingingIcon size={16} weight="fill" style={{ color: "#f6b49b" }} />Brug for et skub</p>
          <p className="mt-0.5 text-[11.5px] text-white/55">Forslag fra Mindforward. Skubbet er privat.</p>
          <ul className="mt-4 grid gap-2.5">
            {needsNudge.map((m) => (
              <li key={m.initials} className="flex items-center gap-3 rounded-[12px] bg-white/[0.06] p-3">
                <Avatar m={m} size={38} dark />
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold">{m.name}</p><p className="truncate text-[11px] text-white/55">{reasonFor(m)}</p></div>
                <SkubButton m={m} s={s} dark />
              </li>
            ))}
          </ul>
          <Link href="/beskeder" className="mt-auto inline-flex items-center gap-1 pt-4 text-[12px] font-medium text-white/60 hover:text-white">Se sendte skub <ArrowRightIcon size={12} /></Link>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className={`${card} p-[18px]`}>
          <div className="flex items-start justify-between"><div><h2 className="text-[15.5px] font-semibold text-heading">Rangliste</h2><p className="text-[11.5px] text-muted">Score i øvemiljøet</p></div><SealCheckIcon size={18} weight="fill" style={{ color: O }} /></div>
          <ol className="mt-3 grid gap-1.5">
            {ranked.map((m, i) => (
              <li key={m.initials} className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 ${i === 0 ? "bg-[#fdf3ee]" : ""}`}>
                <span className="w-5 text-center text-[13px] font-bold tabular-nums" style={{ color: i < 3 ? O : "#b9aaa3" }}>{i + 1}</span>
                <Avatar m={m} size={34} />
                <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold text-heading">{m.name}</b><small className="text-[11px] text-muted">{m.role}</small></span>
                <span className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[#f3eeeb] sm:block"><span className="block h-full rounded-full" style={{ width: `${m.score}%`, background: O }} /></span>
                <b className="w-8 text-right text-[14px] font-semibold tabular-nums text-heading">{m.score}</b>
              </li>
            ))}
          </ol>
        </div>
        <div className={`${card} p-[18px]`}>
          <div className="flex items-start justify-between"><div><h2 className="text-[15.5px] font-semibold text-heading">Hvem øvede hvornår</h2><p className="text-[11.5px] text-muted">Minutter pr. dag, denne uge</p></div><span className="text-[11.5px] text-muted">I alt {fmt(totalMin)}</span></div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[460px] table-fixed border-separate border-spacing-[4px]">
              <colgroup><col className="w-9" /><col className="w-[72px]" />{DAYS.map((d) => <col key={d} />)}<col className="w-[118px]" /></colgroup>
              <thead><tr><th /><th />{DAYS.map((d) => <th key={d} className="text-[10.5px] font-medium text-muted">{d}</th>)}<th /></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.initials}>
                    <td className="w-8"><Avatar m={m} size={28} /></td>
                    <td className="pr-2 text-[12px] font-medium text-heading">{m.name.split(" ")[0]}</td>
                    {m.week.map((v, i) => <td key={i}><span title={`${m.name.split(" ")[0]}, ${DAYS[i]}: ${v} min`} className="grid h-8 place-items-center rounded-[7px] text-[10px] font-semibold tabular-nums" style={{ background: v ? `rgba(226,100,63,${0.18 + Math.min(1, v / 25) * 0.82})` : "#f5f0ed", color: v > 12 ? "#fff" : v ? "#8a3a22" : "transparent" }}>{v || "·"}</span></td>)}
                    <td className="pl-2 text-right">{(m.state === "idle" || m.state === "new") && <SkubButton m={m} s={s} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <SkubDialog s={s} />
    </div>
  );
}
