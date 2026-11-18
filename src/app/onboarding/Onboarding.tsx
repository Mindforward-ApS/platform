"use client";

// Onboarding, clickable preview (Marco 2026-11-11). Two flows from the Erhverv / Privat choice.
// Both: sign up (fornavn, efternavn, telefon, e-mail) → confirm the e-mail with a 6-digit code → you're in.
// Privat: choose membership (alene / med en ven / studerende og jobsøgende) → niveautest or "Start fra bunden" → tool.
// Erhverv: company and team size → invite the team → niveautest or "Start fra bunden" → tool.
// One question per screen, progress bar on top, big answer cards. Nothing is saved; no e-mail is sent.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";

const c = { ink: "#201613", muted: "#6b625d", coral: "#e8664a", coralText: "#b8452c", page: "#f5f2ef", line: "#e7e0db", dark: "#201613", soft: "#fbe1d7" };
type Kind = "privat" | "virksomhed";

const tools = [
  { id: "chatgpt", n: "ChatGPT", d: "Fra helt grøn til ekspert i ChatGPT" },
  { id: "copilot", n: "Copilot", d: "Fra helt grøn til ekspert i Copilot" },
  { id: "claude", n: "Claude", d: "Fra helt grøn til ekspert i Claude" },
];
const quiz = [
  { q: "Hvor ofte bruger du AI i dag?", a: ["Aldrig", "Et par gange om måneden", "Hver uge", "Hver dag"] },
  { q: "Hvad gør du, hvis svaret ikke er godt nok?", a: ["Giver op", "Spørger igen med de samme ord", "Giver flere detaljer og prøver igen", "Beder AI'en stille mig spørgsmål først"] },
  { q: "Må du skrive et kundenavn og et CPR-nummer i en AI-chat?", a: ["Ja, det er fint", "Kun kundenavnet", "Nej, ingen af dem", "Ved ikke"] },
];

