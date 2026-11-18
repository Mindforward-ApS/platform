"use client";
// Three versions of Beskeder (Marco 2026-11-03: "Beskeder skal være vanvittigt"). Refs: design/references/beskeder/.
// M Samtaler — three panes: conversation list with tabs, a rich chat (feedback, skub and course cards inside the
//              conversation), and a context panel about the person or thread (slothUI chat, ManteUI, Planso).
// N Indbakke — a smart inbox grouped by kind (feedback, skub, hold, nyt), each message a card with its one action,
//              plus "Klar"/done like Linear's inbox (Superhuman / Linear inbox).
// O Holdet   — channels for the team: #del-gode-eksempler with shared prompts you can copy and try, reactions,
//              threads, and DMs (Conceptzilla / Slack-like, slothUI channels).
// Example data. Messages you send are added locally.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, ArrowUpIcon, ArrowUUpLeftIcon, BellRingingIcon, BookOpenIcon, ChatCircleIcon, CheckCircleIcon, CheckIcon, CopyIcon, FlaskIcon, HashIcon, MagnifyingGlassIcon, PaperclipIcon, PushPinIcon, SealCheckIcon, SmileyIcon, SparkleIcon, TrayIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";

const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613", LINE = "#f1e9e4";
const STAGE = "linear-gradient(160deg, #33231f 0%, #201613 55%, #1a0f0c 100%)";
const card = "relative min-w-0 rounded-[16px] bg-white";

// ——— shared bits ———
export type Who = { id: string; name: string; initials: string; role: string; mf?: boolean; online?: boolean };
export const P: Record<string, Who> = {
  me: { id: "me", name: "Sofie Lund", initials: "SL", role: "Kundeservice" },
  mf: { id: "mf", name: "Mindforward", initials: "MF", role: "Din AI-træner", mf: true, online: true },
  jk: { id: "jk", name: "Jonas Kirk", initials: "JK", role: "Salgschef · din leder", online: true },
  ib: { id: "ib", name: "Ida Brandt", initials: "IB", role: "Kundeservice", online: true },
  mh: { id: "mh", name: "Mads Holm", initials: "MH", role: "Sælger" },
  ed: { id: "ed", name: "Emil Dahl", initials: "ED", role: "Kundeservice" },
};

export function Av({ w, size = 36, ring }: { w: Who; size?: number; ring?: boolean }) {
  return (
    <span className="relative h-fit shrink-0 self-start">
      <span className={`grid place-items-center rounded-full font-semibold ${ring ? "ring-2 ring-white" : ""}`} style={{ width: size, height: size, fontSize: size * 0.34, background: w.mf ? STAGE : w.id === "me" ? "#fdf0ea" : "#f3eeeb", color: w.mf ? "#fff" : w.id === "me" ? "#c4502f" : INK }}>
        {w.mf ? <SparkleIcon size={size * 0.45} weight="fill" style={{ color: "#f6b49b" }} /> : w.initials}
      </span>
      {w.online && <span className="absolute -bottom-px -right-px size-3 rounded-full border-2 border-white" style={{ background: GREEN }} />}
    </span>
  );
}

export function Composer({ onSend, placeholder = "Skriv en besked …", dark }: { onSend: (t: string) => void; placeholder?: string; dark?: boolean }) {
  const [t, setT] = useState("");
  const send = () => { if (t.trim()) { onSend(t.trim()); setT(""); } };
  return (
    <div className={`flex items-end gap-2 rounded-[14px] border p-2 ${dark ? "border-white/15 bg-white/[0.06]" : "bg-white"}`} style={dark ? undefined : { borderColor: "#ece4df" }}>
      <button aria-label="Vedhæft" className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${dark ? "text-white/60 hover:bg-white/10" : "text-muted hover:bg-[#f7f2ee]"}`}><PaperclipIcon size={17} /></button>
      <textarea value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={1} placeholder={placeholder} className={`max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[13.5px] outline-none ${dark ? "text-white placeholder:text-white/40" : "text-heading placeholder:text-muted"}`} />
      <button aria-label="Emoji" className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${dark ? "text-white/60 hover:bg-white/10" : "text-muted hover:bg-[#f7f2ee]"}`}><SmileyIcon size={17} /></button>
      <button onClick={send} disabled={!t.trim()} aria-label="Send" className="grid size-9 shrink-0 place-items-center rounded-[10px] text-white transition disabled:opacity-35" style={{ background: O }}><ArrowUpIcon size={16} weight="bold" /></button>
    </div>
  );
}

export function useScrollBottom(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [dep]);
  return ref;
}

