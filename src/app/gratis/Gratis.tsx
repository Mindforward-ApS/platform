"use client";

// Free private access with paywalls (Marco 2026-11-17). Free: AI Fundamentals, Kom i gang med <værktøj> and their two
// certificates. Locked and always visible with a lock: the rest of the tool course, the øvemiljø and the next
// certificates. Every locked thing opens the same paywall. Finishing a free course shows Sofie and the paywall.
// Preview only: progress, prices and buttons are examples; nothing is bought or saved.
import Image from "next/image";
import { useState } from "react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";
import { BookOpenIcon, ChatsIcon, CheckIcon, LockSimpleIcon, SealCheckIcon, SquaresFourIcon, XIcon, ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";

const c = { ink: "#201613", text: "#3d3330", muted: "#7a706b", line: "#e7e2de", brown: "#201613", coral: "#e8664a", peach: "#fbe1d7", cream: "#f6f1ea" };
type Why = "kursus" | "oevemiljoe" | "certifikat" | "klaret";
type View = "oversigt" | "kurser" | "certifikater";

const modules = [
  { t: "Kom i gang med ChatGPT", n: 4, free: true },
  { t: "Skriv mails og tekster", n: 5, free: false },
  { t: "Referater og møder", n: 4, free: false },
  { t: "Analyse af tal og filer", n: 5, free: false },
  { t: "Avanceret: egne GPT'er", n: 6, free: false },
];
const certs = [
  { t: "AI Fundamentals", s: "Grundlæggende AI-forståelse", free: true, done: true },
  { t: "Kom i gang med ChatGPT", s: "Dine første opgaver i ChatGPT", free: true, done: false },
  { t: "ChatGPT · Niveau 1", s: "Grundlag i hverdagen", free: false, done: false },
  { t: "ChatGPT · Niveau 2", s: "Øvet", free: false, done: false },
  { t: "ChatGPT · Niveau 3", s: "Avanceret", free: false, done: false },
];

function Lock({ small = false }: { small?: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-full bg-white/90 font-medium ${small ? "px-2 py-0.5 text-[0.6875rem]" : "px-2.5 py-1 text-[0.75rem]"}`} style={{ color: c.ink }}><LockSimpleIcon size={small ? 10 : 12} weight="bold" />Låst</span>;
}

function Paywall({ why, onClose }: { why: Why; onClose: () => void }) {
  const head = {
    kursus: "Resten af kurset er låst",
    oevemiljoe: "Øvemiljøet er låst",
    certifikat: "Det næste certifikat er låst",
    klaret: "Godt gået! Klar til næste skridt?",
  }[why];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(32,22,19,0.55)] p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="pw-title" onClick={(e) => e.stopPropagation()} className="pw-in my-auto grid w-full max-w-[860px] overflow-hidden rounded-[24px] bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[220px] md:min-h-[480px]" style={{ background: "#f7f1f0" }}>
          {why === "oevemiljoe" ? (
            <div className="absolute inset-0 p-6" style={{ background: c.brown }}>
              <p className="text-[0.75rem] uppercase tracking-[0.1em] text-white/60">Preview af øvemiljøet</p>
              <div className="mt-4 grid gap-2.5 blur-[1.5px]">
                <div className="rounded-[12px] rounded-tl-[4px] bg-white/10 p-3 text-[0.8125rem] text-white/90">Skriv en venlig rykker til Hansen VVS, faktura 4471, 14 dage over forfald.</div>
                <div className="ml-8 rounded-[12px] rounded-tr-[4px] bg-white p-3 text-[0.8125rem]" style={{ color: c.ink }}>Kære Hansen VVS. Vi kan se, at faktura 4471 …</div>
                <div className="rounded-[12px] bg-[#e8664a] p-3 text-[0.8125rem] text-white">Score 86 · Husk forfaldsdatoen</div>
              </div>
              <span className="absolute bottom-6 left-6"><Lock /></span>
            </div>
          ) : (
            <Image src="/img/sofie/tommel.png" alt="Sofie, AI-tutor" fill sizes="400px" className="object-cover object-[45%_18%]" />
          )}
          {why !== "oevemiljoe" && <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[0.75rem] font-semibold" style={{ color: c.ink }}><span className="size-1.5 rounded-full" style={{ background: c.coral }} />Sofie · AI-tutor</span>}
        </div>
        <div className="relative flex flex-col p-7 sm:p-8">
          <button type="button" onClick={onClose} aria-label="Luk" className="absolute right-4 top-4 grid size-8 place-items-center rounded-full hover:bg-black/5"><XIcon size={16} /></button>
          <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.08em]" style={{ color: c.coral }}>Mindforward Plus</p>
          <h2 id="pw-title" className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-[-0.02em]" style={{ color: c.ink }}>{head}</h2>
          <p className="mt-2 text-[0.9375rem]" style={{ color: c.text }}>Lås hele forløbet op og bliv rigtig god til AI i dit eget arbejde.</p>
          <ul className="mt-5 grid gap-2.5 text-[0.9375rem]" style={{ color: c.ink }}>
            {["Hele kurset fra helt grøn til ekspert", "Øvemiljøet med opgaver fra dit eget arbejde og score", "Alle certifikater, Niveau 1 til 3", "Sofie følger dig hele vejen"].map((t) => (
              <li key={t} className="flex items-start gap-2.5"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full" style={{ background: c.peach }}><CheckIcon size={11} weight="bold" color={c.coral} /></span>{t}</li>
            ))}
          </ul>
          <div className="mt-6 flex items-baseline gap-1.5"><span className="text-[2rem] font-semibold tracking-[-0.03em]" style={{ color: c.ink }}>69 kr</span><span className="text-[0.875rem]" style={{ color: c.muted }}>/ md. inkl. moms · opsig når du vil</span></div>
          <div className="mt-auto grid gap-2 pt-6">
            <button type="button" className="h-12 rounded-[14px] text-[1rem] font-semibold text-white [text-shadow:0_1px_2px_rgba(110,100,96,0.45)] shadow-[0_6px_0_#b8452e,0_10px_14px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.4)] transition-[transform,box-shadow] active:translate-y-[4px] active:shadow-[0_2px_0_#b8452e]" style={{ background: "linear-gradient(180deg,#f07a5d,#e8664a)" }}>Lås op</button>
            <button type="button" onClick={onClose} className="h-11 rounded-[14px] text-[0.9375rem] font-medium hover:bg-black/5" style={{ color: c.ink }}>Ikke nu</button>
          </div>
          <p className="text-center text-[0.6875rem]" style={{ color: c.muted }}>Eksempelpris i preview.</p>
        </div>
      </div>
    </div>
  );
}

export function Gratis() {
  const [view, setView] = useState<View>("oversigt");
  const [pw, setPw] = useState<Why | null>(null);
  const nav: [View | "oevemiljoe", string, typeof SquaresFourIcon, boolean][] = [["oversigt", "Oversigt", SquaresFourIcon, false], ["kurser", "Mine kurser", BookOpenIcon, false], ["oevemiljoe", "Øvemiljø", ChatsIcon, true], ["certifikater", "Certifikater", SealCheckIcon, false]];
  const card = "rounded-[16px] bg-white";

  const Courses = (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between"><p className="text-[1.0625rem] font-semibold" style={{ color: c.ink }}>AI Fundamentals</p><span className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold" style={{ background: "#e3f3ea", color: "#2f7a50" }}>Gratis · Klaret</span></div>
        <p className="mt-1 text-[0.875rem]" style={{ color: c.muted }}>Hvad AI er, gode prompts, fakta og data. 6 lektioner.</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: c.cream }}><div className="h-full w-full rounded-full" style={{ background: c.coral }} /></div>
        <button type="button" onClick={() => setPw("klaret")} className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[10px] px-3.5 text-[0.875rem] font-medium" style={{ background: c.cream, color: c.ink }}>Se, hvad der sker, når man er færdig <ArrowRightIcon size={14} /></button>
      </div>
      <div className={`${card} p-5`}>
        <div className="flex items-center justify-between"><p className="text-[1.0625rem] font-semibold" style={{ color: c.ink }}>Fra helt grøn til ekspert i ChatGPT</p><span className="rounded-full px-2.5 py-1 text-[0.75rem] font-semibold" style={{ background: c.peach, color: "#b8452c" }}>Delvist gratis</span></div>
        <ul className="mt-3 grid gap-1.5">
          {modules.map((m, k) => (
            <li key={m.t}>
              <button type="button" onClick={() => !m.free && setPw("kursus")} className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition hover:bg-[#faf6f3]" style={{ opacity: m.free ? 1 : 0.7 }}>
                <span className="grid size-7 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold" style={{ background: m.free ? c.coral : c.cream, color: m.free ? "#fff" : c.muted }}>{m.free ? k + 1 : <LockSimpleIcon size={12} weight="bold" />}</span>
                <span className="min-w-0 flex-1"><span className="block text-[0.9375rem] font-medium" style={{ color: c.ink }}>{m.t}</span><span className="text-[0.75rem]" style={{ color: c.muted }}>{m.n} lektioner{m.free ? " · gratis" : ""}</span></span>
                {!m.free && <Lock small />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
  const Certs = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {certs.map((x) => (
        <button key={x.t} type="button" onClick={() => !x.free && setPw("certifikat")} className={`${card} relative overflow-hidden text-left transition hover:-translate-y-0.5`}>
          <div className="relative h-28 px-5 py-4" style={{ background: x.free ? c.brown : "#5a4f4b", filter: x.free ? undefined : "grayscale(1)" }}>
            <MindforwardLogo size={18} className="!text-[#faf6f2]" />
            <span className="absolute -bottom-6 right-5 grid size-14 place-items-center rounded-full text-[0.8125rem] font-bold text-white ring-4 ring-white" style={{ background: x.free ? c.coral : "#9a908b" }}>AI</span>
            {!x.free && <span className="absolute right-3 top-3"><Lock small /></span>}
          </div>
          <div className="px-5 pb-5 pt-8" style={{ filter: x.free ? undefined : "blur(0.4px)" }}>
            <p className="text-[1rem] font-semibold" style={{ color: c.ink }}>{x.t}</p>
            <p className="text-[0.8125rem]" style={{ color: c.muted }}>{x.s}</p>
            <p className="mt-3 text-[0.8125rem] font-medium" style={{ color: x.done ? "#2f7a50" : x.free ? c.coral : c.muted }}>{x.done ? "✓ Optjent" : x.free ? "Gratis · 1 af 4 lektioner" : "Kræver Mindforward Plus"}</p>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid min-h-svh lg:grid-cols-[240px_1fr]" style={{ background: c.cream }}>
      <aside className="hidden flex-col gap-1 p-3 lg:flex" style={{ background: "linear-gradient(180deg,#2c1f1b,#201613)" }}>
        <div className="px-3 pb-6 pt-4"><MindforwardLogo size={24} className="!text-[#faf6f2]" /></div>
        {nav.map(([k, l, I, locked]) => (
          <button key={k} type="button" onClick={() => (k === "oevemiljoe" ? setPw("oevemiljoe") : setView(k))} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[0.9375rem] transition" style={view === k ? { background: c.coral, color: "#fff" } : { color: "rgba(250,246,242,0.82)" }}>
            <I size={18} weight={view === k ? "fill" : "regular"} />{l}{locked && <LockSimpleIcon size={13} className="ml-auto opacity-70" />}
          </button>
        ))}
        <div className="mt-auto rounded-[14px] bg-white/[0.06] p-4 ring-1 ring-white/10">
          <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold text-white"><SparkleIcon size={14} weight="fill" color={c.coral} />Du har gratis adgang</p>
          <p className="mt-1 text-[0.75rem] text-white/65">2 kurser og 2 certifikater. Lås resten op, når du er klar.</p>
          <button type="button" onClick={() => setPw("kursus")} className="mt-3 h-8 w-full rounded-[8px] text-[0.8125rem] font-semibold" style={{ background: c.coral, color: "#fff" }}>Se Plus</button>
        </div>
      </aside>
      <main className="min-w-0 p-4 sm:p-6">
        <div className="mb-4 flex gap-2 lg:hidden">{nav.map(([k, l]) => <button key={k} type="button" onClick={() => (k === "oevemiljoe" ? setPw("oevemiljoe") : setView(k))} className="rounded-full bg-white px-3 py-1.5 text-[0.8125rem]">{l}</button>)}</div>
        {view === "oversigt" && (
          <div className="grid gap-4">
            <div className="rounded-[16px] p-7 text-white" style={{ background: "radial-gradient(80% 95% at 62% 112%, #e8664a 0%, rgba(232,102,74,.22) 58%, transparent 80%), #201613" }}>
              <p className="text-[0.75rem] uppercase tracking-[0.08em] text-white/70">Godmorgen, Anna</p>
              <h1 className="mt-3 text-[2rem] font-bold leading-tight" style={{ color: "#fff" }}>Du har klaret AI Fundamentals</h1>
              <p className="mt-2 max-w-[36ch] text-[0.9375rem] text-white/80">Næste gratis skridt: Kom i gang med ChatGPT.</p>
              <button type="button" onClick={() => setView("kurser")} className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[0.9375rem] font-semibold" style={{ color: c.ink }}>Fortsæt <ArrowRightIcon size={15} /></button>
            </div>
            {Courses}
            <div className={`${card} p-5`}><div className="mb-4 flex items-center justify-between"><p className="text-[1.0625rem] font-semibold" style={{ color: c.ink }}>Certifikater</p><button type="button" onClick={() => setView("certifikater")} className="text-[0.875rem] font-medium" style={{ color: c.coral }}>Se alle</button></div>{Certs}</div>
          </div>
        )}
        {view === "kurser" && <><h1 className="mb-4 text-[1.75rem] font-semibold" style={{ color: c.ink }}>Mine kurser</h1>{Courses}</>}
        {view === "certifikater" && <><h1 className="mb-4 text-[1.75rem] font-semibold" style={{ color: c.ink }}>Certifikater</h1>{Certs}</>}
      </main>
      {pw && <Paywall why={pw} onClose={() => setPw(null)} />}
      <style>{`.pw-in{animation:pwIn .45s cubic-bezier(.16,1,.3,1) both}@keyframes pwIn{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.pw-in{animation:none}}`}</style>
    </div>
  );
}
