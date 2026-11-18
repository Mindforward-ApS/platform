"use client";
// Round 2 of Beskeder (Marco 2026-11-03: M/N/O "godt nok dårligt, 3 nye"). Three bolder directions that feel alive:
// P Scene  — the whole messages area on the brown website stage: glowing coral bubbles, glass cards, a people
//            strip with progress rings, bubbles that animate in and people who answer back (typing dots).
// Q Coach  — Mindforward is the centre: a big AI-coach conversation like Claude/ChatGPT's home (greeting, suggestion
//            cards, answers with lesson/task cards), your team's messages as a slim column beside it.
// R Rum    — iMessage/WhatsApp-level polish on light: avatars as large "rooms" with unread rings at the top, one
//            focused conversation with day dividers, reactions on long-press/hover, voice-note and image bubbles.
// Example data; replies are simulated.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, ArrowUpIcon, BellRingingIcon, BookOpenIcon, CheckIcon, ChecksIcon, FlaskIcon, MicrophoneIcon, PaperclipIcon, PlayIcon, SparkleIcon, TargetIcon, TrophyIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { CourseCard, FeedbackCard, P, SkubCard, type Who } from "./Besk";

const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613", LINE = "#f1e9e4";
const STAGE = "radial-gradient(70% 60% at 85% 0%, rgba(226,100,63,.28), transparent 60%), radial-gradient(60% 50% at 0% 100%, rgba(226,100,63,.14), transparent 60%), linear-gradient(160deg, #2e1f1c 0%, #201613 50%, #160d0a 100%)";
const POP = "motion-safe:animate-[msg-in_380ms_cubic-bezier(0.16,1,0.3,1)_both]";
const KEYS = `@keyframes msg-in { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
@keyframes dot { 0%, 60%, 100% { transform: translateY(0); opacity: .5 } 30% { transform: translateY(-4px); opacity: 1 } }`;
const FULL = `@media (min-width: 1024px) { main > div:has(> [data-kf]) { padding-bottom: 0; } [data-kf] { padding-bottom: 0 !important; } }`;

