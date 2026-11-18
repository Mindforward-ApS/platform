"use client";

// Work profile in the sign-up flow (Marco 2026-11-17). Full screen split: a white form column on the left (logo top
// left, left-aligned title and lead, labelled fields with an icon, dark primary button), a dark brown panel on the
// right with a soft coral glow, a big headline, a short statement and the three AI tools at the bottom.
// Erhverv or Privat comes from the sign-up the user started (?type=privat). Erhverv looks the company up by CVR with
// a loading checklist, then stilling / opgaver / systemer, "Vi bygger din profil" and the profile to check.
// Preview only: the CVR result and the generated profile are examples; nothing is saved or sent.
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";
import { BriefcaseIcon, BuildingsIcon, CheckIcon, EnvelopeSimpleIcon, ListChecksIcon, MagnifyingGlassIcon, PhoneIcon, PlusIcon, SparkleIcon, SquaresFourIcon, UserIcon, XIcon } from "@phosphor-icons/react";
import { Google, Microsoft } from "../tilmeld-ny/Tilmeld";
import { level, questions } from "../tilmeld-ny/niveautest";

const c = { ink: "#201613", text: "#3d3330", muted: "#7a706b", line: "#e7e2de", brown: "#201613", coral: "#e8664a", peach: "#fbe1d7", field: "#ffffff" };
export type Step = "opret" | "login" | "kode" | "cvr" | "soeger" | "fundet" | "arbejde" | "bygger" | "profil" | "start" | "vaerktoej" | "test" | "resultat" | "klar";

