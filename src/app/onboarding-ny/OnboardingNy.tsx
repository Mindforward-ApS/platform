"use client";

// Onboarding, round 2 (Marco 2026-11-11: "meget flottere og mere interaktivt, det skal give mening når man tilmelder
// sig"). One question per screen on the left; on the right the learner's plan builds itself live from the answers,
// so every question visibly matters (the pattern of Linear / Notion / Headspace onboarding). Keyboard: 1–6 picks,
// Enter continues, Esc goes back. Clickable preview: nothing is saved and no e-mail is sent.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";

const c = { ink: "#201613", muted: "#6b625d", coral: "#e8664a", coralText: "#b8452c", page: "#f7f2ee", line: "#e7e0db", dark: "#201613", soft: "#fbe1d7" };
type Kind = "privat" | "virksomhed";
type Tool = "chatgpt" | "copilot" | "claude" | "vedikke";

const goals = [
  { id: "mails", t: "Mails og svar", lessons: ["AI til mails", "Svar til en kunde, der venter"] },
  { id: "moeder", t: "Møder og referater", lessons: ["AI til møder og referater", "Referat på fem minutter"] },
  { id: "excel", t: "Excel og tal", lessons: ["Prompts til tal", "Formler uden at kunne kode"] },
  { id: "ideer", t: "Idéer og tekster", lessons: ["Prompts til tekst", "Få AI til at stille spørgsmål tilbage"] },
  { id: "tilbud", t: "Tilbud og salg", lessons: ["Lav et tilbud ud fra stikord", "Skriv til en ny kunde"] },
  { id: "data", t: "Persondata og GDPR", lessons: ["Hvad må du dele?", "Anonymiser før du deler"] },
];
const tools: { id: Tool; n: string; d: string }[] = [
  { id: "chatgpt", n: "ChatGPT", d: "Det mest brugte AI-værktøj" },
  { id: "copilot", n: "Copilot", d: "Indbygget i Microsoft 365, Outlook og Teams" },
  { id: "claude", n: "Claude", d: "Stærk til lange tekster og dokumenter" },
  { id: "vedikke", n: "Ved ikke endnu", d: "Vi anbefaler et ud fra dine svar" },
];
const quiz = [
  { q: "Hvor ofte bruger du AI i dag?", a: ["Aldrig", "Et par gange om måneden", "Hver uge", "Hver dag"] },
  { q: "Svaret er ikke godt nok. Hvad gør du?", a: ["Giver op", "Spørger igen med de samme ord", "Giver flere detaljer", "Beder AI'en stille spørgsmål først"] },
  { q: "Må du skrive et CPR-nummer i en AI-chat?", a: ["Ja", "Kun hvis det er min egen", "Nej", "Ved ikke"] },
];
const DOW = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function Card({ on, onClick, children, k }: { on?: boolean; onClick: () => void; children: React.ReactNode; k?: number }) {
  return (
    <button type="button" onClick={onClick}
      className={`group relative flex w-full items-center gap-4 rounded-[16px] border-2 bg-white p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(32,22,19,0.35)] active:translate-y-0 ${on ? "shadow-[0_10px_24px_-12px_rgba(232,102,74,0.6)]" : ""}`}
      style={{ borderColor: on ? c.coral : c.line }}>
      {children}
      {k !== undefined && <kbd className="ml-auto hidden size-6 shrink-0 place-items-center rounded-[6px] border text-[0.6875rem] font-semibold sm:grid" style={{ borderColor: on ? c.coral : c.line, color: on ? c.coralText : c.muted }}>{k}</kbd>}
    </button>
  );
}
function Next({ onClick, disabled, children = "Fortsæt" }: { onClick: () => void; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[0.9375rem] font-semibold text-white transition disabled:opacity-35" style={{ background: c.dark }}>
      {children}<span className="transition-transform group-enabled:group-hover:translate-x-1">→</span>
      <span className="ml-2 hidden rounded-[5px] bg-white/15 px-1.5 py-0.5 text-[0.625rem] font-medium sm:inline">Enter</span>
    </button>
  );
}
function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid min-w-0 gap-1.5 text-[0.8125rem] font-medium" style={{ color: c.muted }}>{label}
      <input {...p} className="h-12 w-full min-w-0 rounded-[12px] border-2 bg-white px-4 text-[1rem] outline-none transition focus:border-[#e8664a]" style={{ borderColor: c.line, color: c.ink }} />
    </label>
  );
}

