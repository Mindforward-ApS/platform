"use client";

// Sign-up / sign-in in Mindforward's colours, full screen: the form column on the left (title, subtitle, social buttons,
// "eller", fields, coral button on the brand brown, top-right helper pill, © and a working DA/EN picker at the bottom); on the right a tall panel with the
// headline over the website's hero photo, which fades into a blurred brown where status cards type and turn "Færdig".
// Steps: Opret konto → Tjek din indbakke (6-digit code) → Hvor vil du starte → Vælg værktøj → (Niveautest) → done; plus Velkommen
// tilbage (log ind). Preview: nothing is saved or sent.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";
import { questions, level } from "./niveautest";
import { BrainIcon, EnvelopeSimpleIcon, GlobeIcon, CaretDownIcon, UserIcon, RocketLaunchIcon, SparkleIcon, CheckIcon } from "@phosphor-icons/react";

const c = { ink: "#111", muted: "#6b6460", line: "#e3dfdc", field: "#f7f5f3", btn: "#ebe7e4", coral: "#e8664a", page: "#e6e3e1", card: "#efedeb", brown: "#201613", onInk: "#faf6f2", onMuted: "rgba(250,246,242,0.62)", onLine: "rgba(250,246,242,0.14)" };
type Step = "opret" | "kode" | "start" | "vaerktoej" | "test" | "klar" | "login";