type Line = { id: number; from: string; text?: string; kind?: "feedback" | "skub" | "course" | "voice" | "image" | "goal"; at: string; react?: string };
let uid = 100;
function useChat(initial: Line[], replies: Record<string, string>) {
  const [lines, setLines] = useState(initial);
  const [typing, setTyping] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const send = (text: string, to: string) => {
    setLines((l) => [...l, { id: uid++, from: "me", text, at: "Nu" }]);
    const reply = replies[to];
    if (!reply) return;
    timers.current.push(window.setTimeout(() => setTyping(to), 500));
    timers.current.push(window.setTimeout(() => { setTyping(null); setLines((l) => [...l, { id: uid++, from: to, text: reply, at: "Nu" }]); }, 2100));
  };
  return { lines, setLines, typing, send };
}
function useBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [dep]);
  return ref;
}
function Dots({ dark }: { dark?: boolean }) {
  return <span className="inline-flex gap-1">{[0, 1, 2].map((i) => <i key={i} className="size-1.5 rounded-full" style={{ background: dark ? "#fff" : INK, animation: `dot 1.1s ${i * 0.15}s infinite` }} />)}</span>;
}
function Face({ w, size = 40, dark, ring }: { w: Who; size?: number; dark?: boolean; ring?: number }) {
  const R = size / 2 + 3, C = 2 * Math.PI * R;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size + 8, height: size + 8 }}>
      {ring !== undefined && <svg className="absolute inset-0 -rotate-90" viewBox={`0 0 ${size + 8} ${size + 8}`}><circle cx={(size + 8) / 2} cy={(size + 8) / 2} r={R} fill="none" stroke={dark ? "rgba(255,255,255,.12)" : "#efe6e1"} strokeWidth="2.5" /><circle cx={(size + 8) / 2} cy={(size + 8) / 2} r={R} fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${(ring / 100) * C} ${C}`} /></svg>}
      <span className="grid place-items-center rounded-full font-semibold" style={{ width: size, height: size, fontSize: size * 0.34, background: w.mf ? "linear-gradient(145deg,#4a2f27,#201613)" : dark ? "rgba(255,255,255,.1)" : "#f3eeeb", color: dark || w.mf ? "#fff" : INK, boxShadow: w.mf ? "inset 0 1px 0 rgba(255,220,200,.2)" : undefined }}>
        {w.mf ? <SparkleIcon size={size * 0.46} weight="fill" style={{ color: "#ffb48a" }} /> : w.initials}
      </span>
      {w.online && <span className="absolute bottom-0.5 right-0.5 size-3 rounded-full border-2" style={{ background: GREEN, borderColor: dark ? "#241815" : "#fff" }} />}
    </span>
  );
}
function Voice({ dark, mine }: { dark?: boolean; mine?: boolean }) {
  const bars = [6, 12, 18, 10, 22, 14, 8, 16, 20, 12, 6, 14, 18, 10, 8, 12, 16, 6];
  return (
    <span className={`inline-flex items-center gap-2.5 rounded-[18px] px-3 py-2 ${mine ? "" : dark ? "bg-white/[0.08]" : "bg-white"}`} style={mine ? { background: O } : undefined}>
      <span className="grid size-8 place-items-center rounded-full bg-white text-[#201613]"><PlayIcon size={13} weight="fill" className="translate-x-[1px]" /></span>
      <span className="flex items-center gap-[3px]">{bars.map((h, i) => <i key={i} className="w-[3px] rounded-full" style={{ height: h, background: mine || dark ? "rgba(255,255,255,.8)" : INK, opacity: i < 7 ? 1 : 0.4 }} />)}</span>
      <span className={`text-[11px] tabular-nums ${mine || dark ? "text-white/80" : "text-muted"}`}>0:24</span>
    </span>
  );
}
function Send({ onSend, dark, placeholder }: { onSend: (t: string) => void; dark?: boolean; placeholder: string }) {
  const [t, setT] = useState("");
  const go = () => { if (t.trim()) { onSend(t.trim()); setT(""); } };
  return (
    <div className={`flex items-center gap-2 rounded-full p-1.5 pl-2 ${dark ? "bg-white/[0.08] ring-1 ring-white/10 backdrop-blur" : "bg-white ring-1 ring-[#ece4df]"}`}>
      <button aria-label="Vedhæft" className={`grid size-9 place-items-center rounded-full ${dark ? "text-white/60 hover:bg-white/10" : "text-muted hover:bg-[#f7f2ee]"}`}><PaperclipIcon size={17} /></button>
      <input value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} placeholder={placeholder} className={`h-9 min-w-0 flex-1 bg-transparent text-[14px] outline-none ${dark ? "text-white placeholder:text-white/40" : "text-heading placeholder:text-muted"}`} />
      {t.trim() ? <button onClick={go} aria-label="Send" className="grid size-10 place-items-center rounded-full text-white shadow-[0_6px_18px_-4px_rgba(226,100,63,.7)] transition hover:scale-105" style={{ background: O }}><ArrowUpIcon size={17} weight="bold" /></button>
        : <button aria-label="Indtal" className={`grid size-10 place-items-center rounded-full ${dark ? "bg-white/10 text-white" : "bg-[#f3eeeb] text-heading"}`}><MicrophoneIcon size={17} weight="fill" /></button>}
    </div>
  );
}

// ——— P · Scene ———
const PEOPLE = [P.mf, P.jk, P.ib, P.mh, P.ed];
const RING: Record<string, number> = { mf: 40, jk: 20, ib: 100, mh: 65, ed: 85 };
const P_INIT: Record<string, Line[]> = {
  jk: [
    { id: 1, from: "jk", text: "Hej alle. Tag gerne et eksempel med til mandag, hvor AI sparede jer tid i denne uge.", at: "I går 14.03" },
    { id: 2, from: "me", text: "Gør jeg. Jeg tager mailen til kunden med leveringsdatoen.", at: "I går 14.20", react: "👍" },
    { id: 3, from: "jk", kind: "voice", at: "I dag 08.38" },
    { id: 4, from: "jk", kind: "skub", at: "I dag 08.40" },
  ],
  mf: [
    { id: 5, from: "mf", kind: "course", text: "Et nyt kursus passer til dig.", at: "Man 08.00" },
    { id: 6, from: "mf", kind: "feedback", text: "Din opgave er bedømt.", at: "I dag 09.12" },
  ],
  ib: [{ id: 7, from: "ib", text: "Tak for skabelonen, den virker også til klager. Må jeg dele den?", at: "Fre 11.41" }, { id: 8, from: "me", text: "Selvfølgelig, del løs.", at: "Fre 11.50", react: "🙌" }],
  mh: [{ id: 9, from: "mh", text: "Hvordan fik du Copilot til at skrive dansk hele vejen?", at: "Ons 15.10" }],
  ed: [{ id: 10, from: "ed", kind: "image", text: "Mit regneark efter Copilot. 20 minutter sparet.", at: "Tor 13.02" }],
};
const P_REPLY: Record<string, string> = { jk: "Fedt, Sofie. Glæder mig til at høre det mandag.", mf: "Godt spørgsmål. Start med lektion 6, \"AI til mails\". Den tager 10 minutter og passer til din næste opgave.", ib: "Tusind tak! 🙌", mh: "Smart, det prøver jeg.", ed: "Ja, det var helt vildt." };

export function Pv() {
  const [who, setWho] = useState("jk");
  const [all, setAll] = useState(P_INIT);
  const [typing, setTyping] = useState<string | null>(null);
  const lines = all[who];
  const box = useBottom(lines.length + who + typing);
  const w = P[who];
  const send = (text: string) => {
    setAll((a) => ({ ...a, [who]: [...a[who], { id: uid++, from: "me", text, at: "Nu" }] }));
    const to = who;
    setTimeout(() => setTyping(to), 500);
    setTimeout(() => { setTyping(null); setAll((a) => ({ ...a, [to]: [...a[to], { id: uid++, from: to, text: P_REPLY[to], at: "Nu" }] })); }, 2100);
  };
  return (
    <div className="relative flex min-h-[640px] flex-col overflow-hidden rounded-[20px] text-white lg:h-[max(600px,calc(100svh-5.9rem))]" style={{ background: STAGE }}>
      <style>{KEYS + FULL}</style>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(closest-side, rgba(226,100,63,.45), transparent)" }} />
      <header className="relative flex flex-wrap items-center gap-6 px-6 pb-4 pt-5 xl:px-8">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/50">Beskeder</p><h1 className="text-[30px] font-bold leading-none tracking-[-0.03em] !text-white">Dit hold</h1></div>
        <ul className="flex flex-1 gap-1 overflow-x-auto">
          {PEOPLE.map((p) => (
            <li key={p.id}>
              <button onClick={() => setWho(p.id)} className={`flex flex-col items-center gap-1 rounded-[16px] px-2.5 py-2 transition ${who === p.id ? "bg-white/[0.1]" : "hover:bg-white/[0.05]"}`}>
                <Face w={p} size={46} dark ring={RING[p.id]} />
                <span className={`text-[11.5px] ${who === p.id ? "font-semibold text-white" : "text-white/65"}`}>{p.name.split(" ")[0]}</span>
              </button>
            </li>
          ))}
        </ul>
        <span className="rounded-[4px] border border-dashed border-white/25 px-1.5 py-px text-[10px] text-white/55">Eksempeldata</span>
      </header>
      <div className="relative mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-sm xl:mx-6 xl:mb-6">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
          <Face w={w} size={36} dark />
          <div className="min-w-0 flex-1"><p className="text-[14.5px] font-semibold">{w.name}</p><p className="text-[11.5px] text-white/55">{typing === who ? "skriver …" : w.online ? "Online nu" : w.role}</p></div>
          <span className="text-[11.5px] text-white/50">Ringen viser, hvor langt {w.mf ? "du" : w.name.split(" ")[0]} er</span>
        </div>
        <div ref={box} className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mx-auto flex max-w-[760px] flex-col gap-3.5">
            {lines.map((m) => {
              const mine = m.from === "me";
              return (
                <div key={m.id} className={`flex items-end gap-2.5 ${mine ? "flex-row-reverse" : ""} ${m.at === "Nu" ? POP : ""}`}>
                  {!mine && <Face w={P[m.from]} size={30} dark />}
                  <div className={`flex min-w-0 flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                    {m.kind === "skub" ? <SkubCard /> : m.kind === "feedback" ? <FeedbackCard /> : m.kind === "course" ? <><p className="rounded-[18px] rounded-bl-[6px] bg-white/[0.09] px-4 py-2.5 text-[14px]">{m.text}</p><CourseCard /></>
                      : m.kind === "voice" ? <Voice dark />
                      : m.kind === "image" ? <div className="overflow-hidden rounded-[18px] bg-white/[0.09]"><div className="grid h-40 w-72 place-items-center" style={{ background: "repeating-linear-gradient(0deg,#f7f2ee 0 22px,#fff 22px 23px), linear-gradient(90deg,#efe6e1 0 70px,transparent 70px)" }}><span className="rounded-full bg-[#201613] px-3 py-1 text-[11px] font-semibold text-white">Budget_Q4.xlsx</span></div><p className="px-4 py-2.5 text-[14px]">{m.text}</p></div>
                      : <p className={`max-w-[520px] px-4 py-2.5 text-[14px] leading-[1.5] ${mine ? "rounded-[18px] rounded-br-[6px] text-white shadow-[0_8px_24px_-8px_rgba(226,100,63,.7)]" : "rounded-[18px] rounded-bl-[6px] bg-white/[0.09]"}`} style={mine ? { background: "linear-gradient(135deg,#ef7a52,#d9532f)" } : undefined}>{m.text}</p>}
                    <span className="flex items-center gap-1.5 text-[10.5px] text-white/45">{m.at}{mine && <ChecksIcon size={13} weight="bold" style={{ color: "#7fd6a6" }} />}{m.react && <span className="rounded-full bg-white/10 px-1.5 text-[12px]">{m.react}</span>}</span>
                  </div>
                </div>
              );
            })}
            {typing === who && <div className={`flex items-end gap-2.5 ${POP}`}><Face w={w} size={30} dark /><span className="rounded-[18px] rounded-bl-[6px] bg-white/[0.09] px-4 py-3.5"><Dots dark /></span></div>}
          </div>
        </div>
        <div className="p-3"><div className="mx-auto max-w-[760px]"><Send dark onSend={send} placeholder={`Skriv til ${w.name.split(" ")[0]} …`} /></div></div>
      </div>
    </div>
  );
}

