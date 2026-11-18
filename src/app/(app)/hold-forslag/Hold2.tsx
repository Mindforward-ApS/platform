"use client";
// Round 2 of "Mit hold" (Marco 2026-11-03: A/B/C "Ingen af dem" → "3 versioner mere"). Three different directions:
// D Tavle  — the team as a board, one column per state (Linear / Trello boards): where is everyone, at a glance.
// E Feed   — people strip + a running feed of what the team did (Strava club feed / LinkedIn activity).
// F Dagen  — the leader's day: a short to-do of what to do now, then a weekly goal and the team in one row
//            (Lattice / 15Five manager home, Duolingo for Schools).
// Same example data and the same working "Skub" as round 1.
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, BellRingingIcon, CheckIcon, ConfettiIcon, FlaskIcon, HandsClappingIcon, SealCheckIcon, SparkleIcon, TargetIcon, TrophyIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { learner } from "@/content/platform";
import { Avatar, card, DAYS, fmt, Header, members, needsNudge, O, GREEN, Pill, reasonFor, SkubButton, SkubDialog, STAGE, totalMin, useSkub, WeekBars, type M } from "./Hold";

const LINE = "#f1e9e4";
const byI = (i: string) => members.find((m) => m.initials === i)!;

// ——— D · Tavle ———
const COLS: { key: M["state"]; title: string; hint: string; dot: string }[] = [
  { key: "new", title: "Ikke startet", hint: "Har ikke åbnet kurset", dot: "#b9aaa3" },
  { key: "idle", title: "Står stille", hint: "Ingen øvetid i 3+ dage", dot: "#f0b03c" },
  { key: "active", title: "Øver", hint: "Øvet denne uge", dot: O },
  { key: "done", title: "Færdige", hint: "Kursusbevis optjent", dot: GREEN },
];

export function D() {
  const s = useSkub();
  return (
    <div className="flex flex-col gap-3">
      <Header />
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {COLS.map((c) => {
          const list = members.filter((m) => m.state === c.key);
          return (
            <div key={c.key} className="flex min-h-[420px] flex-col rounded-[16px] bg-[#efe8e3]/70 p-2.5">
              <div className="flex items-center gap-2 px-2 pb-3 pt-1.5">
                <i className="size-2.5 rounded-full" style={{ background: c.dot }} />
                <p className="text-[13.5px] font-semibold text-heading">{c.title}</p>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-[11px] font-semibold tabular-nums text-heading">{list.length}</span>
                <span className="ml-auto text-[10.5px] text-muted">{c.hint}</span>
              </div>
              <ul className="grid gap-2">
                {list.map((m) => (
                  <li key={m.initials} className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_2px_rgba(32,22,19,.06)]">
                    <div className="flex items-center gap-2.5"><Avatar m={m} size={34} /><div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-semibold text-heading">{m.name}</p><p className="text-[11px] text-muted">{m.role} · {m.tool}</p></div></div>
                    <p className="mt-3 line-clamp-2 text-[12px] leading-snug text-heading">{m.courseTitle}</p>
                    <div className="mt-2 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${m.progress}%`, background: c.key === "done" ? GREEN : O }} /></span><span className="text-[10.5px] font-semibold tabular-nums text-heading">{m.progress}%</span></div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2.5" style={{ borderColor: LINE }}>
                      {c.key === "new" || c.key === "idle" ? <><span className="truncate text-[11px] text-muted">{m.since}</span><SkubButton m={m} s={s} /></>
                        : c.key === "done" ? <><span className="flex items-center gap-1 text-[11px] font-semibold text-[#2f8a5c]"><SealCheckIcon size={13} weight="fill" />Bevis · score {m.score}</span><button className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f3eeeb] px-3 text-[11.5px] font-semibold text-heading hover:bg-[#ebe4e0]"><HandsClappingIcon size={13} weight="fill" />Ros</button></>
                        : <><span className="text-[11px] text-muted">{fmt(m.minutes)} denne uge</span><WeekBars week={m.week} h={18} /></>}
                    </div>
                  </li>
                ))}
                {list.length === 0 && <li className="rounded-[12px] border-2 border-dashed border-[#e3d8d2] p-4 text-center text-[12px] text-muted">Ingen her</li>}
              </ul>
            </div>
          );
        })}
      </section>
      <SkubDialog s={s} />
    </div>
  );
}