// Marco 2026-11-11: the language picker in the footer works; Danish and English.
type Lang = "da" | "en";
const T = {
  da: {
    tasks: ["Skriv et venligt svar til en kunde, der har ventet på sin levering", "Lav et referat af mødet med beslutninger øverst", "Fjern navne og CPR-numre, før teksten deles"],
    practising: "Øver", done: "Færdig", or: "Eller", digit: "Ciffer",
    stageBiz: "AI-træning til hele holdet", stagePriv: "AI til din egen hverdag",
    stageBizSub: "10 minutter om dagen på dansk, opgaver fra jeres egen hverdag og et kursusbevis, når I er færdige.",
    stagePrivSub: "10 minutter om dagen på dansk, opgaver fra dit eget liv og arbejde, og et kursusbevis, når du er færdig.",
    pill: { opret: ["Har du allerede en konto?", "Log ind"], login: ["Har du ikke en konto?", "Opret"], kode: ["Tjek din", "Indbakke"], start: ["Trin 1 af 2", "Niveau"], vaerktoej: ["Trin 2 af 2", "Værktøj"], test: ["Niveautest", "Spørgsmål"], klar: ["Du er", "Klar"] },
    createTitle: "Opret din konto", createSub: "Kom i gang med Mindforward på få minutter.", business: "Erhverv", private: "Privat",
    google: "Fortsæt med Google", microsoft: "Fortsæt med Microsoft", first: "Fornavn", last: "Efternavn", phone: "Telefonnummer",
    workMail: "Arbejdsmail", mail: "E-mailadresse", signUp: "Tilmeld med e-mail",
    codeTitle: "Tjek din indbakke", codeSub: "Skriv koden, vi lige har sendt til", yourMail: "din e-mail", cont: "Fortsæt", resend: "Send koden igen",
    fixMail: "Ret e-mailadressen", terms: "Vilkår", privacy: "Privatlivspolitik",
    welcome: "Velkommen", whereStart: "Hvor vil du starte?", test: "Tag niveautesten", testSub: "8 korte spørgsmål · ca. 3 min", bottom: "Start fra bunden", bottomSub: "Jeg er helt ny",
    toolTitle: "Vælg dit værktøj", toolSub: "Den retning, du vil gå. Du kan skifte senere.", startTest: "Start niveautesten",
    readyTitle: "Du er klar", next: "Næste", seeLevel: "Se dit niveau", right: "Rigtigt", wrong: "Ikke helt", yourLevel: "Dit niveau", of: "af", correct: "rigtige", readySub: "Din første lektion tager 10 minutter.", firstLesson: "Start første lektion", invite: "Inviter dit hold", plan: "Se din plan",
    backTitle: "Velkommen tilbage", backSub: "Log ind og fortsæt, hvor du slap.", gLogin: "Log ind med Google", msLogin: "Log ind med Microsoft", sendCode: "Send mig en kode",
    accept1: "Ved at fortsætte accepterer du Mindforwards", accept2: "vilkår", and: "og", accept3: "privatlivspolitik",
  },
  en: {
    tasks: ["Write a friendly reply to a customer who has been waiting for their delivery", "Summarise the meeting with the decisions at the top", "Remove names and ID numbers before the text is shared"],
    practising: "Practising", done: "Done", or: "Or", digit: "Digit",
    stageBiz: "AI training for the whole team", stagePriv: "AI for your everyday life",
    stageBizSub: "10 minutes a day, tasks from your own work and a course certificate when you are done.",
    stagePrivSub: "10 minutes a day, tasks from your own life and work, and a course certificate when you are done.",
    pill: { opret: ["Already have an account?", "Log in"], login: ["Don't have an account?", "Sign up"], kode: ["Check your", "Inbox"], start: ["Step 1 of 2", "Level"], vaerktoej: ["Step 2 of 2", "Tool"], test: ["Level test", "Question"], klar: ["You're", "Ready"] },
    createTitle: "Create your account", createSub: "Get started with Mindforward in a few minutes.", business: "Business", private: "Private",
    google: "Continue with Google", microsoft: "Continue with Microsoft", first: "First name", last: "Last name", phone: "Phone number",
    workMail: "Work email", mail: "Email address", signUp: "Sign up with email",
    codeTitle: "Check your inbox", codeSub: "Enter the code we just sent to", yourMail: "your email", cont: "Continue", resend: "Resend code",
    fixMail: "Change email address", terms: "Terms", privacy: "Privacy policy",
    welcome: "Welcome", whereStart: "Where do you want to start?", test: "Take the level test", testSub: "8 short questions · about 3 min", bottom: "Start from scratch", bottomSub: "I'm completely new",
    toolTitle: "Choose your tool", toolSub: "The direction you want to go. You can switch later.", startTest: "Start the level test",
    readyTitle: "You're ready", next: "Next", seeLevel: "See your level", right: "Correct", wrong: "Not quite", yourLevel: "Your level", of: "of", correct: "correct", readySub: "Your first lesson takes 10 minutes.", firstLesson: "Start first lesson", invite: "Invite your team", plan: "See your plan",
    backTitle: "Welcome back", backSub: "Log in and pick up where you left off.", gLogin: "Log in with Google", msLogin: "Log in with Microsoft", sendCode: "Send me a code",
    accept1: "By continuing you accept Mindforward's", accept2: "terms", and: "and", accept3: "privacy policy",
  },
} as const;