// Rich message cards used inside conversations.
export function FeedbackCard() {
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: "#ece4df" }}>
      <div className="flex items-center gap-3 p-3.5 text-white" style={{ background: STAGE }}>
        <div className="min-w-0 flex-1"><p className="text-[11px] text-white/55">Opgave · Øvemiljø</p><p className="truncate text-[14px] font-semibold">Omskriv en dårlig prompt</p></div>
        <p className="text-right"><span className="text-[28px] font-semibold leading-none tracking-[-0.04em]">86</span><span className="text-[11px] text-white/55"> /100</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 text-[12px]">
        <div className="rounded-[10px] bg-[#f1faf5] p-2.5"><p className="font-semibold text-[#2f8a5c]">Det gik godt</p><p className="mt-1 text-heading">Klart format og en godt valgt rolle.</p></div>
        <div className="rounded-[10px] bg-[#fdf3ee] p-2.5"><p className="font-semibold text-[#c4502f]">Gør det bedre</p><p className="mt-1 text-heading">Giv ét eksempel på jeres tone.</p></div>
      </div>
      <Link href="/oevemiljoe" className="flex items-center justify-between border-t px-3.5 py-2.5 text-[12.5px] font-semibold text-heading hover:bg-[#fbf8f6]" style={{ borderColor: LINE }}>Prøv opgaven igen <ArrowRightIcon size={13} weight="bold" /></Link>
    </div>
  );
}
export function CourseCard() {
  return (
    <Link href="/kurser" className="flex w-full max-w-[420px] items-center gap-3 rounded-[14px] border bg-white p-3 transition hover:border-[#e6d9d2]" style={{ borderColor: "#ece4df" }}>
      <span className="grid size-12 shrink-0 place-items-center rounded-[11px]" style={{ background: "#fdf0ea", color: O }}><BookOpenIcon size={22} weight="fill" /></span>
      <span className="min-w-0 flex-1"><b className="block truncate text-[13.5px] font-semibold text-heading">Research og opsummering med AI</b><small className="text-[11.5px] text-muted">Nyt kursus · 9 lektioner · 75 min</small></span>
      <span className="inline-flex h-8 items-center rounded-full px-3 text-[11.5px] font-semibold text-white" style={{ background: INK }}>Se</span>
    </Link>
  );
}
export function SkubCard() {
  return (
    <div className="w-full max-w-[420px] rounded-[14px] border p-3.5" style={{ borderColor: "#f3c8b6", background: "#fffaf7" }}>
      <p className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: O }}><BellRingingIcon size={13} weight="fill" />Skub fra Jonas · privat</p>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-heading">Du er 40 % inde i AI på arbejdet. Næste lektion tager 10 minutter. Tag den, før ugen er gået.</p>
      <Link href="/kurser/ai-paa-arbejdet/6" className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white" style={{ background: O }}>Start lektion 6 <ArrowRightIcon size={13} weight="bold" /></Link>
    </div>
  );
}

// ——— M · Samtaler ———
export type Msg = { from: string; at: string; text?: string; kind?: "feedback" | "course" | "skub"; react?: string };
export type Conv = { id: string; with: Who; title?: string; tag: "Mindforward" | "Hold" | "Leder"; unread: number; msgs: Msg[] };
export const CONVS: Conv[] = [
  { id: "c1", with: P.mf, tag: "Mindforward", unread: 1, msgs: [
    { from: "mf", at: "Man 08.00", kind: "course", text: "Et nyt kursus er klar i dit katalog." },
    { from: "me", at: "Man 08.14", text: "Fedt. Passer det til kundeservice?" },
    { from: "mf", at: "Man 08.14", text: "Ja. Lektion 4 og 5 handler om at opsummere lange kundemails, og opgaven bruger jeres egne skabeloner." },
    { from: "mf", at: "I dag 09.12", kind: "feedback", text: "Din opgave er bedømt." },
  ] },
  { id: "c2", with: P.jk, tag: "Leder", unread: 1, msgs: [
    { from: "jk", at: "I går 14.03", text: "Hej alle. Tag gerne et eksempel med til mandag, hvor AI sparede jer tid i denne uge. Fem minutter hver." },
    { from: "me", at: "I går 14.20", text: "Gør jeg. Jeg tager mailen til kunden med leveringsdatoen.", react: "👍" },
    { from: "jk", at: "I dag 08.40", kind: "skub" },
  ] },
  { id: "c3", with: P.ib, tag: "Hold", unread: 0, msgs: [
    { from: "ib", at: "Fre 11.41", text: "Tak for skabelonen, den virker også til klager. Må jeg dele den med resten af kundeservice?" },
    { from: "me", at: "Fre 11.50", text: "Selvfølgelig, del løs." },
    { from: "ib", at: "Fre 11.52", text: "Super. Jeg lægger den i #del-gode-eksempler.", react: "🙌" },
  ] },
  { id: "c4", with: P.mh, tag: "Hold", unread: 0, msgs: [{ from: "mh", at: "Ons 15.10", text: "Hvordan fik du Copilot til at skrive på dansk hele vejen igennem?" }, { from: "me", at: "Ons 15.22", text: "Skriv det i første linje: \"Svar altid på dansk.\" Så holder den det." }] },
];