function Field({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="grid gap-1.5 text-[0.875rem] font-medium" style={{ color: c.ink }}>{label}
      <input {...p} className="h-12 rounded-[10px] border bg-white px-4 text-[0.9375rem] outline-none transition focus:border-[#e8664a] focus:ring-2 focus:ring-[#e8664a]/20" style={{ borderColor: c.line }} />
    </label>
  );
}
function Choice({ on, onClick, title, sub, icon, badge }: { on?: boolean; onClick: () => void; title: string; sub?: string; icon?: React.ReactNode; badge?: string }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-4 rounded-[14px] border-2 bg-white p-4 text-left transition ${on ? "" : "hover:border-[#d9cfc8]"}`} style={{ borderColor: on ? c.coral : c.line }}>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[1rem] font-semibold" style={{ color: c.ink }}>{title}{badge && <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ background: c.soft, color: c.coralText }}>{badge}</span>}</span>
        {sub && <span className="mt-0.5 block text-[0.875rem]" style={{ color: c.muted }}>{sub}</span>}
      </span>
      <span className="grid size-5 shrink-0 place-items-center rounded-full border-2" style={{ borderColor: on ? c.coral : c.line, background: on ? c.coral : "transparent" }}>{on && <span className="size-1.5 rounded-full bg-white" />}</span>
    </button>
  );
}
function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button type="button" onClick={onClick} disabled={disabled} className="h-12 w-full rounded-[10px] text-[0.9375rem] font-semibold text-white transition disabled:opacity-40" style={{ background: c.dark }}>{children}</button>;
}

function Code({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState(["", "", "", "", "", ""]);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const set = (k: number, x: string) => {
    const d = x.replace(/\D/g, "").slice(-1);
    const nv = [...v]; nv[k] = d; setV(nv);
    if (d && k < 5) refs.current[k + 1]?.focus();
    if (nv.every(Boolean)) setTimeout(onDone, 350);
  };
  return (
    <div className="flex justify-between gap-2">
      {v.map((x, k) => (
        <input key={k} ref={(el) => { refs.current[k] = el; }} value={x} inputMode="numeric" aria-label={`Ciffer ${k + 1}`} onChange={(e) => set(k, e.target.value)}
          onKeyDown={(e) => { if (e.key === "Backspace" && !x && k) refs.current[k - 1]?.focus(); }}
          className="h-14 w-full rounded-[10px] border bg-white text-center text-[1.5rem] font-semibold outline-none focus:border-[#e8664a] focus:ring-2 focus:ring-[#e8664a]/20" style={{ borderColor: c.line, color: c.ink }} />
      ))}
    </div>
  );
}

export function Onboarding({ initial }: { initial?: Kind }) {
  const [kind, setKind] = useState<Kind | null>(initial ?? null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ fornavn: "", efternavn: "", tlf: "", mail: "" });
  const [plan, setPlan] = useState<string>("");
  const [extra, setExtra] = useState("");
  const [firma, setFirma] = useState({ navn: "", antal: "" });
  const [invites, setInvites] = useState("");
  const [path, setPath] = useState<"test" | "bund" | "">("");
  const [tool, setTool] = useState("");
  const [qi, setQi] = useState(0);

  // The steps for each flow, in order.
  const flow = kind === "virksomhed"
    ? ["tilmeld", "kode", "inde", "firma", "inviter", "start", "vaerktoej", ...(path === "test" ? ["test"] : []), "plan"]
    : ["tilmeld", "kode", "inde", "medlemskab", "start", "vaerktoej", ...(path === "test" ? ["test"] : []), "plan"];
  const id = kind ? flow[step] : "type";
  const next = () => setStep((s) => Math.min(s + 1, flow.length - 1));
  const back = () => { if (step === 0) setKind(null); else setStep((s) => s - 1); };
  const pct = kind ? Math.round(((step + 1) / flow.length) * 100) : 0;
  const okForm = form.fornavn && form.efternavn && form.tlf && /\S+@\S+\.\S+/.test(form.mail);

  let body: React.ReactNode = null;
  let title = "";
  let sub = "";
  if (id === "type") {
    title = "Hvem skal bruge Mindforward?"; sub = "Vi indretter platformen efter, om det er til dig selv eller til jeres virksomhed.";
    body = (
      <div className="grid gap-3">
        <Choice title="Til mig selv" sub="Privat medlemskab" onClick={() => { setKind("privat"); setStep(0); }} icon={<span className="grid size-10 place-items-center rounded-full" style={{ background: c.page, color: c.ink }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg></span>} />
        <Choice title="Til min virksomhed" sub="Til dig og dine kolleger" onClick={() => { setKind("virksomhed"); setStep(0); }} icon={<span className="grid size-10 place-items-center rounded-full" style={{ background: c.page, color: c.ink }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-4h4v4" /></svg></span>} />
      </div>
    );
  } else if (id === "tilmeld") {
    title = kind === "virksomhed" ? "Opret jeres konto" : "Opret din konto"; sub = "Det tager under to minutter.";
    body = (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Fornavn" value={form.fornavn} onChange={(e) => setForm({ ...form, fornavn: e.target.value })} autoComplete="given-name" />
          <Field label="Efternavn" value={form.efternavn} onChange={(e) => setForm({ ...form, efternavn: e.target.value })} autoComplete="family-name" />
        </div>
        <Field label="Telefonnummer" type="tel" value={form.tlf} onChange={(e) => setForm({ ...form, tlf: e.target.value })} autoComplete="tel" placeholder="12 34 56 78" />
        <Field label={kind === "virksomhed" ? "Arbejdsmail" : "E-mailadresse"} type="email" value={form.mail} onChange={(e) => setForm({ ...form, mail: e.target.value })} autoComplete="email" placeholder={kind === "virksomhed" ? "navn@firma.dk" : "navn@mail.dk"} />
        <Primary onClick={next} disabled={!okForm}>Tilmeld</Primary>
        <p className="text-center text-[0.8125rem]" style={{ color: c.muted }}>Har du allerede en konto? <span className="font-semibold underline" style={{ color: c.ink }}>Log ind</span></p>
      </div>
    );
  } else if (id === "kode") {
    title = "Bekræft din e-mail"; sub = `Vi har sendt en kode på 6 cifre til ${form.mail || "din e-mail"}.`;
    body = (
      <div className="grid gap-5">
        <Code onDone={next} />
        <p className="text-center text-[0.8125rem]" style={{ color: c.muted }}>Ingen kode? <span className="font-semibold underline" style={{ color: c.ink }}>Send igen</span> · I dette preview virker alle 6 cifre.</p>
      </div>
    );
  } else if (id === "inde") {
    title = `Velkommen, ${form.fornavn || "du"}`; sub = "Din e-mail er bekræftet, og du er logget ind.";
    body = (
      <div className="grid gap-5">
        <div className="grid place-items-center rounded-[16px] py-8" style={{ background: c.page }}>
          <span className="grid size-16 place-items-center rounded-full text-[1.75rem] text-white" style={{ background: c.coral }}>✓</span>
        </div>
        <Primary onClick={next}>Fortsæt</Primary>
      </div>
    );
  } else if (id === "medlemskab") {
    title = "Vælg dit medlemskab"; sub = "Det samme indhold i alle tre. Ingen binding.";
    body = (
      <div className="grid gap-3">
        <Choice on={plan === "alene"} onClick={() => setPlan("alene")} title="Enkelt bruger" sub="69 kr. pr. måned" />
        <Choice on={plan === "ven"} onClick={() => setPlan("ven")} title="Med en ven" sub="109 kr. pr. måned for jer begge" badge="54,50 kr. hver" />
        {plan === "ven" && <Field label="Din vens e-mail" type="email" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="ven@mail.dk" />}
        <Choice on={plan === "studie"} onClick={() => setPlan("studie")} title="Studerende eller jobsøgende" sub="34,50 kr. pr. måned" badge="Halv pris" />
        {plan === "studie" && (
          <div className="grid gap-2 rounded-[14px] p-4" style={{ background: c.page }}>
            <Field label="Studiemail" type="email" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="navn@student.dk" />
            <p className="text-[0.8125rem]" style={{ color: c.muted }}>Ingen studiemail? <span className="font-semibold underline" style={{ color: c.ink }}>Upload studiekort eller bevis for jobsøgning</span></p>
          </div>
        )}
        <Primary onClick={next} disabled={!plan}>Fortsæt</Primary>
      </div>
    );
  } else if (id === "firma") {
    title = "Om jeres virksomhed"; sub = "Så vi kan sætte holdet og prisen rigtigt op.";
    body = (
      <div className="grid gap-4">
        <Field label="Virksomhedens navn" value={firma.navn} onChange={(e) => setFirma({ ...firma, navn: e.target.value })} placeholder="Firmanavn ApS" />
        <p className="text-[0.875rem] font-medium" style={{ color: c.ink }}>Hvor mange skal bruge Mindforward?</p>
        <div className="grid gap-3">
          <Choice on={firma.antal === "1"} onClick={() => setFirma({ ...firma, antal: "1" })} title="1–9 brugere" sub="69 kr. pr. bruger pr. måned · chat-support" />
          <Choice on={firma.antal === "10"} onClick={() => setFirma({ ...firma, antal: "10" })} title="10 brugere eller flere" sub="55 kr. pr. bruger pr. måned · telefonsupport" badge="Rabat" />
          <Choice on={firma.antal === "ent"} onClick={() => setFirma({ ...firma, antal: "ent" })} title="Enterprise" sub="Vi finder en løsning sammen · telefonsupport" />
        </div>
        <Primary onClick={next} disabled={!firma.navn || !firma.antal}>Fortsæt</Primary>
      </div>
    );
  } else if (id === "inviter") {
    title = "Inviter dit hold"; sub = "Skriv kollegernes e-mails, eller del et link. Du kan også gøre det senere.";
    body = (
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-[0.875rem] font-medium" style={{ color: c.ink }}>E-mails, én pr. linje
          <textarea rows={4} value={invites} onChange={(e) => setInvites(e.target.value)} placeholder={"sofie@firma.dk\nmads@firma.dk"} className="rounded-[10px] border bg-white p-4 text-[0.9375rem] outline-none focus:border-[#e8664a]" style={{ borderColor: c.line }} />
        </label>
        <div className="flex items-center justify-between rounded-[12px] p-3 pl-4 text-[0.875rem]" style={{ background: c.page, color: c.muted }}>
          <span className="truncate">app.mindforward.dk/deltag/k7f2…</span>
          <span className="rounded-[8px] bg-white px-3 py-1.5 font-semibold" style={{ color: c.ink }}>Kopiér link</span>
        </div>
        <Primary onClick={next}>{invites.trim() ? `Send ${invites.trim().split(/\s+/).length} invitationer` : "Spring over"}</Primary>
      </div>
    );
  } else if (id === "start") {
    title = "Hvor vil du starte?"; sub = "Kender du lidt til AI, kan en kort test springe det over, du allerede kan.";
    body = (
      <div className="grid gap-3">
        <Choice on={path === "test"} onClick={() => setPath("test")} title="Tag niveautesten" sub="3 korte spørgsmål · ca. 2 minutter" />
        <Choice on={path === "bund"} onClick={() => setPath("bund")} title="Start fra bunden" sub="Jeg er helt ny" />
        <Primary onClick={next} disabled={!path}>Fortsæt</Primary>
      </div>
    );
  } else if (id === "vaerktoej") {
    title = "Hvilket værktøj vil du lære?"; sub = kind === "virksomhed" ? "Vælg det, I bruger i virksomheden. Du kan skifte senere." : "Vælg den retning, du vil gå. Du kan skifte senere.";
    body = (
      <div className="grid gap-3">
        {tools.map((t) => <Choice key={t.id} on={tool === t.id} onClick={() => setTool(t.id)} title={t.n} sub={t.d} icon={<Image src={`/logos/${t.id}.png`} alt="" width={36} height={36} className="size-9 rounded-[9px]" />} />)}
        <Primary onClick={() => { setQi(0); next(); }} disabled={!tool}>Fortsæt</Primary>
      </div>
    );
  } else if (id === "test") {
    const q = quiz[qi];
    title = q.q; sub = `Niveautest · spørgsmål ${qi + 1} af ${quiz.length}`;
    body = <div className="grid gap-3">{q.a.map((a) => <Choice key={a} onClick={() => (qi < quiz.length - 1 ? setQi(qi + 1) : next())} title={a} />)}</div>;
  } else if (id === "plan") {
    const t = tools.find((x) => x.id === tool) ?? tools[0];
    const lvl = path === "test" ? "Øvet" : "Grøn";
    title = "Din plan er klar"; sub = path === "test" ? "Ud fra niveautesten starter du her:" : "Du starter helt fra begyndelsen:";
    body = (
      <div className="grid gap-4">
        <div className="rounded-[16px] p-5" style={{ background: c.dark }}>
          <div className="flex items-center gap-3"><Image src={`/logos/${t.id}.png`} alt="" width={36} height={36} className="size-9 rounded-[9px]" /><p className="font-semibold text-white">{t.n} · niveau {lvl}</p></div>
          <ol className="mt-4 grid gap-2 text-[0.9375rem] text-white/80">
            {["Velkommen til " + t.n, "Din første samtale", "Mere end tekst"].map((x, k) => <li key={x} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full text-[0.75rem] font-bold" style={{ background: k === 0 ? c.coral : "rgba(255,255,255,0.12)", color: k === 0 ? c.ink : "#fff" }}>{k + 1}</span>{x}</li>)}
          </ol>
        </div>
        {kind === "virksomhed" && <p className="rounded-[12px] p-4 text-[0.875rem]" style={{ background: c.page, color: c.muted }}>Som admin finder du holdet under <b style={{ color: c.ink }}>Mit hold</b>. Kollegerne får deres egen onboarding, når de åbner invitationen.</p>}
        <Link href="/" className="grid h-12 place-items-center rounded-[10px] text-[0.9375rem] font-semibold" style={{ background: c.coral, color: c.ink }}>Start første lektion</Link>
      </div>
    );
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" style={{ background: c.page }}>
      {/* Left: brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-10 lg:flex" style={{ background: "linear-gradient(160deg,#2e1f1c,#1a0f0c)" }}>
        <div aria-hidden className="absolute -right-24 top-1/3 size-[28rem] rounded-full opacity-30 blur-3xl" style={{ background: c.coral }} />
        <MindforwardLogo className="relative" />
        <div className="relative">
          <p className="max-w-[24rem] text-[2.25rem] font-semibold leading-[1.15] tracking-[-0.03em] text-white">{kind === "virksomhed" ? "AI-træning til hele holdet." : "Lær AI i dit eget tempo."}</p>
          <p className="mt-4 max-w-[22rem] text-white/60">10 minutter om dagen på dansk. Opgaver fra din egen hverdag og et kursusbevis, når du er færdig.</p>
        </div>
        <p className="relative text-[0.8125rem] text-white/40">Preview · intet gemmes, og der sendes ingen mails.</p>
      </aside>
      {/* Right: the step */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center gap-4">
          {(kind || step > 0) && <button type="button" onClick={back} aria-label="Tilbage" className="grid size-9 place-items-center rounded-full bg-white" style={{ color: c.ink }}>←</button>}
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: c.coral }} /></div>
          {kind && <span className="rounded-full bg-white px-3 py-1 text-[0.75rem] font-semibold" style={{ color: c.muted }}>{kind === "virksomhed" ? "Erhverv" : "Privat"}</span>}
        </div>
        <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col justify-center py-10">
          <h1 key={id + qi} className="text-[1.875rem] font-semibold leading-tight tracking-[-0.02em]" style={{ color: c.ink }}>{title}</h1>
          {sub && <p className="mt-2 text-[1rem]" style={{ color: c.muted }}>{sub}</p>}
          <div className="mt-8">{body}</div>
        </div>
      </main>
    </div>
  );
}