// ——— E · Feed ———
const FEED: { who: string; when: string; kind: "score" | "lesson" | "cert" | "streak" | "start"; text: string; meta?: string }[] = [
  { who: "SL", when: "I dag 10.42", kind: "score", text: "fik 92 point i opgaven \"Hvad må du dele?\"", meta: "Øvemiljø · ChatGPT" },
  { who: "MH", when: "I dag 09.15", kind: "lesson", text: "gennemførte lektionen \"Svar på klager\"", meta: "Mails og tilbud · 8 min" },
  { who: "IB", when: "I går 15.30", kind: "cert", text: "fik kursusbevis i \"Skriv prompts, der giver brugbare svar\"", meta: "Score 91" },
  { who: "ED", when: "I går 11.02", kind: "streak", text: "har øvet 3 dage i træk", meta: "47 min denne uge" },
  { who: "SL", when: "I går 08.40", kind: "lesson", text: "gennemførte lektionen \"Giv AI'en den rigtige kontekst\"", meta: "AI på arbejdet · 10 min" },
  { who: "MH", when: "Man 14.05", kind: "score", text: "fik 79 point i opgaven \"Lav et tilbud ud fra stikord\"", meta: "Øvemiljø · Copilot" },
];
const kindIcon = { score: FlaskIcon, lesson: CheckIcon, cert: SealCheckIcon, streak: ConfettiIcon, start: SparkleIcon };