export function M() {
  const [convs, setConvs] = useState(CONVS);
  const [sel, setSel] = useState("c1");
  const [tab, setTab] = useState<"Alle" | "Ulæste" | "Hold" | "Mindforward">("Alle");
  const [q, setQ] = useState("");
  const c = convs.find((x) => x.id === sel)!;
  const scroller = useScrollBottom(c.msgs.length + sel);
  const list = convs.filter((x) => (tab === "Alle" || (tab === "Ulæste" && x.unread) || (tab === "Hold" && (x.tag === "Hold" || x.tag === "Leder")) || (tab === "Mindforward" && x.tag === "Mindforward")) && (!q || x.with.name.toLowerCase().includes(q.toLowerCase())));
  const open = (id: string) => { setSel(id); setConvs((cs) => cs.map((x) => (x.id === id ? { ...x, unread: 0 } : x))); };
  const send = (text: string) => setConvs((cs) => cs.map((x) => (x.id === sel ? { ...x, msgs: [...x.msgs, { from: "me", at: "Nu", text }] } : x)));
  const last = (x: Conv) => { const m = x.msgs[x.msgs.length - 1]; return m.kind === "feedback" ? "Din opgave fik 86 point" : m.kind === "skub" ? "Skub: tag lektion 6" : m.kind === "course" ? "Nyt kursus klar" : m.text ?? ""; };
  return (
    <div className="grid gap-3 lg:h-[max(600px,calc(100svh-5.9rem))] lg:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)_300px]">
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-kf]) { padding-bottom: 0; } [data-kf] { padding-bottom: 0 !important; } }`}</style>
      <aside className={`${card} flex min-h-0 flex-col p-3`}>
        <div className="flex items-center justify-between px-1.5 pb-2 pt-1"><h1 className="text-[22px] font-semibold tracking-[-0.02em] text-heading">Beskeder</h1><Demo /></div>
        <label className="relative"><span className="sr-only">Søg</span><MagnifyingGlassIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg i samtaler" className="h-9 w-full rounded-[10px] bg-[#f7f2ee] pl-9 pr-3 text-[12.5px] outline-none focus:ring-2 focus:ring-[#201613]" /></label>
        <div className="mt-2 flex gap-1 overflow-x-auto">{(["Alle", "Ulæste", "Hold", "Mindforward"] as const).map((t) => <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t} className={`h-8 shrink-0 rounded-full px-3 text-[12px] font-medium ${tab === t ? "bg-[#201613] text-white" : "text-muted hover:bg-[#f7f2ee]"}`}>{t}{t === "Ulæste" && convs.some((x) => x.unread) ? ` ${convs.filter((x) => x.unread).length}` : ""}</button>)}</div>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto">
          {list.map((x) => (
            <li key={x.id}>
              <button onClick={() => open(x.id)} className={`flex w-full items-center gap-3 rounded-[12px] p-2.5 text-left transition ${sel === x.id ? "bg-[#fbf3ee]" : "hover:bg-[#fbf8f6]"}`}>
                <Av w={x.with} size={42} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><b className="truncate text-[13.5px] font-semibold text-heading">{x.with.name}</b><small className="shrink-0 text-[10.5px] text-muted">{x.msgs[x.msgs.length - 1].at.replace("I dag ", "")}</small></span>
                  <span className="flex items-center justify-between gap-2"><span className={`truncate text-[12px] ${x.unread ? "font-semibold text-heading" : "text-muted"}`}>{last(x)}</span>{x.unread > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full text-[10.5px] font-bold text-white" style={{ background: O }}>{x.unread}</span>}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className={`${card} flex min-h-[560px] flex-col overflow-hidden lg:min-h-0`}>
        <header className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: LINE }}>
          <Av w={c.with} size={40} />
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-heading">{c.with.name}</p><p className="text-[11.5px] text-muted">{c.with.online ? "Online · " : ""}{c.with.role}</p></div>
          <button aria-label="Fastgør" className="grid size-9 place-items-center rounded-[10px] text-muted hover:bg-[#f7f2ee]"><PushPinIcon size={17} /></button>
        </header>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto bg-[#fcfaf8] px-5 py-5">
          <div className="mx-auto flex max-w-[720px] flex-col gap-3">
            {c.msgs.map((m, i) => {
              const mine = m.from === "me";
              const w = P[m.from];
              const day = (a: string) => a.split(" ").slice(0, -1).join(" ") || "I dag";
              const showDay = i === 0 || day(c.msgs[i - 1].at) !== day(m.at);
              return (
                <div key={i}>
                  {showDay && <p className="my-2 text-center text-[11px] font-medium text-muted"><span className="rounded-full bg-white px-3 py-1 shadow-[0_1px_2px_rgba(32,22,19,.06)]">{day(m.at)}</span></p>}
                  <div className={`flex items-end gap-2.5 ${mine ? "flex-row-reverse" : ""} [&>span:first-child]:self-end`}>
                    {!mine && <Av w={w} size={30} />}
                    <div className={`flex min-w-0 flex-col gap-1 ${mine ? "items-end" : "items-start"}`}>
                      {m.kind === "feedback" ? <FeedbackCard /> : m.kind === "course" ? <><p className="rounded-[16px] rounded-bl-[4px] bg-white px-3.5 py-2.5 text-[13.5px] text-heading shadow-[0_1px_2px_rgba(32,22,19,.06)]">{m.text}</p><CourseCard /></> : m.kind === "skub" ? <SkubCard /> : (
                        <p className={`max-w-[520px] whitespace-pre-line px-3.5 py-2.5 text-[13.5px] leading-[1.5] ${mine ? "rounded-[16px] rounded-br-[4px] text-white" : "rounded-[16px] rounded-bl-[4px] bg-white text-heading shadow-[0_1px_2px_rgba(32,22,19,.06)]"}`} style={mine ? { background: INK } : undefined}>{m.text}</p>
                      )}
                      <span className="flex items-center gap-1.5 text-[10.5px] text-muted">{m.at.split(" ").slice(-1)[0]}{mine && <CheckIcon size={11} weight="bold" style={{ color: GREEN }} />}{m.react && <span className="rounded-full bg-white px-1.5 py-px text-[11px] shadow-[0_1px_2px_rgba(32,22,19,.08)]">{m.react}</span>}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-t p-3" style={{ borderColor: LINE }}>
          {c.with.mf && <div className="mb-2 flex flex-wrap gap-1.5">{["Hvad skal jeg øve i dag?", "Forklar feedbacken", "Find et kursus til mig"].map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border px-3 py-1.5 text-[12px] text-heading hover:bg-[#f7f2ee]" style={{ borderColor: "#ece4df" }}>{s}</button>)}</div>}
          <Composer onSend={send} placeholder={`Skriv til ${c.with.name.split(" ")[0]} …`} />
        </div>
      </section>

      <aside className={`${card} hidden min-h-0 flex-col overflow-y-auto p-5 2xl:flex`}>
        <div className="flex flex-col items-center text-center"><Av w={c.with} size={72} /><p className="mt-3 text-[16px] font-semibold text-heading">{c.with.name}</p><p className="text-[12px] text-muted">{c.with.role}</p></div>
        {c.with.mf ? (
          <div className="mt-5 grid gap-2">
            <p className="text-[12px] font-semibold text-heading">Det ved Mindforward om dig</p>
            {[["Kursus i gang", "AI på arbejdet · 40 %"], ["Seneste score", "86 · Omskriv en dårlig prompt"], ["Næste opgave", "Tjek et AI-svar for fejl"]].map(([k, v]) => <div key={k} className="rounded-[12px] bg-[#f7f2ee] p-3"><p className="text-[11px] text-muted">{k}</p><p className="text-[12.5px] font-medium text-heading">{v}</p></div>)}
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            <p className="text-[12px] font-semibold text-heading">Fælles</p>
            {[["Hold", "Salg & service"], ["Kursus", c.with.id === "jk" ? "Led et team, der bruger AI" : "Skriv prompts, der giver brugbare svar"], ["Delt", "Prompt-skabelon til klager"]].map(([k, v]) => <div key={k} className="rounded-[12px] bg-[#f7f2ee] p-3"><p className="text-[11px] text-muted">{k}</p><p className="text-[12.5px] font-medium text-heading">{v}</p></div>)}
          </div>
        )}
        <p className="mt-auto pt-5 text-[11px] text-muted">Beskeder mellem dig og din leder er private. Lederen kan ikke se, hvad du skriver i øvemiljøet.</p>
      </aside>
    </div>
  );
}

// ——— N · Indbakke ———
type Item = { id: string; kind: "Feedback" | "Skub" | "Hold" | "Nyt"; from: Who; title: string; body: string; at: string; action?: { label: string; href: string }; extra?: "feedback" | "skub" | "course" };
const ITEMS: Item[] = [
  { id: "i1", kind: "Feedback", from: P.mf, title: "Din opgave fik 86 point", body: "Formatet er klart, og rollen er godt valgt. Prøv at give ét eksempel på den tone, I bruger på hjemmesiden.", at: "09.12", action: { label: "Prøv igen", href: "/oevemiljoe" }, extra: "feedback" },
  { id: "i2", kind: "Skub", from: P.jk, title: "Jonas har sendt dig et skub", body: "Du er 40 % inde i AI på arbejdet. Næste lektion tager 10 minutter.", at: "08.40", action: { label: "Start lektion 6", href: "/kurser/ai-paa-arbejdet/6" }, extra: "skub" },
  { id: "i3", kind: "Hold", from: P.jk, title: "Holdmøde mandag", body: "Tag gerne et eksempel med, hvor AI sparede dig tid i denne uge. Fem minutter hver.", at: "I går", action: { label: "Svar", href: "#" } },
  { id: "i4", kind: "Nyt", from: P.mf, title: "Nyt kursus: Research med AI", body: "9 lektioner, 75 minutter, opgaver i øvemiljøet.", at: "Man", action: { label: "Se kurset", href: "/kurser" }, extra: "course" },
  { id: "i5", kind: "Hold", from: P.ib, title: "Ida delte din skabelon", body: "Din prompt-skabelon til klager er delt i #del-gode-eksempler. 4 har brugt den.", at: "Fre", action: { label: "Se tråden", href: "#" } },
  { id: "i6", kind: "Feedback", from: P.mf, title: "Ny rekord: 92 point", body: "\"Hvad må du dele?\" er din bedste score indtil nu.", at: "Tor", action: { label: "Se opgaven", href: "/oevemiljoe" } },
];
const KIND: Record<Item["kind"], { icon: typeof FlaskIcon; c: string; bg: string }> = {
  Feedback: { icon: FlaskIcon, c: "#c4502f", bg: "#fdf0ea" },
  Skub: { icon: BellRingingIcon, c: "#8a5a00", bg: "#fdf3dc" },
  Hold: { icon: ChatCircleIcon, c: "#2f8a5c", bg: "#e8f6ee" },
  Nyt: { icon: SparkleIcon, c: INK, bg: "#efe8e4" },
};

export function N() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [seen, setSeen] = useState<Record<string, boolean>>({ i5: true, i6: true });
  const [sel, setSel] = useState("i1");
  const [view, setView] = useState<"Indbakke" | "Klar">("Indbakke");
  const [kind, setKind] = useState<Item["kind"] | "Alle">("Alle");
  const list = ITEMS.filter((i) => (view === "Klar" ? done[i.id] : !done[i.id]) && (kind === "Alle" || i.kind === kind));
  const it = ITEMS.find((i) => i.id === sel) ?? list[0];
  const [replies, setReplies] = useState<Record<string, string[]>>({});
  const markDone = (id: string) => { setDone({ ...done, [id]: true }); const nxt = list.find((x) => x.id !== id); if (nxt) setSel(nxt.id); };
  const open = (id: string) => { setSel(id); setSeen({ ...seen, [id]: true }); };
  return (
    <div className="grid gap-3 lg:h-[max(600px,calc(100svh-5.9rem))] lg:grid-cols-[230px_380px_minmax(0,1fr)]">
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-kf]) { padding-bottom: 0; } [data-kf] { padding-bottom: 0 !important; } }`}</style>
      <aside className="flex flex-col gap-1 rounded-[16px] p-3 text-white" style={{ background: STAGE }}>
        <p className="px-2 pb-3 pt-1 text-[20px] font-semibold tracking-[-0.02em]">Beskeder</p>
        {(["Indbakke", "Klar"] as const).map((v) => { const n = ITEMS.filter((i) => (v === "Klar" ? done[i.id] : !done[i.id])).length; return <button key={v} onClick={() => setView(v)} className={`flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-[13px] font-medium ${view === v ? "bg-white/[0.12]" : "text-white/70 hover:bg-white/[0.06]"}`}>{v === "Indbakke" ? <TrayIcon size={17} /> : <CheckCircleIcon size={17} />}<span className="flex-1 text-left">{v}</span><span className="text-[11.5px] tabular-nums text-white/55">{n}</span></button>; })}
        <p className="mt-4 px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/45">Type</p>
        {(["Alle", "Feedback", "Skub", "Hold", "Nyt"] as const).map((k) => {
          const K = k === "Alle" ? null : KIND[k];
          return <button key={k} onClick={() => setKind(k)} className={`flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-[12.5px] ${kind === k ? "bg-white/[0.12] font-medium" : "text-white/70 hover:bg-white/[0.06]"}`}>{K ? <i className="size-2 rounded-full" style={{ background: K.c === INK ? "#f6b49b" : K.c }} /> : <i className="size-2" />}{k}</button>;
        })}
        <p className="mt-auto px-3 pt-4 text-[11px] leading-snug text-white/45">Sæt beskeder til <b className="text-white/70">Klar</b>, når du har gjort det, de beder om. Så er indbakken din huskeliste.</p>
      </aside>
      <section className={`${card} flex min-h-0 flex-col p-2`}>
        <div className="flex items-center justify-between px-3 py-2.5"><p className="text-[14px] font-semibold text-heading">{view}{kind !== "Alle" ? ` · ${kind}` : ""}</p><Demo /></div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {list.map((i) => {
            const K = KIND[i.kind];
            return (
              <li key={i.id}>
                <button onClick={() => open(i.id)} className={`group relative flex w-full gap-3 rounded-[12px] p-3 text-left transition ${it?.id === i.id ? "bg-[#fbf3ee]" : "hover:bg-[#fbf8f6]"}`}>
                  {!seen[i.id] && <i className="absolute left-1 top-1/2 size-1.5 -translate-y-1/2 rounded-full" style={{ background: O }} />}
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px]" style={{ background: K.bg, color: K.c }}><K.icon size={17} weight="fill" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2"><b className={`truncate text-[13px] text-heading ${seen[i.id] ? "font-medium" : "font-semibold"}`}>{i.title}</b><small className="shrink-0 text-[10.5px] text-muted">{i.at}</small></span>
                    <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">{i.from.name} · {i.body}</span>
                  </span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="grid place-items-center px-6 py-20 text-center"><CheckCircleIcon size={34} weight="fill" style={{ color: GREEN }} /><p className="mt-3 text-[14px] font-semibold text-heading">{view === "Klar" ? "Intet klaret endnu" : "Indbakken er tom"}</p><p className="mt-1 text-[12px] text-muted">{view === "Klar" ? "Det, du sætter til Klar, ligger her." : "Godt gået. Du har gjort det hele."}</p></li>}
        </ul>
      </section>
      <section className={`${card} flex min-h-[520px] flex-col overflow-hidden lg:min-h-0`}>
        {it ? (
          <>
            <header className="flex flex-wrap items-center gap-3 border-b px-6 py-4" style={{ borderColor: LINE }}>
              <Av w={it.from} size={40} />
              <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-heading">{it.from.name}</p><p className="text-[11.5px] text-muted">{it.from.role} · {it.at}</p></div>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: KIND[it.kind].bg, color: KIND[it.kind].c }}>{it.kind}</span>
              {!done[it.id] ? <button onClick={() => markDone(it.id)} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-semibold text-heading hover:bg-[#f7f2ee]" style={{ borderColor: "#ece4df" }}><CheckIcon size={13} weight="bold" />Klar</button> : <span className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold text-[#2f8a5c]" style={{ background: "#e8f6ee" }}><CheckIcon size={13} weight="bold" />Klaret</span>}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="max-w-[620px]">
                <h2 className="text-[26px] font-bold leading-[1.1] tracking-[-0.03em] text-heading">{it.title}</h2>
                <p className="mt-3 text-[15px] leading-[1.6] text-text">{it.body}</p>
                <div className="mt-5">{it.extra === "feedback" ? <FeedbackCard /> : it.extra === "skub" ? <SkubCard /> : it.extra === "course" ? <CourseCard /> : null}</div>
                {it.action && !it.extra && <Link href={it.action.href} className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white" style={{ background: INK }}>{it.action.label}<ArrowRightIcon size={13} weight="bold" /></Link>}
                {(replies[it.id] ?? []).map((r, k) => <div key={k} className="mt-4 flex justify-end"><p className="max-w-[440px] rounded-[16px] rounded-br-[4px] px-3.5 py-2.5 text-[13.5px] text-white" style={{ background: INK }}>{r}</p></div>)}
              </div>
            </div>
            {it.from.id !== "mf" || it.kind === "Feedback" ? <div className="border-t p-3" style={{ borderColor: LINE }}><Composer onSend={(t) => setReplies({ ...replies, [it.id]: [...(replies[it.id] ?? []), t] })} placeholder={`Svar ${it.from.name.split(" ")[0]} …`} /></div> : null}
          </>
        ) : <div className="grid flex-1 place-items-center text-[13px] text-muted">Vælg en besked</div>}
      </section>
    </div>
  );
}

// ——— O · Holdet ———
type Post = { id: string; who: string; at: string; text: string; prompt?: string; tool?: string; reacts: Record<string, number>; replies?: number };
const CHANNELS = [
  { id: "eksempler", name: "del-gode-eksempler", topic: "Prompts og tricks, der virker. Kopiér og prøv.", unread: 3 },
  { id: "salg", name: "salg-og-service", topic: "Hele holdet · beskeder fra Jonas", unread: 1 },
  { id: "hjaelp", name: "hjælp-til-ai", topic: "Spørg, hvis noget driller", unread: 0 },
];
const POSTS: Record<string, Post[]> = {
  eksempler: [
    { id: "p1", who: "ib", at: "Fre 11.55", text: "Den her prompt har sparet mig for mindst en halv time om dagen på klager. Den er bygget på Sofies skabelon.", prompt: "Du er kundeservice hos Nordlys. Skriv et kort, venligt svar på klagen herunder. Anerkend problemet, giv en ny dato, og hold det under 120 ord. Svar på dansk.", tool: "ChatGPT", reacts: { "🙌": 6, "🔥": 3 }, replies: 4 },
    { id: "p2", who: "mh", at: "I går 10.20", text: "Tilbud ud fra stikord på 2 minutter. Husk at tjekke priserne bagefter, den gætter nogle gange.", prompt: "Lav et første udkast til et tilbud ud fra stikordene herunder. Brug vores standardforbehold. Markér alle priser med [TJEK].", tool: "Copilot", reacts: { "👍": 5 }, replies: 2 },
    { id: "p3", who: "ed", at: "I dag 08.05", text: "Lille trick: bed den stille dig tre spørgsmål, før den skriver noget. Svarene bliver meget bedre.", reacts: { "💡": 7, "👍": 2 } },
  ],
  salg: [{ id: "s1", who: "jk", at: "I går 14.03", text: "Hej alle. Tag gerne et eksempel med til mandag, hvor AI sparede jer tid i denne uge. Fem minutter hver.", reacts: { "👍": 5 }, replies: 3 }],
  hjaelp: [{ id: "h1", who: "mh", at: "Ons 15.10", text: "Hvordan fik I Copilot til at skrive på dansk hele vejen igennem?", reacts: {}, replies: 2 }],
};

export function Ov() {
  const [ch, setCh] = useState("eksempler");
  const [posts, setPosts] = useState(POSTS);
  const [copied, setCopied] = useState<string | null>(null);
  const c = CHANNELS.find((x) => x.id === ch)!;
  const scroller = useScrollBottom((posts[ch] ?? []).length + ch);
  const react = (id: string, e: string) => setPosts({ ...posts, [ch]: posts[ch].map((p) => (p.id === id ? { ...p, reacts: { ...p.reacts, [e]: (p.reacts[e] ?? 0) + 1 } } : p)) });
  const send = (text: string) => setPosts({ ...posts, [ch]: [...posts[ch], { id: `n${Date.now()}`, who: "me", at: "Nu", text, reacts: {} }] });
  const copy = (p: Post) => { navigator.clipboard?.writeText(p.prompt ?? ""); setCopied(p.id); setTimeout(() => setCopied(null), 1600); };
  return (
    <div className="grid gap-3 lg:h-[max(600px,calc(100svh-5.9rem))] lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_280px]">
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-kf]) { padding-bottom: 0; } [data-kf] { padding-bottom: 0 !important; } }`}</style>
      <aside className="flex min-h-0 flex-col rounded-[16px] p-3 text-white" style={{ background: STAGE }}>
        <div className="px-2 pb-3 pt-1"><p className="text-[19px] font-semibold tracking-[-0.02em]">Salg & service</p><p className="text-[11.5px] text-white/50">6 på holdet · 3 online</p></div>
        <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/45">Kanaler</p>
        {CHANNELS.map((x) => <button key={x.id} onClick={() => setCh(x.id)} className={`flex h-9 items-center gap-2 rounded-[9px] px-2.5 text-[13px] ${ch === x.id ? "bg-white/[0.12] font-semibold" : x.unread ? "font-semibold text-white" : "text-white/65 hover:bg-white/[0.06]"}`}><HashIcon size={15} className="text-white/50" /><span className="flex-1 truncate text-left">{x.name}</span>{x.unread > 0 && ch !== x.id && <span className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10.5px] font-bold" style={{ background: O }}>{x.unread}</span>}</button>)}
        <p className="mt-4 px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/45">Direkte</p>
        {[P.mf, P.jk, P.ib, P.mh].map((w) => <Link key={w.id} href="/beskeder-forslag/m" className="flex h-10 items-center gap-2.5 rounded-[9px] px-2 text-[13px] text-white/75 hover:bg-white/[0.06]"><span className="relative"><span className="grid size-7 place-items-center rounded-full bg-white/12 text-[10px] font-semibold">{w.mf ? <SparkleIcon size={13} weight="fill" style={{ color: "#f6b49b" }} /> : w.initials}</span>{w.online && <i className="absolute -bottom-px -right-px size-2.5 rounded-full border-2 border-[#241815]" style={{ background: GREEN }} />}</span>{w.name}</Link>)}
      </aside>

      <section className={`${card} flex min-h-[560px] flex-col overflow-hidden lg:min-h-0`}>
        <header className="flex items-center gap-3 border-b px-5 py-3.5" style={{ borderColor: LINE }}>
          <span className="grid size-10 place-items-center rounded-[11px] bg-[#f7f2ee] text-heading"><HashIcon size={19} weight="bold" /></span>
          <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold text-heading">{c.name}</p><p className="truncate text-[11.5px] text-muted">{c.topic}</p></div>
          <Demo />
        </header>
        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ol className="mx-auto grid max-w-[760px] gap-1">
            {(posts[ch] ?? []).map((p) => {
              const w = P[p.who];
              return (
                <li key={p.id} className="group flex gap-3 rounded-[12px] px-2 py-3 hover:bg-[#fbf8f6]">
                  <Av w={w} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2"><b className="text-[13.5px] font-semibold text-heading">{w.name}</b><small className="text-[11px] text-muted">{p.at}</small>{p.tool && <span className="rounded-full bg-[#f3eeeb] px-2 py-px text-[10.5px] font-medium text-heading">{p.tool}</span>}</p>
                    <p className="mt-0.5 text-[13.5px] leading-[1.55] text-heading">{p.text}</p>
                    {p.prompt && (
                      <div className="mt-2.5 max-w-[620px] overflow-hidden rounded-[12px] text-white" style={{ background: STAGE }}>
                        <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2 text-[11px] text-white/55"><span className="flex items-center gap-1.5"><SparkleIcon size={12} weight="fill" style={{ color: "#f6b49b" }} />Prompt</span>
                          <span className="flex gap-1">
                            <button onClick={() => copy(p)} className="inline-flex h-7 items-center gap-1 rounded-full bg-white/10 px-2.5 font-medium text-white hover:bg-white/15">{copied === p.id ? <><CheckIcon size={11} weight="bold" />Kopieret</> : <><CopyIcon size={12} />Kopiér</>}</button>
                            <Link href={`/oevemiljoe/${(p.tool ?? "chatgpt").toLowerCase()}?tekst=${encodeURIComponent(p.prompt)}`} className="inline-flex h-7 items-center gap-1 rounded-full px-2.5 font-semibold text-white" style={{ background: O }}>Prøv i øvemiljøet<ArrowRightIcon size={11} weight="bold" /></Link>
                          </span>
                        </div>
                        <p className="px-3.5 py-3 font-mono text-[12.5px] leading-[1.6] text-white/90">{p.prompt}</p>
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {Object.entries(p.reacts).map(([e, n]) => <button key={e} onClick={() => react(p.id, e)} className="inline-flex h-7 items-center gap-1 rounded-full border bg-white px-2 text-[12px] hover:bg-[#fdf3ee]" style={{ borderColor: "#ece4df" }}>{e}<span className="tabular-nums text-muted">{n}</span></button>)}
                      <button onClick={() => react(p.id, "👍")} aria-label="Reagér" className="grid size-7 place-items-center rounded-full text-muted opacity-0 transition hover:bg-[#f3eeeb] group-hover:opacity-100"><SmileyIcon size={15} /></button>
                      {p.replies ? <button className="ml-1 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: O }}><ArrowUUpLeftIcon size={13} />{p.replies} svar</button> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="border-t p-3" style={{ borderColor: LINE }}><Composer onSend={send} placeholder={`Skriv i #${c.name} …`} /></div>
      </section>

      <aside className={`${card} hidden min-h-0 flex-col gap-4 overflow-y-auto p-5 2xl:flex`}>
        <div><p className="flex items-center gap-1.5 text-[13px] font-semibold text-heading"><PushPinIcon size={14} weight="fill" style={{ color: O }} />Fastgjort</p><div className="mt-2 rounded-[12px] bg-[#f7f2ee] p-3 text-[12px] leading-snug text-heading">Del kun fiktive eller anonymiserede eksempler. Ingen kundenavne eller CPR-numre.</div></div>
        <div><p className="flex items-center gap-1.5 text-[13px] font-semibold text-heading"><SealCheckIcon size={14} weight="fill" style={{ color: GREEN }} />Mest brugte prompts</p><ol className="mt-2 grid gap-1.5">{[["Svar på klager", "Ida", 14], ["Tilbud fra stikord", "Mads", 9], ["Mødereferat på 5 linjer", "Sofie", 6]].map(([t, w, n], k) => <li key={t} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 hover:bg-[#fbf8f6]"><span className="w-4 text-[12px] font-bold" style={{ color: O }}>{k + 1}</span><span className="min-w-0 flex-1"><b className="block truncate text-[12.5px] font-semibold text-heading">{t}</b><small className="text-[11px] text-muted">af {w}</small></span><span className="text-[11.5px] tabular-nums text-muted">{n}×</span></li>)}</ol></div>
        <div><p className="text-[13px] font-semibold text-heading">På holdet</p><ul className="mt-2 grid gap-2">{[P.jk, P.ib, P.mh, P.ed].map((w) => <li key={w.id} className="flex items-center gap-2.5"><Av w={w} size={30} /><span className="min-w-0"><b className="block truncate text-[12.5px] font-semibold text-heading">{w.name}</b><small className="text-[11px] text-muted">{w.role}</small></span></li>)}</ul></div>
      </aside>
    </div>
  );
}