function IconTile({ children }: { children: React.ReactNode }) {
  return <span className="mx-auto grid size-[72px] place-items-center rounded-[18px] [@media(max-height:880px)]:hidden bg-white [&>svg]:size-7 shadow-[0_1px_0_rgba(0,0,0,0.04),0_6px_16px_-6px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05]" style={{ color: c.ink }}>{children}</span>;
}
function Grey({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[14px] [@media(max-height:880px)]:h-12 text-[1rem] font-medium transition hover:brightness-[0.97]" style={{ background: c.btn, color: c.ink }}>{children}</button>;
}

// Google/Microsoft buttons: white, a see-through outer edge, the logo on its own tile with an even 4 px inset.
// White buttons never get the raised 3D style (Marco 2026-11-11); only coral ones do.
export function Bezel({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="group relative flex h-14 [@media(max-height:880px)]:h-12 w-full items-center rounded-[14px] border-[4px] border-white/30 bg-white bg-clip-padding pl-[4px] text-[1rem] font-semibold text-[#111] [word-spacing:0.08em] shadow-[inset_0_0_0_1px_rgba(32,22,19,0.13),0_1px_2px_rgba(32,22,19,0.05)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:shadow-[inset_0_0_0_1px_rgba(32,22,19,0.2),0_8px_18px_-8px_rgba(32,22,19,0.22)] active:translate-y-px">
      <span className="relative z-10 grid size-10 [@media(max-height:880px)]:size-8 shrink-0 place-items-center rounded-[6px] bg-[#f5efeb]">{icon}</span>
      <span className="pointer-events-none absolute inset-0 grid place-items-center">{children}</span>
    </button>
  );
}
// Raised 3D button (Marco 2026-11-11): a coral face that is lighter at the top, a darker coral base underneath and a
// soft highlight along the top edge; it sinks into its base when pressed.
export function Black({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="mb-[6px] h-14 w-full rounded-[16px] shadow-[0_6px_0_#b8452e,0_10px_14px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(184,69,46,0.35)] [@media(max-height:880px)]:h-12 text-[1.1875rem] font-semibold text-white [word-spacing:0.08em] [text-shadow:0_1px_2px_rgba(110,100,96,0.45)] transition-[transform,box-shadow,filter] duration-150 ease-out hover:brightness-105 active:translate-y-[4px] active:shadow-[0_2px_0_#b8452e,inset_0_1px_0_rgba(255,255,255,0.35)] disabled:cursor-default disabled:hover:brightness-100 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_#b8452e,0_10px_14px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-3px_0_rgba(184,69,46,0.35)]"
      style={{ background: "linear-gradient(180deg, #f07a5d 0%, #e8664a 100%)" }}>
      {children}
    </button>
  );
}
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className="h-14 w-full min-w-0 rounded-[14px] [@media(max-height:880px)]:h-12 border bg-[#f7f4f1] px-5 text-[1.0625rem] outline-none transition shadow-[inset_0_3px_8px_rgba(32,22,19,0.22),inset_0_1px_2px_rgba(32,22,19,0.18),0_1px_0_rgba(255,255,255,0.08)] focus:bg-white placeholder:text-[#2a2a2a] focus:border-[#e8664a] focus:placeholder:text-[#9a948f]" style={{ borderColor: c.line, color: c.ink }} />;
}
function Or({ label }: { label: string }) {
  return <div className="flex items-center gap-3 text-[0.875rem]" style={{ color: c.onMuted }}><span className="h-px flex-1" style={{ background: c.onLine }} />{label}<span className="h-px flex-1" style={{ background: c.onLine }} /></div>;
}
export const Google = () => <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
export const Microsoft = () => <svg width="23" height="23" viewBox="0 0 23 23" aria-hidden><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>;

function Code({ onDone, label }: { onDone: () => void; label: string }) {
  const [v, setV] = useState(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { refs.current[0]?.focus(); }, []);
  const fill = (k: number, raw: string) => {
    const d = raw.replace(/\D/g, "");
    const nv = [...v];
    if (!d) { nv[k] = ""; setV(nv); return; }
    d.slice(0, 6 - k).split("").forEach((x, i) => { nv[k + i] = x; });
    setV(nv); refs.current[Math.min(5, k + d.length)]?.focus();
    if (nv.every(Boolean)) setTimeout(onDone, 500);
  };
  return (
    <div className="grid grid-cols-6 gap-1.5">
      {v.map((x, k) => <input key={k} ref={(el) => { refs.current[k] = el; }} value={x} inputMode="numeric" aria-label={`${label} ${k + 1}`} autoComplete={k ? "off" : "one-time-code"} onChange={(e) => fill(k, e.target.value)} onKeyDown={(e) => { if (e.key === "Backspace" && !x && k) refs.current[k - 1]?.focus(); }} className="h-14 w-full min-w-0 rounded-[10px] border bg-white text-center text-[1.25rem] font-semibold outline-none focus:border-[#e8664a]" style={{ borderColor: x ? c.coral : c.line, color: c.ink }} />)}
    </div>
  );
}