export function E() {
  const s = useSkub();
  const [cheered, setCheered] = useState<Record<number, boolean>>({});
  return (
    <div className="flex flex-col gap-3">
      <Header />
      <section className={`${card} overflow-x-auto p-4`}>
        <ul className="grid min-w-[900px] grid-cols-6 gap-3">
          {members.map((m) => {
            const R = 26, C = 2 * Math.PI * R;
            return (
              <li key={m.initials} className="flex min-w-0 flex-col items-center rounded-[14px] border px-3 pb-3 pt-4 text-center" style={{ borderColor: LINE }}>
                <span className="relative grid size-[64px] place-items-center">
                  <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90"><circle cx="32" cy="32" r={R} fill="none" stroke="#f3eeeb" strokeWidth="4" /><circle cx="32" cy="32" r={R} fill="none" stroke={m.state === "done" ? GREEN : O} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(m.progress / 100) * C} ${C}`} /></svg>
                  <Avatar m={m} size={46} />
                </span>
                <p className="mt-2.5 w-full truncate text-[13px] font-semibold text-heading">{m.name}</p>
                <p className="text-[11px] text-muted">{m.progress}% · {fmt(m.minutes)}</p>
                <div className="mt-2.5 flex h-8 items-center">{m.state === "idle" || m.state === "new" ? <SkubButton m={m} s={s} /> : <Pill m={m} />}</div>
              </li>
            );
          })}
        </ul>
      </section>
      <section className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className={`${card} p-[18px]`}>
          <div className="flex items-start justify-between"><div><h2 className="text-[15.5px] font-semibold text-heading">Det sker på holdet</h2><p className="text-[11.5px] text-muted">Lektioner, opgaver og beviser, mens de sker</p></div><Demo /></div>
          <ol className="relative mt-4 grid gap-0 before:absolute before:bottom-4 before:left-[19px] before:top-4 before:w-px before:bg-[#efe6e1]">
            {FEED.map((f, i) => {
              const m = byI(f.who);
              const Icon = kindIcon[f.kind];
              const big = f.kind === "cert";
              return (
                <li key={i} className="relative flex gap-4 py-3">
                  <span className="relative z-[1]"><Avatar m={m} size={40} /></span>
                  <div className={`min-w-0 flex-1 ${big ? "rounded-[14px] p-4 text-white" : ""}`} style={big ? { background: STAGE } : undefined}>
                    <p className={`text-[13.5px] leading-snug ${big ? "text-white" : "text-heading"}`}><b className="font-semibold">{m.name.split(" ")[0]}</b> {f.text}</p>
                    <p className={`mt-1 flex items-center gap-1.5 text-[11.5px] ${big ? "text-white/60" : "text-muted"}`}><Icon size={13} weight={f.kind === "cert" ? "fill" : "regular"} style={{ color: big ? "#f6b49b" : f.kind === "lesson" ? GREEN : O }} />{f.meta} · {f.when}</p>
                    {(f.kind === "cert" || f.kind === "streak" || f.kind === "score") && (
                      <button onClick={() => setCheered({ ...cheered, [i]: true })} className={`mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-semibold transition ${cheered[i] ? (big ? "bg-white/15 text-white" : "bg-[#e8f6ee] text-[#2f8a5c]") : big ? "bg-white text-[#201613]" : "bg-[#f3eeeb] text-heading hover:bg-[#ebe4e0]"}`}>
                        {cheered[i] ? <><CheckIcon size={12} weight="bold" />Ros sendt</> : <><HandsClappingIcon size={13} weight="fill" />Send ros</>}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <aside className="flex flex-col gap-3 xl:sticky xl:top-3 xl:self-start">
          <div className="rounded-[16px] p-5 text-white" style={{ background: STAGE }}>
            <p className="flex items-center gap-2 text-[13px] font-semibold"><BellRingingIcon size={15} weight="fill" style={{ color: "#f6b49b" }} />Stille på holdet</p>
            <p className="mt-0.5 text-[11.5px] text-white/55">Ingen aktivitet i feedet fra</p>
            <ul className="mt-3 grid gap-2">{needsNudge.map((m) => <li key={m.initials} className="flex items-center gap-2.5 rounded-[12px] bg-white/[0.06] p-2.5"><Avatar m={m} size={32} dark /><div className="min-w-0 flex-1"><p className="truncate text-[12.5px] font-semibold">{m.name}</p><p className="truncate text-[10.5px] text-white/55">{reasonFor(m)}</p></div><SkubButton m={m} s={s} dark /></li>)}</ul>
          </div>
          <div className={`${card} p-5`}>
            <p className="text-[13px] font-semibold text-heading">Denne uge</p>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {[["Lektioner", "14"], ["Opgaver", "6"], ["Øvetid", fmt(totalMin)], ["Beviser", "1"]].map(([k, v]) => <div key={k} className="rounded-[12px] bg-[#f7f2ee] p-3"><dt className="text-[11px] text-muted">{k}</dt><dd className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-heading">{v}</dd></div>)}
            </dl>
          </div>
        </aside>
      </section>
      <SkubDialog s={s} />
    </div>
  );
}

// ——— F · Lederens dag ———
export function F() {
  const s = useSkub();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const goal = 300;
  const pct = Math.min(100, Math.round((totalMin / goal) * 100));
  const ida = byI("IB");
  const todos = [
    ...needsNudge.map((m) => ({ id: m.initials, icon: BellRingingIcon, title: `Giv ${m.name.split(" ")[0]} et skub`, sub: reasonFor(m), m, kind: "skub" as const })),
    { id: "ros", icon: TrophyIcon, title: `Sig tillykke til ${ida.name.split(" ")[0]}`, sub: "Fik kursusbevis i går · score 91", m: ida, kind: "ros" as const },
  ];
  const left = todos.filter((t) => !(t.kind === "skub" ? s.sent[t.id] : done[t.id])).length;
  return (
    <div className="flex flex-col gap-3">
      <section className="grid grid-cols-[minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 rounded-[16px] p-5 text-white sm:p-7" style={{ background: STAGE }}>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/55">{learner.team} · tirsdag</p>
          <h1 className="mt-2 text-[40px] font-bold leading-[1] tracking-[-0.035em] !text-white">{left ? `${left} ting til dig i dag` : "Holdet er på sporet"}</h1>
          <p className="mt-2 text-[13px] text-white/60">Mindforward har kigget på holdets uge. Det her flytter mest.</p>
          <ul className="mt-6 grid gap-2.5">
            {todos.map((t) => {
              const ok = t.kind === "skub" ? s.sent[t.id] : done[t.id];
              return (
                <li key={t.id} className={`flex flex-wrap items-center gap-3.5 rounded-[14px] p-3.5 transition sm:flex-nowrap ${ok ? "bg-white/[0.03] opacity-60" : "bg-white/[0.07]"}`}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-[11px]" style={{ background: ok ? GREEN : t.kind === "ros" ? "#f0b03c" : O }}>{ok ? <CheckIcon size={18} weight="bold" /> : <t.icon size={18} weight="fill" />}</span>
                  <div className="min-w-0 flex-1"><p className={`text-[14.5px] font-semibold ${ok ? "line-through decoration-white/40" : ""}`}>{t.title}</p><p className="truncate text-[11.5px] text-white/55">{t.sub}</p></div>
                  {t.kind === "skub" ? <SkubButton m={t.m} s={s} dark /> : ok ? <span className="text-[11.5px] font-semibold text-[#7fd6a6]">Sendt</span> : <button onClick={() => setDone({ ...done, [t.id]: true })} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3.5 text-[11.5px] font-semibold text-[#201613]"><HandsClappingIcon size={13} weight="fill" />Send ros</button>}
                </li>
              );
            })}
          </ul>
        </div>
        <div className={`${card} flex flex-col p-6`}>
          <div className="flex items-start justify-between"><div><p className="flex items-center gap-2 text-[15.5px] font-semibold text-heading"><TargetIcon size={18} weight="fill" style={{ color: O }} />Ugens mål</p><p className="text-[11.5px] text-muted">5 timers øvetid for hele holdet</p></div><Demo /></div>
          <div className="mt-6 flex items-end gap-2"><span className="text-[56px] font-semibold leading-none tracking-[-0.045em] text-heading">{pct}%</span><span className="mb-2 text-[13px] text-muted">{fmt(totalMin)} af {fmt(goal)}</span></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#f3eeeb]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: O }} /></div>
          <p className="mt-3 text-[12.5px] text-heading">Mangler <b>{fmt(Math.max(0, goal - totalMin))}</b>. Hvis Jonas og Nora tager én lektion hver, er I i mål fredag.</p>
          <div className="mt-auto pt-6">
            <p className="text-[11.5px] font-semibold text-muted">Holdet denne uge</p>
            <div className="mt-2 flex h-[64px] items-end justify-between gap-2">{DAYS.map((d, i) => { const v = members.reduce((a, m) => a + m.week[i], 0); return <div key={d} className="flex flex-1 flex-col items-center gap-1"><i className="w-full rounded-[5px]" style={{ height: Math.max(4, (v / 70) * 48), background: v ? O : "#efe6e1" }} /><span className="text-[10px] text-muted">{d}</span></div>; })}</div>
          </div>
        </div>
      </section>
      <section className={`${card} p-[18px]`}>
        <div className="flex items-center justify-between"><h2 className="text-[15.5px] font-semibold text-heading">Holdet</h2><Link href="/hold" className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-heading">Hent rapport <ArrowRightIcon size={12} /></Link></div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <li key={m.initials} className="flex items-center gap-3 rounded-[12px] border p-3" style={{ borderColor: LINE }}>
              <Avatar m={m} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-[13px] font-semibold text-heading">{m.name}</p><Pill m={m} /></div>
                <div className="mt-1.5 flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full" style={{ width: `${m.progress}%`, background: m.state === "done" ? GREEN : O }} /></span><span className="text-[10.5px] tabular-nums text-muted">{m.progress}%</span></div>
              </div>
              <WeekBars week={m.week} h={22} />
            </li>
          ))}
        </ul>
      </section>
      <SkubDialog s={s} />
    </div>
  );
}