// ——— Q · Coach ———
const SUGGEST = [
  { icon: TargetIcon, t: "Hvad skal jeg øve i dag?", d: "Ud fra din plan og din seneste score" },
  { icon: FlaskIcon, t: "Forklar min feedback", d: "Opgaven fik 86. Hvad mangler?" },
  { icon: BookOpenIcon, t: "Find et kursus til mig", d: "Noget, der passer til kundeservice" },
  { icon: TrophyIcon, t: "Hvor langt er jeg?", d: "Se, hvad der mangler til beviset" },
];
const COACH: Record<string, Line[]> = {
  "Hvad skal jeg øve i dag?": [{ id: 0, from: "mf", text: "Du har 10 minutter kl. 11.30 i kalenderen. Brug dem på lektion 6, \"AI til mails\". Den bygger videre på opgaven, hvor du fik 86.", at: "Nu" }, { id: 0, from: "mf", kind: "goal", at: "Nu" }],
  "Forklar min feedback": [{ id: 0, from: "mf", kind: "feedback", at: "Nu" }, { id: 0, from: "mf", text: "Det eneste, der trak ned, var tonen. Skriv fx: \"Svar i samme tone som denne mail: …\" og indsæt en af jeres egne mails. Vil du prøve igen?", at: "Nu" }],
  "Find et kursus til mig": [{ id: 0, from: "mf", text: "Research og opsummering med AI passer godt. Lektion 4 og 5 handler om lange kundemails.", at: "Nu" }, { id: 0, from: "mf", kind: "course", at: "Nu" }],
  "Hvor langt er jeg?": [{ id: 0, from: "mf", text: "Du er 40 % inde i AI på arbejdet. Der mangler 7 lektioner og 3 opgaver, cirka 55 minutter. Holder du tempoet, har du beviset om to uger.", at: "Nu" }],
};
export function Q() {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState(false);
  const box = useBottom(lines.length + String(typing));
  const ask = (q: string) => {
    setLines((l) => [...l, { id: uid++, from: "me", text: q, at: "Nu" }]);
    setTyping(true);
    const ans = COACH[q] ?? [{ id: 0, from: "mf", text: "Det kan jeg hjælpe med. Prøv at fortælle lidt mere om opgaven, så finder jeg den rette lektion eller øvelse til dig.", at: "Nu" }];
    ans.forEach((a, i) => setTimeout(() => { if (i === ans.length - 1) setTyping(false); setLines((l) => [...l, { ...a, id: uid++ }]); }, 1300 + i * 700));
  };
  const team = [
    { w: P.jk, t: "Skub: tag lektion 6 før fredag", at: "08.40", hot: true, icon: BellRingingIcon },
    { w: P.ib, t: "Delte din skabelon med holdet 🙌", at: "Fre", icon: undefined },
    { w: P.mh, t: "Hvordan fik du Copilot til at skrive dansk?", at: "Ons", icon: undefined },
    { w: P.ed, t: "Mit regneark efter Copilot", at: "Tor", icon: undefined },
  ];
  return (
    <div className="grid gap-3 lg:h-[max(600px,calc(100svh-5.9rem))] xl:grid-cols-[minmax(0,1fr)_330px]">
      <style>{KEYS + FULL}</style>
      <section className="relative flex min-h-[640px] flex-col overflow-hidden rounded-[20px] bg-white lg:min-h-0">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[260px]" style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(226,100,63,.10), transparent 70%)" }} />
        <div ref={box} className="relative min-h-0 flex-1 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex max-w-[720px] flex-col gap-4">
            {lines.length === 0 ? (
              <div className="flex flex-col items-center pt-[6vh] text-center">
                <Face w={P.mf} size={68} />
                <h1 className="mt-5 text-[38px] font-bold leading-[1.05] tracking-[-0.035em] text-heading">Godmorgen, Sofie</h1>
                <p className="mt-2 max-w-[440px] text-[15px] text-muted">Jeg er din AI-træner. Spørg mig om dine kurser, din feedback eller hvad du skal øve i dag.</p>
                <ul className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
                  {SUGGEST.map((s, i) => (
                    <li key={s.t} className={POP} style={{ animationDelay: `${i * 60}ms` }}>
                      <button onClick={() => ask(s.t)} className="group flex h-full w-full items-start gap-3 rounded-[16px] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#e2643f] hover:shadow-[0_14px_30px_-16px_rgba(226,100,63,.6)]" style={{ borderColor: "#ece4df" }}>
                        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] transition group-hover:scale-105" style={{ background: "#fdf0ea", color: O }}><s.icon size={19} weight="fill" /></span>
                        <span><b className="block text-[14px] font-semibold text-heading">{s.t}</b><small className="text-[12px] text-muted">{s.d}</small></span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : lines.map((m) => {
              const mine = m.from === "me";
              return (
                <div key={m.id} className={`flex gap-3 ${mine ? "justify-end" : ""} ${POP}`}>
                  {!mine && <Face w={P.mf} size={32} />}
                  {mine ? <p className="max-w-[480px] rounded-[18px] rounded-br-[6px] bg-[#f3eeeb] px-4 py-2.5 text-[14.5px] text-heading">{m.text}</p>
                    : m.kind === "feedback" ? <FeedbackCard /> : m.kind === "course" ? <CourseCard />
                    : m.kind === "goal" ? <Link href="/kurser/ai-paa-arbejdet/6" className="flex w-full max-w-[460px] items-center gap-4 rounded-[16px] p-4 text-white" style={{ background: STAGE }}><span className="grid size-12 place-items-center rounded-[12px]" style={{ background: O }}><PlayIcon size={20} weight="fill" /></span><span className="min-w-0 flex-1"><small className="text-[11px] text-white/55">Lektion 6 · 10 min · kl. 11.30</small><b className="block text-[16px] font-semibold">AI til mails</b></span><ArrowRightIcon size={18} weight="bold" /></Link>
                    : <p className="max-w-[560px] pt-1 text-[15px] leading-[1.65] text-heading">{m.text}</p>}
                </div>
              );
            })}
            {typing && <div className={`flex items-center gap-3 ${POP}`}><Face w={P.mf} size={32} /><span className="text-[13px] text-muted">Mindforward tænker</span><Dots /></div>}
          </div>
        </div>
        <div className="relative p-4"><div className="mx-auto max-w-[720px]"><Send onSend={ask} placeholder="Spørg din AI-træner …" /><p className="mt-2 text-center text-[11px] text-muted">Svarene bygger på dine kurser, din plan og din feedback. <span className="rounded-[4px] border border-dashed border-[#d9ccc5] px-1">Eksempeldata</span></p></div></div>
      </section>
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-[20px] text-white" style={{ background: STAGE }}>
        <p className="px-5 pb-2 pt-5 text-[15px] font-semibold">Fra holdet</p>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2">
          {team.map((x, i) => (
            <li key={i} className={POP} style={{ animationDelay: `${i * 70}ms` }}>
              <Link href="/beskeder-forslag/r" className={`flex items-center gap-3 rounded-[14px] p-3 transition hover:bg-white/[0.06] ${x.hot ? "bg-white/[0.07]" : ""}`}>
                <Face w={x.w} size={38} dark />
                <span className="min-w-0 flex-1"><span className="flex justify-between gap-2"><b className="truncate text-[13px] font-semibold">{x.w.name}</b><small className="text-[10.5px] text-white/45">{x.at}</small></span><span className={`flex items-center gap-1 truncate text-[12px] ${x.hot ? "font-semibold text-[#ffb48a]" : "text-white/60"}`}>{x.icon && <x.icon size={12} weight="fill" />}{x.t}</span></span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="m-3 rounded-[16px] bg-white/[0.06] p-4">
          <p className="text-[12px] text-white/55">I dag</p>
          <p className="mt-1 text-[15px] font-semibold">2 ting venter på dig</p>
          <ul className="mt-2 grid gap-1.5 text-[12.5px] text-white/80"><li className="flex items-center gap-2"><i className="size-1.5 rounded-full" style={{ background: O }} />Lektion 6 · AI til mails</li><li className="flex items-center gap-2"><i className="size-1.5 rounded-full" style={{ background: O }} />Svar Mads om Copilot</li></ul>
        </div>
      </aside>
    </div>
  );
}

// ——— R · Rum ———
const R_INIT: Line[] = [
  { id: 1, from: "jk", text: "Godmorgen! Hvordan går det med AI på arbejdet?", at: "I går 08.10" },
  { id: 2, from: "me", text: "Godt. Lektionen om kontekst gjorde en stor forskel på mine mails.", at: "I går 08.22", react: "❤️" },
  { id: 3, from: "jk", text: "Det kan jeg se på din score 💪", at: "I går 08.23" },
  { id: 4, from: "me", kind: "voice", at: "I går 16.40" },
  { id: 5, from: "jk", kind: "skub", at: "I dag 08.40" },
];
export function R() {
  const { lines, setLines, typing, send } = useChat(R_INIT, { jk: "Super, Sofie! Sig til, hvis du sidder fast. 🙌" });
  const [who, setWho] = useState("jk");
  const [hover, setHover] = useState<number | null>(null);
  const box = useBottom(lines.length + String(typing));
  const rooms = [{ w: P.jk, n: 1 }, { w: P.mf, n: 1 }, { w: P.ib, n: 0 }, { w: P.mh, n: 2 }, { w: P.ed, n: 0 }];
  const react = (id: number, e: string) => { setLines((l) => l.map((x) => (x.id === id ? { ...x, react: e } : x))); setHover(null); };
  const day = (a: string) => a.split(" ").slice(0, -1).join(" ") || "I dag";
  return (
    <div className="flex flex-col gap-3 lg:h-[max(600px,calc(100svh-5.9rem))]">
      <style>{KEYS + FULL}</style>
      <section className="flex items-center gap-2 overflow-x-auto rounded-[20px] bg-white px-4 py-3">
        <h1 className="mr-3 shrink-0 text-[24px] font-bold tracking-[-0.03em] text-heading">Beskeder</h1>
        {rooms.map(({ w, n }) => (
          <button key={w.id} onClick={() => setWho(w.id)} className={`relative flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-4 transition ${who === w.id ? "bg-[#201613] text-white" : "hover:bg-[#f7f2ee]"}`}>
            <span className={`rounded-full ${n ? "p-[2px]" : ""}`} style={n ? { background: `conic-gradient(${O}, #ffb48a, ${O})` } : undefined}><span className={`block rounded-full ${n ? "p-[2px]" : ""} ${who === w.id ? "bg-[#201613]" : "bg-white"}`}><Face w={w} size={34} /></span></span>
            <span className="text-left"><b className="block text-[13px] font-semibold leading-tight">{w.name.split(" ")[0]}</b><small className={`text-[11px] ${who === w.id ? "text-white/60" : "text-muted"}`}>{n ? `${n} ny${n > 1 ? "e" : ""}` : w.mf ? "AI-træner" : "Læst"}</small></span>
          </button>
        ))}
        <span className="ml-auto shrink-0"><Demo /></span>
      </section>
      <section className="relative flex min-h-[560px] flex-1 flex-col overflow-hidden rounded-[20px] bg-[#fbf7f4] lg:min-h-0">
        <header className="flex items-center gap-3 border-b bg-white/80 px-6 py-3 backdrop-blur" style={{ borderColor: LINE }}>
          <Face w={P.jk} size={40} />
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-heading">Jonas Kirk</p><p className="text-[12px]" style={{ color: typing ? O : "#7d6e68" }}>{typing ? "skriver …" : "Online · din leder"}</p></div>
          <span className="hidden items-center gap-1.5 rounded-full bg-[#f3eeeb] px-3 py-1.5 text-[11.5px] text-heading sm:flex"><BellRingingIcon size={13} weight="fill" style={{ color: O }} />Skub og beskeder er private</span>
        </header>
        <div ref={box} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto flex max-w-[680px] flex-col gap-1.5">
            {lines.map((m, i) => {
              const mine = m.from === "me";
              const prev = lines[i - 1];
              const newDay = !prev || day(prev.at) !== day(m.at);
              const grouped = prev && prev.from === m.from && !newDay;
              return (
                <div key={m.id}>
                  {newDay && <p className="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"><span className="h-px flex-1 bg-[#ece4df]" />{day(m.at)}<span className="h-px flex-1 bg-[#ece4df]" /></p>}
                  <div className={`group relative flex items-end gap-2 ${mine ? "justify-end" : ""} ${grouped ? "" : "mt-2"} ${m.at === "Nu" ? POP : ""}`} onMouseEnter={() => setHover(m.id)} onMouseLeave={() => setHover(null)}>
                    {!mine && <span className={grouped ? "invisible" : ""}><Face w={P[m.from]} size={28} /></span>}
                    <div className={`relative flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {hover === m.id && !m.kind && <span className={`absolute -top-9 z-[2] flex gap-0.5 rounded-full bg-white p-1 shadow-[0_8px_24px_-8px_rgba(32,22,19,.35)] ${POP} ${mine ? "right-0" : "left-0"}`}>{["❤️", "👍", "😂", "🙌", "💡"].map((e) => <button key={e} onClick={() => react(m.id, e)} className="grid size-7 place-items-center rounded-full text-[15px] transition hover:scale-125 hover:bg-[#f7f2ee]">{e}</button>)}</span>}
                      {m.kind === "skub" ? <SkubCard /> : m.kind === "voice" ? <Voice mine={mine} />
                        : <p className={`max-w-[460px] px-4 py-2.5 text-[14.5px] leading-[1.45] ${mine ? "rounded-[20px] rounded-br-[6px] text-white" : "rounded-[20px] rounded-bl-[6px] bg-white text-heading shadow-[0_1px_2px_rgba(32,22,19,.06)]"}`} style={mine ? { background: INK } : undefined}>{m.text}</p>}
                      {m.react && <span className={`-mt-2 rounded-full bg-white px-1.5 text-[13px] shadow-[0_2px_8px_rgba(32,22,19,.15)] ${mine ? "mr-2" : "ml-2"}`}>{m.react}</span>}
                    </div>
                  </div>
                  {(mine && (!lines[i + 1] || lines[i + 1].from !== "me")) && <p className="mt-1 flex items-center justify-end gap-1 text-[10.5px] text-muted">Læst {m.at.split(" ").slice(-1)[0]}<CheckIcon size={11} weight="bold" style={{ color: GREEN }} /></p>}
                </div>
              );
            })}
            {typing && <div className={`mt-2 flex items-end gap-2 ${POP}`}><Face w={P.jk} size={28} /><span className="rounded-[20px] rounded-bl-[6px] bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(32,22,19,.06)]"><Dots /></span></div>}
          </div>
        </div>
        <div className="border-t bg-white/80 p-3 backdrop-blur" style={{ borderColor: LINE }}>
          <div className="mx-auto max-w-[680px]">
            <div className="mb-2 flex gap-1.5 overflow-x-auto">{["Tak, jeg tager den i dag 👍", "Kan vi tage det mandag?", "Jeg sidder fast i lektion 5"].map((s) => <button key={s} onClick={() => send(s, "jk")} className="shrink-0 rounded-full border bg-white px-3 py-1.5 text-[12.5px] text-heading transition hover:border-[#201613]" style={{ borderColor: "#ece4df" }}>{s}</button>)}</div>
            <Send onSend={(t) => send(t, "jk")} placeholder="Besked til Jonas …" />
          </div>
        </div>
      </section>
    </div>
  );
}