function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="h-12 w-full rounded-[10px] text-[0.9375rem] font-medium text-white transition hover:brightness-125 disabled:cursor-default disabled:opacity-50 disabled:hover:brightness-100"
      style={{ background: c.brown }}>{children}</button>
  );
}
function Ghost({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="h-12 w-full rounded-[10px] border bg-white text-[0.9375rem] font-medium transition hover:bg-[#faf7f5]" style={{ borderColor: c.line, color: c.ink }}>{children}</button>;
}
function Social({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] border bg-white text-[0.9375rem] font-medium transition hover:bg-[#faf7f5] [&_svg]:size-[18px]" style={{ borderColor: c.line, color: c.ink }}>{icon}{children}</button>;
}
function Or() {
  return <div className="flex items-center gap-3 text-[0.75rem] uppercase tracking-[0.08em]" style={{ color: c.muted }}><span className="h-px flex-1" style={{ background: c.line }} />eller<span className="h-px flex-1" style={{ background: c.line }} /></div>;
}
function Choice({ on, onClick, title, sub, icon }: { on: boolean; onClick: () => void; title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3.5 rounded-[12px] border bg-white px-4 py-3.5 text-left transition" style={{ borderColor: on ? c.ink : c.line, boxShadow: on ? "0 0 0 1px #201613" : undefined }}>
      {icon}
      <span className="min-w-0 flex-1"><span className="block text-[0.9375rem] font-medium" style={{ color: c.ink }}>{title}</span>{sub && <span className="block text-[0.8125rem]" style={{ color: c.muted }}>{sub}</span>}</span>
      <span className="grid size-5 shrink-0 place-items-center rounded-full border" style={{ borderColor: on ? c.ink : c.line, background: on ? c.ink : "#fff" }}>{on && <CheckIcon size={11} weight="bold" color="#fff" />}</span>
    </button>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: typeof BriefcaseIcon; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-[0.875rem]" style={{ color: c.ink }}>{label}</span>
      <span className="relative block">
        <Icon size={17} className="pointer-events-none absolute left-3.5 top-[15px]" color={c.muted} />
        {children}
      </span>
    </label>
  );
}
const input = "w-full rounded-[10px] border bg-white pl-10 pr-4 text-[0.9375rem] outline-none transition placeholder:text-[#a59d98] focus:border-[#201613] focus:ring-2 focus:ring-[#201613]/10";
function Title({ title, lead }: { title: string; lead?: string }) {
  return (
    <>
      <h1 className="text-[1.75rem] font-normal leading-tight tracking-[-0.02em]" style={{ color: c.ink }}>{title}</h1>
      {lead && <p className="mt-2.5 max-w-[24rem] text-[0.9375rem] leading-relaxed" style={{ color: c.text }}>{lead}</p>}
    </>
  );
}

// A checklist that ticks itself off while we search, so the wait reads as progress.
function Loader({ title, lead, lines, onDone }: { title: string; lead: string; lines: string[]; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= lines.length) { const t = setTimeout(onDone, 500); return () => clearTimeout(t); }
    const t = setTimeout(() => setN((x) => x + 1), 750);
    return () => clearTimeout(t);
  }, [n, lines.length, onDone]);
  return (
    <div aria-live="polite">
      <Title title={title} lead={lead} />
      <ul className="mt-8 grid gap-4">
        {lines.map((l, k) => {
          const done = k < n, active = k === n;
          return (
            <li key={l} className="flex items-center gap-3 text-[0.9375rem] transition-opacity" style={{ color: c.ink, opacity: k > n ? 0.4 : 1 }}>
              <span className="grid size-6 shrink-0 place-items-center rounded-full border" style={{ background: done ? c.brown : "#fff", borderColor: done ? c.brown : c.line }}>
                {done ? <CheckIcon size={12} weight="bold" color="#fff" /> : active ? <span className="ap-spin block size-3.5 rounded-full border-2 border-[#201613] border-t-transparent" /> : null}
              </span>
              {l}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Chips({ label, items, onChange, add }: { label: string; items: string[]; onChange: (v: string[]) => void; add: string }) {
  const [v, setV] = useState("");
  return (
    <div>
      <p className="text-[0.875rem]" style={{ color: c.ink }}>{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5 rounded-[8px] border bg-white py-1.5 pl-3 pr-1.5 text-[0.875rem]" style={{ borderColor: c.line, color: c.ink }}>
            {t}
            <button type="button" aria-label={`Fjern ${t}`} onClick={() => onChange(items.filter((x) => x !== t))} className="grid size-5 place-items-center rounded hover:bg-black/5"><XIcon size={11} weight="bold" /></button>
          </span>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); if (v.trim()) { onChange([...items, v.trim()]); setV(""); } }} className="inline-flex items-center gap-1 rounded-[8px] border border-dashed px-2" style={{ borderColor: c.line }}>
          <PlusIcon size={13} color={c.muted} />
          <input value={v} onChange={(e) => setV(e.target.value)} placeholder={add} aria-label={add} className="w-28 bg-transparent py-1.5 text-[0.875rem] outline-none" />
        </form>
      </div>
    </div>
  );
}

function Panel({ privat }: { privat: boolean }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden px-14 py-14 text-[#faf6f2]" style={{ background: c.brown }}>
      <div aria-hidden className="pointer-events-none absolute -right-[20%] -top-[25%] h-[85%] w-[85%] rounded-full opacity-60 blur-[90px]" style={{ background: "radial-gradient(circle, rgba(232,102,74,0.55), transparent 65%)" }} />
      <div className="relative mt-auto mb-auto max-w-[30rem]">
        <h2 className="text-[clamp(2rem,1.2rem+1.8vw,3rem)] font-normal leading-[1.12] tracking-[-0.02em]" style={{ color: "#faf6f2" }}>{privat ? "AI, der passer til din hverdag" : "AI-træning, der passer til dit arbejde"}</h2>
        <p className="mt-6 text-[1.0625rem] leading-relaxed text-[#faf6f2]/80">{privat ? "Fortæl, hvad du laver til daglig. Så bygger vi øvelserne ud fra dit eget liv, ikke et lærebogseksempel." : "Fortæl om dit job. Så bygger vi øvelserne ud fra dine egne opgaver og systemer, ikke et lærebogseksempel."}</p>
      </div>
      <div className="relative">
        <div className="flex items-center gap-4 text-[0.75rem] font-medium uppercase tracking-[0.12em] text-[#faf6f2]/60">Træn i dit eget værktøj<span className="h-px flex-1 bg-[#faf6f2]/15" /></div>
        <ul className="mt-5 flex flex-wrap items-center gap-x-10 gap-y-4">
          {[["chatgpt", "ChatGPT"], ["copilot", "Copilot"], ["claude", "Claude"]].map(([k, n]) => (
            <li key={k} className="flex items-center gap-2.5 text-[1.0625rem] font-semibold"><Image src={`/logos/${k}.png`} alt="" width={24} height={24} className="rounded-[6px]" />{n}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Arbejdsprofil({ from = "profil" }: { from?: "opret" | "login" | "profil" } = {}) {
  const sp = useSearchParams();
  const erhverv = sp.get("type") !== "privat";
  const first: Step = from === "opret" ? (sp.has("login") ? "login" : "opret") : from === "login" ? "login" : erhverv ? "cvr" : "arbejde";
  const [step, setStep] = useState<Step>(first);
  const [acc, setAcc] = useState({ navn: "", tlf: "", mail: "" });
  const [code, setCode] = useState("");
  const [path, setPath] = useState<"test" | "bund" | "">("");
  const [tool, setTool] = useState("");
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const qs = questions("da", tool || "chatgpt");
  const accOk = acc.navn.trim().length > 1 && acc.tlf.replace(/\D/g, "").length >= 8 && /\S+@\S+\.\S+/.test(acc.mail);
  const [cvr, setCvr] = useState("");
  const [f, setF] = useState({ stilling: "", opgaver: "", systemer: "" });
  const [tasks, setTasks] = useState(["Rykkere", "Bankafstemning", "Kundemails", "Månedsafslutning"]);
  const [systems, setSystems] = useState(["e-conomic", "Outlook", "Excel"]);
  const ok = f.stilling.trim().length > 1 && f.opgaver.trim().length > 3;

  let body: React.ReactNode = null;
  if (step === "opret") body = (
    <>
      <Title title={erhverv ? "Opret jeres konto" : "Opret din konto"} lead={erhverv ? "Kom i gang med AI-træning til holdet på få minutter." : "Kom i gang med AI i din hverdag på få minutter."} />
      <div className="mt-8 grid gap-5">
        <Field label="Fulde navn" icon={UserIcon}><input value={acc.navn} onChange={(e) => setAcc({ ...acc, navn: e.target.value })} placeholder="Skriv dit navn" autoComplete="name" className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} /></Field>
        <Field label={erhverv ? "Arbejdsmail" : "E-mail"} icon={EnvelopeSimpleIcon}><input type="email" value={acc.mail} onChange={(e) => setAcc({ ...acc, mail: e.target.value })} placeholder="Skriv din e-mail" autoComplete="email" className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} /></Field>
        <Field label="Telefonnummer" icon={PhoneIcon}><input type="tel" value={acc.tlf} onChange={(e) => setAcc({ ...acc, tlf: e.target.value })} placeholder="Skriv dit telefonnummer" autoComplete="tel" className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} /></Field>
        <Primary disabled={!accOk} onClick={() => setStep("kode")}>Opret konto</Primary>
        <Or />
        <Social icon={<Google />}>Fortsæt med Google</Social>
        <Social icon={<Microsoft />}>Fortsæt med Microsoft</Social>
      </div>
      <p className="mt-6 text-center text-[0.875rem]" style={{ color: c.text }}>Har du allerede en konto? <button type="button" onClick={() => setStep("login")} className="font-medium underline-offset-2 hover:underline" style={{ color: c.coral }}>Log ind</button></p>
    </>
  );
  if (step === "login") body = (
    <>
      <Title title="Velkommen tilbage" lead="Log ind og fortsæt, hvor du slap." />
      <div className="mt-8 grid gap-5">
        <Field label="E-mail" icon={EnvelopeSimpleIcon}><input type="email" value={acc.mail} onChange={(e) => setAcc({ ...acc, mail: e.target.value })} placeholder="Skriv din e-mail" autoComplete="email" className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} /></Field>
        <Primary disabled={!/\S+@\S+\.\S+/.test(acc.mail)} onClick={() => setStep("kode")}>Send mig en kode</Primary>
        <Or />
        <Social icon={<Google />}>Fortsæt med Google</Social>
        <Social icon={<Microsoft />}>Fortsæt med Microsoft</Social>
      </div>
      <p className="mt-6 text-center text-[0.875rem]" style={{ color: c.text }}>Har du ikke en konto? <button type="button" onClick={() => setStep("opret")} className="font-medium underline-offset-2 hover:underline" style={{ color: c.coral }}>Opret konto</button></p>
    </>
  );
  if (step === "kode") body = (
    <>
      <Title title="Tjek din indbakke" lead={`Skriv den 6-cifrede kode, vi har sendt til ${acc.mail || "din e-mail"}.`} />
      <div className="mt-8 grid gap-5">
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Kode" placeholder="••••••" className="h-14 w-full rounded-[10px] border bg-white text-center font-mono text-[1.5rem] tracking-[0.5em] outline-none focus:border-[#201613] focus:ring-2 focus:ring-[#201613]/10" style={{ borderColor: c.line, color: c.ink }} />
        <Primary disabled={code.length < 6} onClick={() => setStep(erhverv ? "cvr" : "arbejde")}>Bekræft</Primary>
      </div>
      <p className="mt-6 text-center text-[0.875rem]" style={{ color: c.text }}>Fik du ingen kode? <button type="button" className="font-medium underline-offset-2 hover:underline" style={{ color: c.coral }}>Send igen</button></p>
    </>
  );
  if (step === "cvr") body = (
    <>
      <Title title="Hvor arbejder du?" lead="Vi slår virksomheden op, så kurser og opgaver passer til jeres branche." />
      <div className="mt-8 grid gap-5">
        <Field label="CVR-nummer eller firmanavn" icon={MagnifyingGlassIcon}>
          <input value={cvr} onChange={(e) => setCvr(e.target.value)} placeholder="Fx 12345678" className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} />
        </Field>
        <Primary disabled={cvr.trim().length < 3} onClick={() => setStep("soeger")}>Find virksomheden</Primary>
      </div>
      <p className="mt-6 text-center text-[0.875rem]" style={{ color: c.text }}>Ingen CVR-nummer? <button type="button" onClick={() => setStep("arbejde")} className="font-medium underline-offset-2 hover:underline" style={{ color: c.coral }}>Spring over</button></p>
    </>
  );
  if (step === "soeger") body = (
    <Loader title="Vi finder din virksomhed" lead="Det tager et par sekunder." onDone={() => setStep("fundet")}
      lines={["Slår CVR-nummeret op hos Erhvervsstyrelsen", "Henter branche og antal ansatte", "Finder typiske opgaver i branchen", "Finder systemer, branchen bruger"]} />
  );
  if (step === "fundet") body = (
    <>
      <Title title="Er det her jer?" lead="Tjek, at det er den rigtige virksomhed." />
      <div className="mt-8 rounded-[12px] border bg-white p-5" style={{ borderColor: c.line }}>
        <div className="flex items-start gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-[10px]" style={{ background: c.peach }}><BuildingsIcon size={20} color={c.brown} /></span>
          <div className="min-w-0"><p className="text-[1rem] font-medium" style={{ color: c.ink }}>Hansen VVS ApS</p><p className="text-[0.875rem]" style={{ color: c.muted }}>CVR 12345678 · Vejle</p></div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-[0.875rem]" style={{ borderColor: c.line }}>
          <div><dt style={{ color: c.muted }}>Branche</dt><dd style={{ color: c.ink }}>VVS og blikkenslager</dd></div>
          <div><dt style={{ color: c.muted }}>Ansatte</dt><dd style={{ color: c.ink }}>10–19</dd></div>
        </dl>
      </div>
      <p className="mt-2 text-[0.75rem]" style={{ color: c.muted }}>Eksempel i preview. Den rigtige udgave slår op i CVR.</p>
      <div className="mt-6 grid gap-3"><Primary onClick={() => setStep("arbejde")}>Ja, det er os</Primary><Ghost onClick={() => setStep("cvr")}>Nej, søg igen</Ghost></div>
    </>
  );
  if (step === "arbejde") body = (
    <>
      <Title title={erhverv ? "Fortæl om dit arbejde" : "Fortæl om din hverdag"} lead="Skriv med dine egne ord. Ingen navne eller CPR-numre." />
      <div className="mt-8 grid gap-5">
        <Field label={erhverv ? "Din stilling" : "Hvad laver du til daglig?"} icon={BriefcaseIcon}>
          <input value={f.stilling} onChange={(e) => setF({ ...f, stilling: e.target.value })} placeholder={erhverv ? "Fx bogholder" : "Fx studerende på HA"} className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} />
        </Field>
        <Field label={erhverv ? "Dine typiske opgaver" : "Hvad vil du bruge AI til?"} icon={ListChecksIcon}>
          <textarea value={f.opgaver} onChange={(e) => setF({ ...f, opgaver: e.target.value })} rows={3} placeholder={erhverv ? "Fx rykkere, afstemning af bank, svar på mails fra kunder" : "Fx skrive opgaver, ansøgninger og lave en madplan"} className={`${input} resize-none py-3 leading-snug`} style={{ borderColor: c.line, color: c.ink }} />
        </Field>
        <Field label="Systemer og programmer (valgfri)" icon={SquaresFourIcon}>
          <input value={f.systemer} onChange={(e) => setF({ ...f, systemer: e.target.value })} placeholder="Fx e-conomic, Outlook, Excel" className={`${input} h-12`} style={{ borderColor: c.line, color: c.ink }} />
        </Field>
        <Primary disabled={!ok} onClick={() => setStep("bygger")}>Byg min profil</Primary>
      </div>
    </>
  );
  if (step === "bygger") body = (
    <Loader title="Vi bygger din profil" lead="Vi tilpasser kurser og opgaver til dig." onDone={() => setStep("profil")}
      lines={["Læser din stilling og dine opgaver", erhverv ? "Matcher med branchen" : "Finder eksempler fra din hverdag", "Finder de data, du skal passe på", "Tilpasser opgaverne til dig"]} />
  );
  if (step === "profil") body = (
    <>
      <Title title="Sådan har vi forstået dit arbejde" lead="Ret det, der ikke passer. Du kan altid ændre det under Indstillinger." />
      <div className="mt-7 grid gap-5">
        <div className="flex items-center gap-3 rounded-[12px] border bg-white p-4" style={{ borderColor: c.line }}>
          <span className="grid size-10 place-items-center rounded-full" style={{ background: c.peach }}><SparkleIcon size={18} color={c.coral} weight="fill" /></span>
          <div><p className="text-[1rem] font-medium" style={{ color: c.ink }}>{f.stilling || "Bogholder"}</p><p className="text-[0.8125rem]" style={{ color: c.muted }}>{erhverv ? "VVS og blikkenslager · 10–19 ansatte" : "Privat"}</p></div>
        </div>
        <Chips label="Dine opgaver" items={tasks} onChange={setTasks} add="Tilføj opgave" />
        <Chips label="Dine systemer" items={systems} onChange={setSystems} add="Tilføj system" />
        <p className="rounded-[10px] px-4 py-3 text-[0.875rem] leading-relaxed" style={{ background: "#f7f3f0", color: c.text }}><b style={{ color: c.ink }}>Data, du skal passe på:</b> kundenavne, fakturabeløb og CPR-numre i lønsedler. Dem øver vi at fjerne, før du bruger AI.</p>
        <Primary onClick={() => setStep("start")}>Det passer, fortsæt</Primary>
      </div>
    </>
  );
  if (step === "start") body = (
    <>
      <Title title="Hvor vil du starte?" lead="Tag en kort test, så springer vi det over, du allerede kan." />
      <div className="mt-8 grid gap-3">
        <Choice on={path === "test"} onClick={() => setPath("test")} title="Tag niveautesten" sub="8 korte spørgsmål · ca. 3 min" />
        <Choice on={path === "bund"} onClick={() => setPath("bund")} title="Start fra bunden" sub="Jeg er helt ny" />
        <div className="mt-3"><Primary disabled={!path} onClick={() => setStep("vaerktoej")}>Fortsæt</Primary></div>
      </div>
    </>
  );
  if (step === "vaerktoej") body = (
    <>
      <Title title="Vælg dit værktøj" lead="Det værktøj, du bruger mest. Du kan skifte senere." />
      <div className="mt-8 grid gap-3">
        {[["chatgpt", "ChatGPT"], ["copilot", "Copilot"], ["claude", "Claude"]].map(([k, n]) => (
          <Choice key={k} on={tool === k} onClick={() => setTool(k)} title={n} icon={<Image src={`/logos/${k}.png`} alt="" width={28} height={28} className="rounded-[7px]" />} />
        ))}
        <div className="mt-3"><Primary disabled={!tool} onClick={() => { if (path === "test") { setQi(0); setPick(null); setScore(0); setStep("test"); } else setStep("klar"); }}>{path === "test" ? "Start niveautesten" : "Fortsæt"}</Primary></div>
      </div>
    </>
  );
  if (step === "test") {
    const q = qs[qi]; const last = qi === qs.length - 1;
    body = (
      <>
        <p className="text-[0.8125rem] tabular-nums" style={{ color: c.muted }}>Spørgsmål {qi + 1} af {qs.length}</p>
        <h1 className="mt-2 text-[1.5rem] font-normal leading-snug tracking-[-0.01em] [text-wrap:pretty]" style={{ color: c.ink }}>{q.q}</h1>
        <div className="mt-6 grid gap-2.5">
          {q.a.map((a, k) => {
            const show = pick !== null, isOk = k === q.ok, chosen = pick === k;
            return (
              <button key={k} type="button" disabled={show} onClick={() => { setPick(k); if (isOk) setScore((x) => x + 1); }} className="flex items-start gap-3 rounded-[12px] border bg-white px-4 py-3.5 text-left text-[0.9375rem] leading-snug transition disabled:cursor-default" style={{ borderColor: show && isOk ? "#3aa66b" : show && chosen ? c.coral : c.line, color: show && !isOk && !chosen ? c.muted : c.ink }}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border text-[0.75rem] font-medium" style={{ borderColor: c.line, background: show && isOk ? "#3aa66b" : show && chosen ? c.coral : "#fff", color: show && (isOk || chosen) ? "#fff" : c.ink }}>{show && isOk ? <CheckIcon size={12} weight="bold" /> : String.fromCharCode(65 + k)}</span>{a}
              </button>
            );
          })}
        </div>
        {pick !== null && (
          <div className="ap-in mt-5 grid gap-4">
            <p className="text-[0.9375rem] leading-relaxed" style={{ color: c.text }}><b style={{ color: pick === q.ok ? "#2f8a58" : c.coral }}>{pick === q.ok ? "Rigtigt." : "Ikke helt."}</b> {q.why}</p>
            <Primary onClick={() => { if (last) setStep("resultat"); else { setQi(qi + 1); setPick(null); } }}>{last ? "Se dit niveau" : "Næste"}</Primary>
          </div>
        )}
      </>
    );
  }
  if (step === "resultat") { const lv = level(score, "da"); body = (
    <>
      <p className="text-[0.8125rem] font-medium uppercase tracking-[0.08em]" style={{ color: c.coral }}>Dit niveau</p>
      <div className="mt-2"><Title title={lv.name} lead={`${score} af ${qs.length} rigtige. ${lv.text}`} /></div>
      <div className="mt-8"><Primary onClick={() => setStep("klar")}>Fortsæt</Primary></div>
    </>
  ); }
  if (step === "klar") body = (
    <>
      <span className="grid size-12 place-items-center rounded-full" style={{ background: c.brown }}><CheckIcon size={22} weight="bold" color="#fff" /></span>
      <div className="mt-6"><Title title="Platformen er tilpasset dig" lead="Din første opgave: skriv en venlig rykker til en kunde, hvis faktura er 14 dage over forfald." /></div>
      <div className="mt-8"><Primary onClick={() => setStep(first)}>Start første lektion</Primary></div>
    </>
  );

  const pre: Step[] = from === "profil" ? [] : ["opret", "kode"];
  const order: Step[] = [...pre, ...(erhverv ? ["cvr", "soeger", "fundet"] as Step[] : []), "arbejde", "bygger", "profil", "start", "vaerktoej", ...(path === "test" ? ["test", "resultat"] as Step[] : []), "klar"];
  const pos = Math.max(0, order.indexOf(step === "login" ? "opret" : step));
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-[1fr_1.08fr]">
      <section className="flex min-h-svh flex-col px-6 py-8 sm:px-12">
        <header className="mx-auto flex w-full max-w-[26rem] items-center justify-between">
          <MindforwardLogo size={26} className="!text-[#201613]" />
          {step !== "opret" && step !== "login" && <span className="text-[0.8125rem] tabular-nums" style={{ color: c.muted }}>Trin {pos + 1} af {order.length}</span>}
        </header>
        <div key={step} className="ap-in mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-10">{body}</div>
      </section>
      <div className="sticky top-0 hidden h-svh lg:block"><Panel privat={!erhverv} /></div>
      <style>{`.ap-spin{animation:apSpin .8s linear infinite}@keyframes apSpin{to{transform:rotate(360deg)}}.ap-in{animation:apIn .42s cubic-bezier(.16,1,.3,1) both}@keyframes apIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.ap-spin,.ap-in{animation:none}}`}</style>
    </div>
  );
}