function CodeInput({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const fill = (k: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) { const nv = [...v]; nv[k] = ""; setV(nv); return; }
    const nv = [...v]; digits.slice(0, 6 - k).split("").forEach((d, i) => { nv[k + i] = d; });
    setV(nv);
    const next = Math.min(5, k + digits.length); refs.current[next]?.focus();
    if (nv.every(Boolean)) setTimeout(onDone, 450);
  };
  const done = v.every(Boolean);
  return (
    <div className="flex justify-between gap-2">
      {v.map((x, k) => (
        <input key={k} ref={(el) => { refs.current[k] = el; }} value={x} inputMode="numeric" autoComplete={k === 0 ? "one-time-code" : "off"} aria-label={`Ciffer ${k + 1}`}
          onChange={(e) => fill(k, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !x && k) refs.current[k - 1]?.focus(); }}
          className="h-16 w-full rounded-[12px] border-2 bg-white text-center text-[1.75rem] font-semibold outline-none transition focus:border-[#e8664a]"
          style={{ borderColor: done ? "#3f9c6e" : x ? c.coral : c.line, color: c.ink, background: done ? "#eef8f2" : "#fff" }} />
      ))}
    </div>
  );
}

// The live plan on the right. Every answer adds or changes something here.
function PlanCard({ kind, name, firm, goalsOn, tool, minutes, days, level, team }: { kind: Kind | null; name: string; firm: string; goalsOn: string[]; tool: Tool | ""; minutes: number; days: number[]; level: string; team: string }) {
  const realTool = tool === "vedikke" ? (kind === "virksomhed" ? "copilot" : "chatgpt") : tool;
  const tName = tools.find((t) => t.id === realTool)?.n;
  const lessons = goalsOn.flatMap((g) => goals.find((x) => x.id === g)?.lessons.slice(0, 1) ?? []);
  const perWeek = minutes * days.length;
  const weeks = perWeek ? Math.ceil((12 * 10) / perWeek) : 0;
  const Row = ({ show, children }: { show: boolean; children: React.ReactNode }) => (
    <div className={`grid transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${show ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="overflow-hidden">{children}</div></div>
  );
  return (
    <div className="w-full max-w-[25rem] rounded-[24px] bg-white/95 p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-full text-[0.9375rem] font-bold text-white transition-colors" style={{ background: name ? c.coral : "#d9cfc8" }}>{name ? name[0].toUpperCase() : "?"}</span>
        <div className="min-w-0">
          <p className="truncate text-[1.0625rem] font-semibold" style={{ color: c.ink }}>{name ? `${name}s plan` : "Din plan"}</p>
          <p className="truncate text-[0.8125rem]" style={{ color: c.muted }}>{kind === "virksomhed" ? (firm || "Din virksomhed") + (team ? ` · ${team}` : "") : kind === "privat" ? "Privat medlemskab" : "Bygges mens du svarer"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-1">
        <Row show={!!tName}>
          <div className="flex items-center gap-3 rounded-[14px] p-3" style={{ background: c.page }}>
            {realTool && <Image src={`/logos/${realTool}.png`} alt="" width={32} height={32} className="size-8 rounded-[8px]" />}
            <div className="leading-tight"><p className="text-[0.75rem]" style={{ color: c.muted }}>Kursus</p><p className="font-semibold" style={{ color: c.ink }}>Fra helt grøn til ekspert i {tName}</p></div>
            {tool === "vedikke" && <span className="ml-auto rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ background: c.soft, color: c.coralText }}>Anbefalet</span>}
          </div>
        </Row>
        <Row show={!!level}>
          <div className="mt-2 flex items-center gap-3 px-1">
            <div className="flex gap-1">{["Grøn", "Øvet", "Avanceret", "Ekspert"].map((l, i) => <span key={l} className="h-1.5 w-8 rounded-full transition-colors duration-500" style={{ background: i <= ["Grøn", "Øvet", "Avanceret", "Ekspert"].indexOf(level) ? c.coral : "#eee6e1" }} />)}</div>
            <span className="text-[0.8125rem] font-semibold" style={{ color: c.ink }}>Niveau {level}</span>
          </div>
        </Row>
        <Row show={days.length > 0 && minutes > 0}>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {DOW.map((d, i) => { const on = days.includes(i); return (
              <div key={d} className="rounded-[10px] py-2 text-center transition-colors duration-300" style={{ background: on ? c.dark : c.page, color: on ? "#fff" : c.muted }}>
                <p className="text-[0.625rem] font-medium">{d}</p><p className="text-[0.75rem] font-semibold">{on ? `${minutes}m` : "–"}</p>
              </div>
            ); })}
          </div>
          <p className="mt-2 px-1 text-[0.8125rem]" style={{ color: c.muted }}>{perWeek} min om ugen · niveau 1 klaret på ca. <b style={{ color: c.ink }}>{weeks} uger</b></p>
        </Row>
        <Row show={lessons.length > 0}>
          <p className="mt-4 px-1 text-[0.75rem] font-semibold uppercase tracking-[0.06em]" style={{ color: c.muted }}>Dine første lektioner</p>
          <ol className="mt-2 grid gap-1.5">
            {lessons.slice(0, 3).map((l, i) => (
              <li key={l} className="flex items-center gap-3 rounded-[12px] border px-3 py-2 text-[0.875rem]" style={{ borderColor: c.line, color: c.ink }}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold" style={{ background: i === 0 ? c.coral : c.page, color: i === 0 ? "#fff" : c.muted }}>{i + 1}</span>{l}
              </li>
            ))}
          </ol>
        </Row>
      </div>
      {!name && !tName && <p className="mt-2 rounded-[14px] border border-dashed p-4 text-center text-[0.8125rem]" style={{ borderColor: c.line, color: c.muted }}>Svar på spørgsmålene, så bygger vi din plan her.</p>}
    </div>
  );
}

export function OnboardingNy({ initial }: { initial?: Kind }) {
  const [kind, setKind] = useState<Kind | null>(initial ?? null);
  const [i, setI] = useState(initial ? 1 : 0); // from the website buttons the type is known: start at the account step
  const [dir, setDir] = useState(1);
  const [f, setF] = useState({ fornavn: "", efternavn: "", tlf: "", mail: "" });
  const [goalsOn, setGoals] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool | "">("");
  const [minutes, setMinutes] = useState(10);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [path, setPath] = useState<"test" | "bund" | "">("");
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState("");
  const [firm, setFirm] = useState({ navn: "", team: "" });
  const [plan, setPlan] = useState("");
  const [friend, setFriend] = useState("");
  const [invites, setInvites] = useState("");

  const steps = useMemo(() => {
    const base = ["type", "konto", "kode", "maal", "vaerktoej", "tid", "niveau", ...(path === "test" ? ["test"] : [])];
    return kind === "virksomhed" ? [...base, "firma", "hold", "klar"] : [...base, "medlemskab", "klar"];
  }, [kind, path]);
  const id = steps[i];
  const go = (d: number) => { setDir(d); setI((x) => Math.max(0, Math.min(steps.length - 1, x + d))); };
  const okKonto = f.fornavn && f.efternavn && f.tlf.replace(/\D/g, "").length >= 8 && /\S+@\S+\.\S+/.test(f.mail);
  const canNext: Record<string, boolean> = { type: !!kind, konto: !!okKonto, maal: goalsOn.length > 0, vaerktoej: !!tool, tid: days.length > 0, niveau: !!path, firma: !!firm.navn && !!firm.team, hold: true, medlemskab: !!plan };

  // Keyboard: numbers pick the n-th option, Enter continues, Esc goes back.
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest("input,textarea");
      if (e.key === "Enter" && !(e.target as HTMLElement).closest("textarea") && canNext[id] && id !== "kode") { e.preventDefault(); go(1); }
      if (e.key === "Escape" && i > 0) go(-1);
      if (typing) return;
      const n = Number(e.key);
      if (!n) return;
      // The key picks an option; it must not also be typed into the field the next step focuses.
      e.preventDefault();
      if (id === "type" && n <= 2) setKind(n === 1 ? "privat" : "virksomhed");
      if (id === "maal" && n <= goals.length) { const g = goals[n - 1].id; setGoals((x) => (x.includes(g) ? x.filter((y) => y !== g) : [...x, g])); }
      if (id === "vaerktoej" && n <= tools.length) setTool(tools[n - 1].id);
      if (id === "niveau" && n <= 2) setPath(n === 1 ? "test" : "bund");
      if (id === "test" && n <= 4) answer(n - 1);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  });
  useEffect(() => { if (path === "bund") setLevel("Grøn"); }, [path]);

  const answer = (a: number) => {
    const s = score + a; setScore(s);
    if (qi < quiz.length - 1) setQi(qi + 1);
    else { setLevel(s >= 7 ? "Avanceret" : s >= 4 ? "Øvet" : "Grøn"); go(1); }
  };

  let title = "", sub = "", body: React.ReactNode = null;
  if (id === "type") {
    title = "Hvem skal bruge Mindforward?"; sub = "Så indretter vi platformen rigtigt fra start.";
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        {([["privat", "Mig selv", "Lær AI i dit eget tempo", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0"], ["virksomhed", "Min virksomhed", "Dig og dine kolleger", "M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M9 7h1m4 0h1M9 11h1m4 0h1m-5 10v-4h4v4"]] as const).map(([k, t, d, path], n) => (
          <Card key={k} on={kind === k} onClick={() => setKind(k)} k={n + 1}>
            <div>
              <span className="grid size-12 place-items-center rounded-[14px] transition-colors" style={{ background: kind === k ? c.soft : c.page, color: kind === k ? c.coralText : c.ink }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg></span>
              <p className="mt-4 text-[1.0625rem] font-semibold" style={{ color: c.ink }}>{t}</p><p className="text-[0.875rem]" style={{ color: c.muted }}>{d}</p>
            </div>
          </Card>
        ))}
      </div>
    );
  } else if (id === "konto") {
    title = "Lad os oprette din konto"; sub = "Ingen adgangskode. Du får en kode på mail, hver gang du logger ind.";
    body = (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fornavn" autoFocus value={f.fornavn} onChange={(e) => setF({ ...f, fornavn: e.target.value })} autoComplete="given-name" />
          <Field label="Efternavn" value={f.efternavn} onChange={(e) => setF({ ...f, efternavn: e.target.value })} autoComplete="family-name" />
        </div>
        <Field label="Telefonnummer" type="tel" value={f.tlf} onChange={(e) => setF({ ...f, tlf: e.target.value })} autoComplete="tel" placeholder="12 34 56 78" />
        <Field label={kind === "virksomhed" ? "Arbejdsmail" : "E-mail"} type="email" value={f.mail} onChange={(e) => setF({ ...f, mail: e.target.value })} autoComplete="email" placeholder={kind === "virksomhed" ? "navn@firma.dk" : "navn@mail.dk"} />
      </div>
    );
  } else if (id === "kode") {
    title = "Tjek din mail"; sub = `Vi har sendt en kode på 6 cifre til ${f.mail || "din mail"}. Du kan også sætte den ind direkte.`;
    body = (
      <div>
        <CodeInput onDone={() => go(1)} />
        <p className="mt-4 text-[0.8125rem]" style={{ color: c.muted }}>Ingen mail? Tjek spam, eller <span className="font-semibold underline" style={{ color: c.ink }}>send en ny kode</span>. <span className="opacity-70">(I dette preview virker alle 6 cifre.)</span></p>
      </div>
    );
  } else if (id === "maal") {
    title = `Hej ${f.fornavn || "der"}! Hvad vil du bruge AI til?`; sub = "Vælg det, der fylder i din hverdag. Vi starter dine lektioner der.";
    body = (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {goals.map((g, n) => <Card key={g.id} on={goalsOn.includes(g.id)} onClick={() => setGoals((x) => (x.includes(g.id) ? x.filter((y) => y !== g.id) : [...x, g.id]))} k={n + 1}><span className="text-[0.9375rem] font-semibold" style={{ color: c.ink }}>{g.t}</span></Card>)}
      </div>
    );
  } else if (id === "vaerktoej") {
    title = "Hvilket AI-værktøj bruger du?"; sub = "Du øver i det værktøj, du faktisk har. Du kan skifte senere.";
    body = (
      <div className="grid gap-2.5">
        {tools.map((t, n) => (
          <Card key={t.id} on={tool === t.id} onClick={() => setTool(t.id)} k={n + 1}>
            {t.id === "vedikke" ? <span className="grid size-10 place-items-center rounded-[10px] text-[1.125rem]" style={{ background: c.page, color: c.ink }}>?</span> : <Image src={`/logos/${t.id}.png`} alt="" width={40} height={40} className="size-10 rounded-[10px]" />}
            <span><span className="block font-semibold" style={{ color: c.ink }}>{t.n}</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>{t.d}</span></span>
          </Card>
        ))}
      </div>
    );
  } else if (id === "tid") {
    title = "Hvor meget tid har du?"; sub = "Små skridt hver dag virker bedre end en hel kursusdag.";
    body = (
      <div>
        <div className="grid grid-cols-3 gap-2.5">
          {[5, 10, 15].map((m) => <Card key={m} on={minutes === m} onClick={() => setMinutes(m)}><span className="w-full text-center"><span className="block text-[1.75rem] font-semibold leading-none" style={{ color: c.ink }}>{m}</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>min om dagen</span></span></Card>)}
        </div>
        <p className="mt-6 text-[0.8125rem] font-medium" style={{ color: c.muted }}>Hvilke dage?</p>
        <div className="mt-2 grid grid-cols-7 gap-1.5">
          {DOW.map((d, n) => { const on = days.includes(n); return <button key={d} type="button" onClick={() => setDays((x) => (on ? x.filter((y) => y !== n) : [...x, n].sort()))} className="h-11 rounded-[10px] border-2 text-[0.8125rem] font-semibold transition" style={{ borderColor: on ? c.dark : c.line, background: on ? c.dark : "#fff", color: on ? "#fff" : c.muted }}>{d}</button>; })}
        </div>
      </div>
    );
  } else if (id === "niveau") {
    title = "Hvor er du i dag?"; sub = "Kan du lidt i forvejen, springer vi det over, du allerede kan.";
    body = (
      <div className="grid gap-2.5">
        <Card on={path === "test"} onClick={() => setPath("test")} k={1}><span><span className="block font-semibold" style={{ color: c.ink }}>Tag en hurtig test</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>3 spørgsmål · under et minut</span></span></Card>
        <Card on={path === "bund"} onClick={() => setPath("bund")} k={2}><span><span className="block font-semibold" style={{ color: c.ink }}>Start fra bunden</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>Jeg er helt ny</span></span></Card>
      </div>
    );
  } else if (id === "test") {
    const q = quiz[qi];
    title = q.q; sub = `Spørgsmål ${qi + 1} af ${quiz.length}`;
    body = <div key={qi} className="ob-in grid gap-2.5">{q.a.map((a, n) => <Card key={a} onClick={() => answer(n)} k={n + 1}><span className="font-medium" style={{ color: c.ink }}>{a}</span></Card>)}</div>;
  } else if (id === "medlemskab") {
    title = "Vælg dit medlemskab"; sub = "Det samme indhold i alle tre. Ingen binding.";
    body = (
      <div className="grid gap-2.5">
        <Card on={plan === "alene"} onClick={() => setPlan("alene")}><span className="flex-1"><span className="block font-semibold" style={{ color: c.ink }}>Enkelt bruger</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>Kun dig</span></span><span className="font-semibold" style={{ color: c.ink }}>69 kr./md.</span></Card>
        <Card on={plan === "ven"} onClick={() => setPlan("ven")}><span className="flex-1"><span className="flex items-center gap-2 font-semibold" style={{ color: c.ink }}>Med en ven <span className="rounded-full px-2 py-0.5 text-[0.6875rem]" style={{ background: c.soft, color: c.coralText }}>54,50 kr. hver</span></span><span className="text-[0.8125rem]" style={{ color: c.muted }}>I lærer sammen</span></span><span className="font-semibold" style={{ color: c.ink }}>109 kr./md.</span></Card>
        {plan === "ven" && <div className="ob-in"><Field label="Din vens e-mail" type="email" value={friend} onChange={(e) => setFriend(e.target.value)} placeholder="ven@mail.dk" /></div>}
        <Card on={plan === "studie"} onClick={() => setPlan("studie")}><span className="flex-1"><span className="flex items-center gap-2 font-semibold" style={{ color: c.ink }}>Studerende eller jobsøgende <span className="rounded-full px-2 py-0.5 text-[0.6875rem]" style={{ background: c.soft, color: c.coralText }}>Halv pris</span></span><span className="text-[0.8125rem]" style={{ color: c.muted }}>Med studiemail eller bevis</span></span><span className="font-semibold" style={{ color: c.ink }}>34,50 kr./md.</span></Card>
      </div>
    );
  } else if (id === "firma") {
    title = "Om jeres virksomhed"; sub = "Så kan vi sætte holdet og prisen rigtigt op.";
    body = (
      <div className="grid gap-4">
        <Field label="Virksomhedens navn" autoFocus value={firm.navn} onChange={(e) => setFirm({ ...firm, navn: e.target.value })} placeholder="Firmanavn ApS" />
        <div className="grid gap-2.5 sm:grid-cols-3">
          {([["1–9", "69 kr./bruger"], ["10+", "55 kr./bruger"], ["Enterprise", "Efter aftale"]] as const).map(([t, d]) => <Card key={t} on={firm.team === t} onClick={() => setFirm({ ...firm, team: t })}><span><span className="block font-semibold" style={{ color: c.ink }}>{t === "Enterprise" ? t : `${t} brugere`}</span><span className="text-[0.8125rem]" style={{ color: c.muted }}>{d}</span></span></Card>)}
        </div>
      </div>
    );
  } else if (id === "hold") {
    const list = invites.split(/[\s,;]+/).filter((x) => /\S+@\S+\.\S+/.test(x));
    title = "Inviter dit hold"; sub = "De får en mail med et link og deres egen korte onboarding.";
    body = (
      <div>
        <textarea rows={3} value={invites} onChange={(e) => setInvites(e.target.value)} placeholder="sofie@firma.dk, mads@firma.dk …" className="w-full rounded-[12px] border-2 bg-white p-4 text-[1rem] outline-none focus:border-[#e8664a]" style={{ borderColor: c.line, color: c.ink }} />
        <div className="mt-3 flex flex-wrap gap-2">{list.map((m) => <span key={m} className="ob-in flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-[0.8125rem]" style={{ color: c.ink }}><span className="grid size-6 place-items-center rounded-full text-[0.6875rem] font-bold text-white" style={{ background: c.coral }}>{m[0].toUpperCase()}</span>{m}</span>)}</div>
        <p className="mt-3 text-[0.8125rem]" style={{ color: c.muted }}>Eller del linket <span className="rounded-[6px] bg-white px-2 py-0.5 font-mono text-[0.75rem]">app.mindforward.dk/deltag/k7f2</span></p>
      </div>
    );
  } else if (id === "klar") {
    title = `Din plan er klar, ${f.fornavn || "du"}`; sub = "Første lektion tager 10 minutter. Du kan starte nu eller vente til i morgen.";
    body = (
      <div className="ob-pop grid gap-3">
        <Link href="/" className="flex h-14 items-center justify-center gap-2 rounded-[14px] text-[1rem] font-semibold" style={{ background: c.coral, color: c.ink }}>Start første lektion →</Link>
        <button type="button" className="h-12 rounded-[14px] border-2 bg-white text-[0.9375rem] font-semibold" style={{ borderColor: c.line, color: c.ink }}>Sæt det i min kalender</button>
      </div>
    );
  }

  const pct = Math.round((i / (steps.length - 1)) * 100);
  const showNext = !["type", "kode", "test", "klar"].includes(id) || id === "type";

  return (
    <div className="grid min-h-svh overflow-x-clip lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" style={{ background: c.page }}>
      <style>{`
        @keyframes obIn { from { opacity: 0; transform: translateX(calc(var(--d, 1) * 24px)); } to { opacity: 1; transform: none; } }
        .ob-step { animation: obIn 420ms cubic-bezier(.16,1,.3,1) both; }
        .ob-in { animation: obIn 320ms cubic-bezier(.16,1,.3,1) both; }
        @keyframes obPop { 0% { opacity: 0; transform: scale(.96); } 100% { opacity: 1; transform: none; } }
        .ob-pop { animation: obPop 500ms cubic-bezier(.34,1.56,.64,1) both; }
        @media (prefers-reduced-motion: reduce) { .ob-step, .ob-in, .ob-pop { animation: none; } }
      `}</style>

      {/* Left: the question */}
      <main className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center gap-4">
          <MindforwardLogo size={26} className="!text-[#201613]" />
          <div className="ml-auto flex items-center gap-3">
            {i > 0 && <button type="button" onClick={() => go(-1)} className="text-[0.8125rem] font-medium" style={{ color: c.muted }}>← Tilbage</button>}
            <span className="text-[0.8125rem] tabular-nums" style={{ color: c.muted }}>{i + 1} / {steps.length}</span>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${Math.max(4, pct)}%`, background: c.coral }} /></div>

        <div key={id} className="ob-step mx-auto flex w-full max-w-[32rem] flex-1 flex-col justify-center py-10" style={{ ["--d" as string]: dir }}>
          <h1 className="text-[clamp(1.75rem,1.4rem+1.2vw,2.375rem)] font-semibold leading-[1.15] tracking-[-0.025em]" style={{ color: c.ink }}>{title}</h1>
          {sub && <p className="mt-3 text-[1rem] leading-relaxed" style={{ color: c.muted }}>{sub}</p>}
          <div className="mt-8">{body}</div>
          {showNext && <Next onClick={() => go(1)} disabled={!canNext[id]}>{id === "hold" ? (invites.trim() ? "Send invitationer" : "Spring over") : id === "konto" ? "Send mig en kode" : "Fortsæt"}</Next>}
        </div>
        {/* Phones: the live plan as a small bar, since the right-hand panel is hidden. */}
        {(tool || goalsOn.length > 0) && (
          <div className="ob-in mb-3 flex items-center gap-3 rounded-[14px] px-4 py-3 text-[0.8125rem] text-white lg:hidden" style={{ background: c.dark }}>
            {tool && tool !== "vedikke" && <Image src={`/logos/${tool}.png`} alt="" width={24} height={24} className="size-6 rounded-[6px]" />}
            <span className="min-w-0 flex-1 truncate">{f.fornavn ? `${f.fornavn}s plan` : "Din plan"}: {[tool && (tools.find((t) => t.id === tool)?.n ?? ""), i > steps.indexOf("tid") && `${minutes} min · ${days.length} dage`, level && `niveau ${level}`].filter(Boolean).join(" · ") || `${goalsOn.length} mål valgt`}</span>
          </div>
        )}
        <p className="text-center text-[0.75rem]" style={{ color: c.muted }}>Preview · intet gemmes, og der sendes ingen mails</p>
      </main>

      {/* Right: the plan builds itself */}
      <aside className="relative hidden items-center justify-center overflow-hidden p-10 lg:flex" style={{ background: "linear-gradient(160deg,#2e1f1c,#1a0f0c)" }}>
        <div aria-hidden className="absolute -right-24 top-1/4 size-[30rem] rounded-full opacity-30 blur-3xl" style={{ background: c.coral }} />
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1.2px)", backgroundSize: "18px 18px" }} />
        <div className="relative flex w-full flex-col items-center">
          <p className="mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-white/50">{id === "klar" ? "Klar" : "Din plan bygges mens du svarer"}</p>
          <div className={id === "klar" ? "ob-pop w-full flex justify-center" : "w-full flex justify-center"}>
            <PlanCard kind={kind} name={f.fornavn} firm={firm.navn} goalsOn={goalsOn} tool={tool} minutes={id === "tid" || i > steps.indexOf("tid") ? minutes : 0} days={i >= steps.indexOf("tid") ? days : []} level={level} team={firm.team} />
          </div>
        </div>
      </aside>
    </div>
  );
}