// Right panel: the hero photo fading into blurred brown, with typing status cards.
export function Stage({ privat, lang }: { privat: boolean; lang: Lang }) {
  const t = T[lang];
  const tasks = t.tasks;
  const [n, setN] = useState(0);
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const full = tasks[n % tasks.length];
    let k = 0;
    const iv = setInterval(() => { k++; setTyped(full.slice(0, k)); if (k >= full.length) { clearInterval(iv); setTimeout(() => setN((x) => x + 1), 1800); } }, 32);
    return () => clearInterval(iv);
  }, [n, tasks]);
  return (
    <div className="relative h-full overflow-hidden rounded-l-[28px] bg-[#201613]">
      {/* Marco 2026-11-11: the website's hero photo (Erhverv = office team, Privat = woman at home, crossfading with the
          toggle), heavily blurred under a brown tone that deepens towards the bottom. Mood photos only. */}
      <Image src="/img/hero-erhverv-2.jpg" alt="" fill priority sizes="50vw" className={`object-cover object-[60%_40%] transition-opacity duration-700 ${privat ? "opacity-0" : "opacity-100"}`} />
      <Image src="/img/hero-hjem.jpg" alt="" fill sizes="50vw" className={`object-cover object-[60%_40%] transition-opacity duration-700 ${privat ? "opacity-100" : "opacity-0"}`} />
      {/* Marco 2026-11-11: the photo stays heavily blurred all over (people too); no white haze, only brown. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <Image src={privat ? "/img/hero-hjem.jpg" : "/img/hero-erhverv-2.jpg"} alt="" fill sizes="50vw" className="scale-110 object-cover object-[60%_40%] blur-[14px]" />
      </div>
      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(32,22,19,0.6) 0%, rgba(32,22,19,0.25) 30%, rgba(32,22,19,0.15) 50%, rgba(32,22,19,0.72) 76%, #201613 100%)" }} />
      <div className="relative z-10 max-w-[32rem] p-10">
        <h2 className="text-[clamp(2.25rem,1.5rem+1.6vw,3.25rem)] font-normal leading-[1.08] tracking-[-0.03em]" style={{ color: c.onInk }}>{privat ? t.stagePriv : t.stageBiz}</h2>
        <p className="mt-4 max-w-[26rem] text-[1rem] leading-relaxed" style={{ color: "rgba(250,246,242,0.8)" }}>{privat ? t.stagePrivSub : t.stageBizSub}</p>
      </div>
      {/* status cards */}
      <div className="absolute inset-x-10 bottom-10 grid gap-2.5">
        <div className="flex items-center gap-3 rounded-[14px] bg-white/25 p-3.5 ring-1 ring-white/40 backdrop-blur-md">
          <span className="size-5 shrink-0 rounded-full bg-white/90 shadow-inner" />
          <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-white">{typed}<span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-white" /></p>
          <span className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-white/90">{t.practising}<span className="size-1.5 rounded-full bg-[#ff4d2e]" /></span>
        </div>
        {[0, 1].map((k) => (
          <div key={k} className="flex items-center gap-3 rounded-[14px] bg-white/15 p-3.5 ring-1 ring-white/25 backdrop-blur-md" style={{ opacity: k ? 0.55 : 0.85 }}>
            <span className="size-5 shrink-0 rounded-full bg-white/80" />
            <p className="min-w-0 flex-1 truncate text-[0.8125rem] text-white/90">{tasks[(n + 2 - k) % tasks.length]}</p>
            <span className="flex shrink-0 items-center gap-1.5 text-[0.75rem] text-white/90">{t.done}<span className="size-1.5 rounded-full bg-[#4ade80]" /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Tilmeld({ start = "opret" }: { start?: Step }) {
  const [step, setStep] = useState<Step>(start);
  const [type, setType] = useState<"privat" | "virksomhed">("virksomhed");
  const [f, setF] = useState({ fornavn: "", efternavn: "", tlf: "", mail: "" });
  const [path, setPath] = useState<"test" | "bund" | "">("");
  const [tool, setTool] = useState("");
  // Niveautest: question index, the picked answer for the current question, the score, and whether it is finished.
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [testDone, setTestDone] = useState(false);
  const [lang, setLangState] = useState<Lang>("da");
  const [langOpen, setLangOpen] = useState(false);
  useEffect(() => { try { if (localStorage.getItem("mf-lang") === "en") setLangState("en"); } catch {} }, []);
  const setLang = (l: Lang) => { setLangState(l); setLangOpen(false); try { localStorage.setItem("mf-lang", l); } catch {} };
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const t = T[lang];
  const ok = f.fornavn && f.efternavn && f.tlf.replace(/\D/g, "").length >= 8 && /\S+@\S+\.\S+/.test(f.mail);
  const pillTo: Record<Step, Step | null> = { opret: "login", login: "opret", kode: null, start: null, vaerktoej: null, test: null, klar: null };
  const [pTxt, pBtnBase] = t.pill[step];
  const pTo = pillTo[step];
  const qs = questions(lang, tool);
  const pBtn = step === "test" ? (testDone ? t.yourLevel : `${qi + 1}/${qs.length}`) : pBtnBase;

  let body: React.ReactNode = null;
  if (step === "opret") body = (
    <>
      <h1 className="text-center whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] [@media(max-height:880px)]:text-[2.25rem] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{t.createTitle}</h1>
      <p className="mt-3 text-center text-[1.0625rem]" style={{ color: c.onMuted }}>{t.createSub}</p>
      <div className="mx-auto mt-5 flex w-fit rounded-full bg-white p-1.5 text-[1rem] font-semibold [word-spacing:0.08em] shadow-[inset_0_5px_12px_rgba(32,22,19,0.38),inset_0_2px_3px_rgba(32,22,19,0.3),inset_0_-1px_0_rgba(255,255,255,0.6),0_1px_0_rgba(255,255,255,0.12)]">
        {(["virksomhed", "privat"] as const).map((k) => <button key={k} type="button" onClick={() => setType(k)} className="-translate-y-[1px] rounded-full px-5 py-1.5 transition-[transform,box-shadow] duration-150" style={type === k ? { background: "linear-gradient(180deg, #f07a5d 0%, #e8664a 100%)", color: "#fff", textShadow: "0 1px 2px rgba(110,100,96,0.45)", boxShadow: "0 3px 0 #b8452e, 0 6px 10px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(184,69,46,0.35)" } : { color: c.ink, transform: "none" }}>{k === "virksomhed" ? t.business : t.private}</button>)}
      </div>
      <div className="mt-6 grid gap-3"><Bezel icon={<Google />}>{t.google}</Bezel><Bezel icon={<Microsoft />}>{t.microsoft}</Bezel></div>
      <div className="my-5 [@media(max-height:880px)]:my-3"><Or label={t.or} /></div>
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3"><Input placeholder={t.first} value={f.fornavn} onChange={(e) => setF({ ...f, fornavn: e.target.value })} autoComplete="given-name" /><Input placeholder={t.last} value={f.efternavn} onChange={(e) => setF({ ...f, efternavn: e.target.value })} autoComplete="family-name" /></div>
        <Input placeholder={t.phone} type="tel" value={f.tlf} onChange={(e) => setF({ ...f, tlf: e.target.value })} autoComplete="tel" />
        <Input placeholder={type === "virksomhed" ? t.workMail : t.mail} type="email" value={f.mail} onChange={(e) => setF({ ...f, mail: e.target.value })} autoComplete="email" />
        <div className="mt-1"><Black onClick={() => setStep("kode")} disabled={!ok}>{t.signUp}</Black></div>
      </div>
    </>
  );
  if (step === "kode") body = (
    <>
      <IconTile><EnvelopeSimpleIcon size={20} /></IconTile>
      <h1 className="mt-4 [@media(max-height:880px)]:mt-0 text-center whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] [@media(max-height:880px)]:text-[2.25rem] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{t.codeTitle}</h1>
      <p className="mt-3 text-center text-[1.0625rem] leading-snug" style={{ color: c.onMuted }}>{t.codeSub}<br />{f.mail || t.yourMail}</p>
      <div className="mt-5"><Code label={t.digit} onDone={() => setStep("start")} /></div>
      <div className="mt-2.5"><Black onClick={() => setStep("start")}>{t.cont}</Black></div>
      <button type="button" className="mx-auto mt-3 block text-[0.75rem]" style={{ color: c.onMuted }}>{t.resend}</button>
      <div className="my-3"><Or label={t.or} /></div>
      <Grey onClick={() => setStep("opret")}>{t.fixMail}</Grey>
      <p className="mt-3 text-center text-[0.6875rem]" style={{ color: c.onMuted }}><span className="underline">{t.terms}</span> | <span className="underline">{t.privacy}</span></p>
    </>
  );
  if (step === "start") body = (
    <>
      <IconTile><RocketLaunchIcon size={20} /></IconTile>
      <h1 className="mt-4 [@media(max-height:880px)]:mt-0 text-center whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] [@media(max-height:880px)]:text-[2.25rem] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{t.welcome}, {f.fornavn || "Sofie"}</h1>
      <p className="mt-3 text-center text-[1.0625rem]" style={{ color: c.onMuted }}>{t.whereStart}</p>
      <div className="mt-5 grid gap-2">
        {([["test", t.test, t.testSub], ["bund", t.bottom, t.bottomSub]] as const).map(([k, t, d]) => (
          <button key={k} type="button" onClick={() => setPath(k)} className="flex items-center justify-between rounded-[10px] border bg-white px-3.5 py-3 text-left transition" style={{ borderColor: path === k ? c.coral : c.line }}>
            <span><span className="block text-[0.8125rem] font-medium" style={{ color: c.ink }}>{t}</span><span className="text-[0.75rem]" style={{ color: c.muted }}>{d}</span></span>
            <span className="grid size-4 place-items-center rounded-full border" style={{ borderColor: path === k ? c.coral : c.line, background: path === k ? c.coral : "#fff" }}>{path === k && <CheckIcon size={10} weight="bold" color="#fff" />}</span>
          </button>
        ))}
        <div className="mt-1"><Black onClick={() => setStep("vaerktoej")} disabled={!path}>{t.cont}</Black></div>
      </div>
    </>
  );
  if (step === "vaerktoej") body = (
    <>
      <IconTile><SparkleIcon size={20} /></IconTile>
      <h1 className="mt-4 [@media(max-height:880px)]:mt-0 text-center whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] [@media(max-height:880px)]:text-[2.25rem] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{t.toolTitle}</h1>
      <p className="mt-3 text-center text-[1.0625rem]" style={{ color: c.onMuted }}>{t.toolSub}</p>
      <div className="mt-5 grid gap-2">
        {[["chatgpt", "ChatGPT"], ["copilot", "Copilot"], ["claude", "Claude"]].map(([k, n]) => (
          <button key={k} type="button" onClick={() => setTool(k)} className="flex items-center gap-3 rounded-[10px] border bg-white px-3.5 py-2.5 text-left transition" style={{ borderColor: tool === k ? c.coral : c.line }}>
            <Image src={`/logos/${k}.png`} alt="" width={26} height={26} className="size-[26px] rounded-[7px]" />
            <span className="flex-1 text-[0.8125rem] font-medium" style={{ color: c.ink }}>{n}</span>
            <span className="grid size-4 place-items-center rounded-full border" style={{ borderColor: tool === k ? c.coral : c.line, background: tool === k ? c.coral : "#fff" }}>{tool === k && <CheckIcon size={10} weight="bold" color="#fff" />}</span>
          </button>
        ))}
        <div className="mt-1"><Black onClick={() => { if (path === "test") { setQi(0); setPick(null); setScore(0); setTestDone(false); setStep("test"); } else setStep("klar"); }} disabled={!tool}>{path === "test" ? t.startTest : t.cont}</Black></div>
      </div>
    </>
  );
  if (step === "test" && !testDone) {
    const q = qs[qi];
    const last = qi === qs.length - 1;
    body = (
      <>
        <div className="flex gap-1.5" aria-hidden>{qs.map((_, k) => <span key={k} className="h-1.5 flex-1 rounded-full transition-colors" style={{ background: k < qi || (k === qi && pick !== null) ? c.coral : c.onLine }} />)}</div>
        <h1 className="mt-6 text-[1.625rem] font-normal leading-[1.2] tracking-[-0.02em] [text-wrap:pretty]" style={{ color: c.onInk }}>{q.q}</h1>
        <div className="mt-5 grid gap-2.5">
          {q.a.map((a, k) => {
            const chosen = pick === k, isOk = k === q.ok, show = pick !== null;
            const border = show && isOk ? "#3aa66b" : show && chosen ? c.coral : c.line;
            return (
              <button key={k} type="button" disabled={show} onClick={() => { setPick(k); if (k === q.ok) setScore((x) => x + 1); }} className="flex items-center gap-3 rounded-[14px] border-2 bg-white px-4 py-3.5 text-left text-[0.9375rem] leading-snug transition disabled:cursor-default" style={{ borderColor: border, color: show && !isOk && !chosen ? "#9a918d" : c.ink }}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold" style={{ background: show && isOk ? "#3aa66b" : show && chosen ? c.coral : "#f5efeb", color: show && (isOk || chosen) ? "#fff" : c.ink }}>{show && isOk ? <CheckIcon size={14} weight="bold" /> : String.fromCharCode(65 + k)}</span>
                <span className="flex-1">{a}</span>
              </button>
            );
          })}
        </div>
        {pick !== null && (
          <div className="tm-in mt-4">
            <p className="text-[0.9375rem] leading-relaxed" style={{ color: c.onInk }}><span className="font-semibold" style={{ color: pick === q.ok ? "#6fd39b" : c.coral }}>{pick === q.ok ? t.right : t.wrong}.</span> <span style={{ color: c.onMuted }}>{q.why}</span></p>
            <div className="mt-4"><Black onClick={() => { if (last) setTestDone(true); else { setQi(qi + 1); setPick(null); } }}>{last ? t.seeLevel : t.next}</Black></div>
          </div>
        )}
      </>
    );
  }
  if (step === "test" && testDone) {
    const lv = level(score, lang);
    body = (
      <>
        <p className="text-center text-[0.875rem] font-semibold" style={{ color: c.coral }}>{t.yourLevel}</p>
        <h1 className="mt-2 text-center text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{lv.name}</h1>
        <p className="mt-3 text-center text-[1.0625rem]" style={{ color: c.onMuted }}>{score} {t.of} {qs.length} {t.correct}. {lv.text}</p>
        <div className="mt-6"><Black onClick={() => setStep("klar")}>{t.cont}</Black></div>
      </>
    );
  }
  if (step === "klar") body = (
    <>
      <IconTile><CheckIcon size={20} weight="bold" color="#e8664a" /></IconTile>
      <h1 className="mt-4 [@media(max-height:880px)]:mt-0 text-center whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] [@media(max-height:880px)]:text-[2.25rem] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{t.readyTitle}</h1>
      <p className="mt-3 text-center text-[1.0625rem]" style={{ color: c.onMuted }}>{t.readySub}</p>
      <div className="mt-5 grid gap-2"><Link href="/" className="grid h-12 place-items-center rounded-[12px] bg-[#e8664a] text-[0.9375rem] font-semibold text-[#201613]">{t.firstLesson}</Link><Grey>{type === "virksomhed" ? t.invite : t.plan}</Grey></div>
    </>
  );
  if (step === "login") body = (
    <>
      <IconTile><UserIcon size={20} /></IconTile>
      <h1 className="mt-4 [@media(max-height:880px)]:mt-0 text-center whitespace-nowrap text-[clamp(1.75rem,1.2rem+1.6vw,3.25rem)] [@media(max-height:880px)]:text-[2.25rem] font-normal tracking-[-0.03em]" style={{ color: c.onInk }}>{t.backTitle}</h1>
      <p className="mt-3 text-center text-[1.0625rem]" style={{ color: c.onMuted }}>{t.backSub}</p>
      <div className="mt-5 grid gap-2"><Bezel icon={<Google />}>{t.gLogin}</Bezel><Bezel icon={<Microsoft />}>{t.msLogin}</Bezel></div>
      <div className="my-3"><Or label={t.or} /></div>
      <div className="grid gap-2"><Input placeholder={t.mail} type="email" value={f.mail} onChange={(e) => setF({ ...f, mail: e.target.value })} autoComplete="email" /><Black onClick={() => setStep("kode")} disabled={!/\S+@\S+\.\S+/.test(f.mail)}>{t.sendCode}</Black></div>
      <p className="mt-3 text-center text-[0.6875rem]" style={{ color: c.onMuted }}>{t.accept1} <span className="underline">{t.accept2}</span> {t.and} <span className="underline">{t.accept3}</span>.</p>
    </>
  );

  return (
    // Full screen (Marco 2026-11-11: the grey backdrop and frame were only how the shot was presented on Dribbble).
    <div className="min-h-svh" style={{ background: c.brown }}>
      <div className="grid min-h-svh lg:grid-cols-[1fr_1.08fr]">
        <section className="flex min-h-svh flex-col px-6 py-6 sm:px-10 lg:px-14">
          <header className="flex items-center justify-between">
            {/* Our own logo (Marco 2026-11-11: not the reference's tile logo). Dark wordmark on the light page. */}
            <MindforwardLogo size={28} className="!text-[#faf6f2]" />
            <span className="flex items-center gap-2.5 text-[0.9375rem]" style={{ color: c.onMuted }}>{pTxt}<button type="button" onClick={() => pTo && setStep(pTo)} className="rounded-[10px] bg-white px-3.5 py-1.5 font-medium shadow-sm ring-1 ring-black/[0.05]" style={{ color: c.ink }}>{pBtn}</button></span>
          </header>
          <div key={step} className="tm-in mx-auto flex w-full max-w-[540px] flex-1 flex-col justify-center py-6">{body}</div>
          <footer className="flex items-center justify-between text-[0.6875rem]" style={{ color: c.onMuted }}>
            <span>© 2026 Mindforward</span>
            <div className="relative">
              <button type="button" onClick={() => setLangOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={langOpen} className="flex items-center gap-1 rounded-[6px] px-1.5 py-1 transition hover:text-[#faf6f2]"><GlobeIcon size={12} />{lang === "da" ? "DAN" : "ENG"}<CaretDownIcon size={10} className={`transition ${langOpen ? "rotate-180" : ""}`} /></button>
              {langOpen && (
                <div role="listbox" className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-[10px] bg-white p-1 text-[0.8125rem] shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)]">
                  {([["da", "Dansk"], ["en", "English"]] as const).map(([k, n]) => (
                    <button key={k} type="button" role="option" aria-selected={lang === k} onClick={() => setLang(k)} className="flex w-full items-center justify-between rounded-[7px] px-2.5 py-2 text-left transition hover:bg-[#f5efeb]" style={{ color: c.ink }}>{n}{lang === k && <CheckIcon size={12} weight="bold" color="#e8664a" />}</button>
                  ))}
                </div>
              )}
            </div>
          </footer>
        </section>
        <div className="sticky top-0 hidden h-svh lg:block"><Stage privat={type === "privat"} lang={lang} /></div>
      </div>
      <style>{`@keyframes tmIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } } .tm-in { animation: tmIn 420ms cubic-bezier(.16,1,.3,1) both; } @media (prefers-reduced-motion: reduce) { .tm-in { animation: none; } }`}</style>
    </div>
  );
}
