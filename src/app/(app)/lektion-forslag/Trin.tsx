"use client";
// Three more versions of the stepped lesson (Marco 2026-11-03: "lav et par versioner af hele lektionen med det nye
// tiltag … vi skal ramme den lige i røven"). Same flow everywhere: Læs → Quiz (text hidden) → Prøv (can wait) → Færdig.
// 5 Fokus: focus mode over the app (sidebar stays visible on lg, Marco 2026-11-03), Duolingo-style bottom bar that turns green/red on answer.
// 6 Delt: a brown step panel on the left (01/02/03 + module progress), the step's content on the right.
// 7 Én side: one continuous page; each step unlocks below and the text above folds away during the quiz.
import { useEffect, useState } from "react";
import { ArrowRightIcon, ArrowUpIcon, ArrowUpRightIcon, CheckIcon, ClockIcon, EyeSlashIcon, LockSimpleIcon, XIcon } from "@phosphor-icons/react";
import { lektioner } from "@/content/lektioner";

const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613", LINE = "#ece4df";
const BROWN = "linear-gradient(160deg, #33231f 0%, #201613 60%, #1a0f0c 100%)";
const STEPS = ["Læs", "Quiz", "Prøv"] as const;

function useLesson(track: string) {
  const d = lektioner[track];
  const [i, setI] = useState(4);
  const [step, setStep] = useState(0); // 0 læs, 1 quiz, 2 prøv, 3 færdig
  const [pick, setPick] = useState<number | null>(null);
  const [tried, setTried] = useState<"tried" | "later" | null>(null);
  const l = d.lessons[i];
  const nxt = d.lessons[i + 1];
  const ok = pick === l.quiz.correctIndex;
  const reset = (k: number) => { setI(k); setStep(0); setPick(null); setTried(null); };
  const finishTry = (s: "tried" | "later") => { setTried(s); setStep(3); };
  return { d, i, l, nxt, step, setStep, pick, setPick, ok, tried, finishTry, reset };
}
type Lsn = ReturnType<typeof useLesson>;

// Step body enters with a short rise (motion: explain that the screen changed). Off under reduced motion.
const ENTER = "motion-safe:animate-[trin-in_320ms_cubic-bezier(0.16,1,0.3,1)]";
function Keyframes() {
  return <style>{`@keyframes trin-in { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>;
}

function Options({ s, big }: { s: Lsn; big?: boolean }) {
  return (
    <ul className="grid gap-2.5">
      {s.l.quiz.options.map((o, k) => {
        const chosen = s.pick === k, right = s.pick !== null && k === s.l.quiz.correctIndex;
        return (
          <li key={o}>
            <button disabled={s.pick !== null} onClick={() => s.setPick(k)} className={`flex w-full items-center gap-4 rounded-[10px] border-[1.5px] text-left font-medium text-heading transition enabled:hover:border-[#201613] ${big ? "px-5 py-5 text-[17px]" : "px-5 py-4 text-[15.5px]"}`} style={{ borderColor: right ? GREEN : chosen ? O : LINE, background: right ? "#f1faf5" : chosen ? "#fdf2ed" : "#fff" }}>
              <span className="grid size-8 shrink-0 place-items-center rounded-[6px] text-[13px] font-bold" style={right ? { background: GREEN, color: "#fff" } : chosen ? { background: O, color: "#fff" } : { background: "#f5f0ed", color: INK }}>{right ? <CheckIcon size={14} weight="bold" /> : chosen ? <XIcon size={14} weight="bold" /> : "ABC"[k]}</span>
              {o}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TryAction({ s, dark }: { s: Lsn; dark?: boolean }) {
  const t = s.l.tryIt;
  if (t.where === "oevemiljoe") {
    return (
      <div className="rounded-[10px] border-[1.5px] p-4" style={{ borderColor: dark ? "rgba(255,255,255,.25)" : INK }}>
        <p className={`min-h-[64px] text-[15px] leading-[1.55] ${dark ? "text-white" : "text-heading"}`}>{t.prefill ?? t.text}</p>
        <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: dark ? "rgba(255,255,255,.12)" : LINE }}>
          <span className={`text-[11.5px] ${dark ? "text-white/55" : "text-muted"}`}>Øvemiljø · {s.d.tool}</span>
          <button onClick={() => s.finishTry("tried")} aria-label="Send" className="grid size-10 place-items-center rounded-[8px] text-white" style={{ background: O }}><ArrowUpIcon size={16} weight="bold" /></button>
        </div>
      </div>
    );
  }
  return <a href="#" className={`inline-flex h-12 items-center gap-2 rounded-[8px] border-[1.5px] px-5 text-[14.5px] font-semibold ${dark ? "border-white/30 text-white hover:bg-white/10" : "text-heading hover:bg-[#f7f2ee]"}`} style={dark ? undefined : { borderColor: INK }}>Åbn {s.d.tool} <ArrowUpRightIcon size={15} weight="bold" /></a>;
}

function Summary({ s }: { s: Lsn }) {
  const rows: [string, boolean, string][] = [
    ["Læst", true, "Teksten"],
    ["Quiz", s.ok, s.ok ? "Rigtigt svar" : "Forkert svar, vi spørger igen senere"],
    ["Prøv", s.tried === "tried", s.tried === "tried" ? "Prøvet" : "Gemt til senere under Øvemiljø"],
  ];
  return (
    <ul className="border-y" style={{ borderColor: LINE }}>
      {rows.map(([t, good, sub]) => (
        <li key={t} className="flex items-center gap-4 border-b py-3.5 last:border-0" style={{ borderColor: LINE }}>
          <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: good ? GREEN : "#d9ccc5" }}>{good ? <CheckIcon size={12} weight="bold" /> : <ClockIcon size={12} weight="bold" />}</span>
          <span className="w-16 text-[14px] font-semibold text-heading">{t}</span>
          <span className="text-[13.5px] text-muted">{sub}</span>
        </li>
      ))}
    </ul>
  );
}

function NextCard({ s }: { s: Lsn }) {
  return (
    <button onClick={() => s.nxt && s.reset(s.i + 1)} className="group flex w-full items-center gap-4 rounded-[10px] p-5 text-left text-white transition hover:-translate-y-0.5" style={{ background: INK }}>
      <span className="min-w-0 flex-1"><span className="block text-[12px] text-white/55">{s.nxt ? `Næste lektion · ${s.nxt.nr} · ${s.nxt.minutes} min` : `Sidste lektion i modul ${s.d.module.nr}`}</span><span className="mt-0.5 block truncate text-[20px] font-semibold">{s.nxt ? s.nxt.title : "Afslut modulet"}</span></span>
      <span className="grid size-12 shrink-0 place-items-center rounded-[8px] text-white transition group-hover:translate-x-0.5" style={{ background: O }}><ArrowRightIcon size={18} weight="bold" /></span>
    </button>
  );
}

// ——— 5 · Fokus ———
export function T5({ track }: { track: string }) {
  const s = useLesson(track);
  const { l, step } = s;
  const answered = s.pick !== null;
  // Bottom bar per step: the one primary action lives here, always in the same place.
  const bar =
    step === 0 ? { hint: "Teksten skjules, når du starter quizzen", btn: "Start quizzen", on: () => s.setStep(1), tone: "plain" } :
    step === 1 ? (answered ? { hint: s.ok ? "Rigtigt!" : "Ikke helt. Det rigtige svar er grønt.", btn: "Fortsæt", on: () => s.setStep(2), tone: s.ok ? "good" : "bad" } : { hint: "Vælg et svar", btn: "Fortsæt", on: undefined, tone: "plain" }) :
    step === 2 ? { hint: "", btn: "Jeg har prøvet det", on: () => s.finishTry("tried"), tone: "plain" } :
    { hint: "", btn: s.nxt ? "Næste lektion" : "Afslut modulet", on: () => s.nxt && s.reset(s.i + 1), tone: "plain" };
  const barBg = bar.tone === "good" ? "#eef8f2" : bar.tone === "bad" ? "#fdf0ea" : "#fff";

  useEffect(() => { document.documentElement.style.overflow = "hidden"; return () => { document.documentElement.style.overflow = ""; }; }, []);

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-white lg:left-60">
      <Keyframes />
      <header className="flex items-center gap-5 border-b px-5 py-4 sm:px-8" style={{ borderColor: LINE }}>
        <a href="/kurser-forslag/b" aria-label="Luk lektionen" className="grid size-9 place-items-center rounded-[8px] text-muted hover:bg-[#f5f0ed] hover:text-heading"><XIcon size={18} weight="bold" /></a>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((t, k) => <span key={t} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1ebe7]"><span className="block h-full rounded-full transition-all duration-500" style={{ width: step >= k ? "100%" : "0%", background: O }} /></span>)}
        </div>
        <span className="hidden text-[12.5px] font-medium text-muted sm:block">{s.d.tool} · Lektion {l.nr}</span>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div key={`${l.nr}-${step}`} className={`mx-auto w-full max-w-[680px] px-6 py-12 sm:py-16 ${ENTER}`}>
          {step === 0 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>1 · Læs</p>
              <h1 className="mt-3 text-[42px] font-bold leading-[1.02] tracking-[-0.04em] text-heading sm:text-[52px]">{l.title}</h1>
              <div className="mt-9 space-y-6">{l.know.map((k, n) => <p key={n} className={`leading-[1.65] ${n === 0 ? "text-[20px] font-medium text-heading" : "text-[17px] text-text"}`}>{k}</p>)}</div>
            </>
          )}
          {step === 1 && (
            <>
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>2 · Quiz <span className="inline-flex items-center gap-1 normal-case tracking-normal text-muted"><EyeSlashIcon size={13} />teksten er skjult</span></p>
              <h2 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.quiz.question}</h2>
              <div className="mt-8"><Options s={s} big /></div>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>3 · Prøv · kan vente</p>
              <h2 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.tryIt.where === "oevemiljoe" ? "Skriv det i øvemiljøet" : `Prøv det i ${s.d.tool}`}</h2>
              <p className="mt-4 text-[17px] leading-[1.65] text-text">{l.tryIt.text}</p>
              <div className="mt-7"><TryAction s={s} /></div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="grid size-16 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={30} weight="bold" /></span>
              <h2 className="mt-5 text-[44px] font-bold leading-[1.02] tracking-[-0.04em] text-heading">Lektion {l.nr} er klaret</h2>
              <div className="mt-7"><Summary s={s} /></div>
            </>
          )}
        </div>
      </main>

      <footer className="border-t transition-colors duration-300" style={{ borderColor: LINE, background: barBg }}>
        <div className="mx-auto flex w-full max-w-[680px] flex-wrap items-center justify-between gap-3 px-6 py-5">
          {step === 2 ? (
            <button onClick={() => s.finishTry("later")} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-3 text-[14px] font-semibold text-heading hover:bg-[#f5f0ed]"><ClockIcon size={16} />Spring over, jeg prøver senere</button>
          ) : (
            <p className={`flex items-center gap-2 text-[15px] font-semibold ${bar.tone === "good" ? "text-[#2f8a5c]" : bar.tone === "bad" ? "text-[#c4502f]" : "text-muted"}`}>
              {bar.tone === "good" && <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={13} weight="bold" /></span>}
              {bar.tone === "bad" && <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: O }}><XIcon size={13} weight="bold" /></span>}
              <span className={bar.tone === "plain" ? "text-[13px] font-medium" : ""}>{bar.hint}</span>
            </p>
          )}
          <button disabled={!bar.on} onClick={bar.on} className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-[8px] px-6 text-[15px] font-semibold text-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[#d9ccc5]" style={bar.on ? { background: bar.tone === "good" ? GREEN : bar.tone === "bad" ? O : INK } : undefined}>{bar.btn} <ArrowRightIcon size={15} weight="bold" /></button>
        </div>
      </footer>
    </div>
  );
}

// ——— 6 · Delt ———
export function T6({ track }: { track: string }) {
  const s = useLesson(track);
  const { l, step } = s;
  return (
    <div className="grid min-h-[calc(100svh-7rem)] overflow-hidden rounded-[12px] border bg-white lg:grid-cols-[340px_minmax(0,1fr)]" style={{ borderColor: LINE }}>
      <Keyframes />
      <aside className="flex flex-col p-7 text-white" style={{ background: BROWN }}>
        <p className="text-[11.5px] font-medium text-white/55">{s.d.tool} · Modul {s.d.module.nr} · {s.d.module.title}</p>
        <h1 className="mt-2 text-[26px] font-bold leading-[1.1] tracking-[-0.03em] !text-white">{l.title}</h1>
        <p className="mt-1 text-[12.5px] text-white/55">Lektion {l.nr} af {s.d.lessons.length} · {l.minutes} min</p>
        <ol className="mt-9 grid gap-1">
          {STEPS.map((t, k) => {
            const done = step > k, cur = step === k;
            const sub = k === 0 ? "Læs teksten i ro" : k === 1 ? "Uden at kigge" : "Kan vente til senere";
            return (
              <li key={t} className={`flex items-center gap-4 rounded-[10px] px-3 py-3 transition ${cur ? "bg-white/[0.08]" : ""}`}>
                <span className={`text-[30px] font-bold leading-none tabular-nums tracking-[-0.04em] ${cur ? "text-white" : done ? "text-white/35" : "text-white/20"}`}>0{k + 1}</span>
                <span className="min-w-0 flex-1"><span className={`block text-[15px] font-semibold ${cur || done ? "text-white" : "text-white/45"}`}>{t}</span><span className="block text-[11.5px] text-white/45">{sub}</span></span>
                {done ? <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={11} weight="bold" /></span> : cur ? <span className="size-2.5 rounded-full" style={{ background: O }} /> : null}
              </li>
            );
          })}
        </ol>
        <div className="mt-auto pt-10">
          <p className="text-[11.5px] text-white/50">Modul {s.d.module.nr}</p>
          <div className="mt-2 flex gap-1">{s.d.lessons.map((x, k) => <span key={x.nr} className="h-1.5 flex-1 rounded-full" style={{ background: k < s.i ? GREEN : k === s.i ? O : "rgba(255,255,255,.14)" }} />)}</div>
          <p className="mt-2 text-[11.5px] text-white/50">{s.i} af {s.d.lessons.length} lektioner klaret</p>
        </div>
      </aside>

      <section key={`${l.nr}-${step}`} className={`flex flex-col px-6 py-10 sm:px-14 sm:py-14 ${ENTER}`}>
        {step === 0 && (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">01 · Læs</p>
            <div className="mt-6 max-w-[62ch] space-y-6">{l.know.map((k, n) => <p key={n} className={`leading-[1.65] ${n === 0 ? "text-[22px] font-semibold leading-[1.4] tracking-[-0.01em] text-heading" : "text-[16.5px] text-text"}`}>{k}</p>)}</div>
            <Foot><span className="text-[12.5px] text-muted">Teksten skjules, når du starter quizzen.</span><Primary on={() => s.setStep(1)}>Start quizzen</Primary></Foot>
          </>
        )}
        {step === 1 && (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">02 · Quiz</p>
            <h2 className="mt-4 max-w-[24ch] text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.quiz.question}</h2>
            <div className="mt-8 max-w-[620px]"><Options s={s} /></div>
            <Foot>
              <span className={`text-[14px] font-semibold ${s.pick === null ? "text-muted !font-medium !text-[12.5px]" : s.ok ? "text-[#2f8a5c]" : "text-[#c4502f]"}`}>{s.pick === null ? "Vælg et svar" : s.ok ? "Rigtigt" : "Ikke helt. Det rigtige svar er grønt."}</span>
              <Primary on={s.pick === null ? undefined : () => s.setStep(2)}>Videre til Prøv</Primary>
            </Foot>
          </>
        )}
        {step === 2 && (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">03 · Prøv · kan vente</p>
            <h2 className="mt-4 text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.tryIt.where === "oevemiljoe" ? "Skriv det i øvemiljøet" : `Prøv det i ${s.d.tool}`}</h2>
            <p className="mt-4 max-w-[60ch] text-[16.5px] leading-[1.65] text-text">{l.tryIt.text}</p>
            <div className="mt-7 max-w-[620px]"><TryAction s={s} /></div>
            <Foot>
              <button onClick={() => s.finishTry("later")} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-3 text-[14px] font-semibold text-heading hover:bg-[#f5f0ed]"><ClockIcon size={16} />Spring over, jeg prøver senere</button>
              <Primary on={() => s.finishTry("tried")}>Jeg har prøvet det</Primary>
            </Foot>
          </>
        )}
        {step === 3 && (
          <div className="max-w-[620px]">
            <span className="grid size-14 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={26} weight="bold" /></span>
            <h2 className="mt-5 text-[42px] font-bold leading-[1.02] tracking-[-0.04em] text-heading">Lektion {l.nr} er klaret</h2>
            <div className="mt-7"><Summary s={s} /></div>
            <div className="mt-8"><NextCard s={s} /></div>
          </div>
        )}
      </section>
    </div>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <><div className="min-h-12 flex-1" /><div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6" style={{ borderColor: LINE }}>{children}</div></>;
}
function Primary({ on, children }: { on?: () => void; children: React.ReactNode }) {
  return <button disabled={!on} onClick={on} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-6 text-[14.5px] font-semibold text-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[#d9ccc5]" style={on ? { background: INK } : undefined}>{children} <ArrowRightIcon size={15} weight="bold" /></button>;
}

// ——— 7 · Én side ———
export function T7({ track }: { track: string }) {
  const s = useLesson(track);
  const { l, step } = s;
  useEffect(() => { if (step > 0) document.getElementById(`trin-${Math.min(step, 3)}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [step]);
  const Head = ({ n, t, sub, state }: { n: number; t: string; sub: string; state: "done" | "cur" | "locked" }) => (
    <div className="flex items-center gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold" style={state === "done" ? { background: INK, color: "#fff" } : state === "cur" ? { background: O, color: "#fff" } : { border: `1.5px solid ${LINE}`, color: "#b9aaa3" }}>{state === "done" ? <CheckIcon size={16} weight="bold" /> : state === "locked" ? <LockSimpleIcon size={15} /> : n}</span>
      <div><p className={`text-[20px] font-bold tracking-[-0.02em] ${state === "locked" ? "text-[#b9aaa3]" : "text-heading"}`}>{t}</p><p className="text-[12.5px] text-muted">{sub}</p></div>
    </div>
  );
  return (
    <div className="mx-auto w-full max-w-[820px]">
      <Keyframes />
      <header className="px-1 pb-6 pt-2">
        <p className="text-[12.5px] text-muted">{s.d.tool} · Modul {s.d.module.nr} · Lektion {l.nr} af {s.d.lessons.length}</p>
        <h1 className="mt-2 text-[44px] font-bold leading-[1.02] tracking-[-0.04em] text-heading">{l.title}</h1>
      </header>
      <ol className="relative grid grid-cols-[minmax(0,1fr)] gap-3 before:absolute before:bottom-8 before:left-[27px] before:top-8 before:w-px before:bg-[#e6dcd6] sm:before:left-[39px]">
        {/* 1 Læs: folds to one line once the quiz starts */}
        <li className="relative rounded-[12px] border bg-white p-4 sm:p-6" style={{ borderColor: LINE }}>
          <Head n={1} t="Læs" sub={step === 0 ? `${l.know.length} korte afsnit · ${l.minutes} min` : "Teksten er foldet sammen, mens du tager quizzen"} state={step === 0 ? "cur" : "done"} />
          {step === 0 ? (
            <div className={`mt-6 sm:pl-14 ${ENTER}`}>
              <div className="max-w-[62ch] space-y-5">{l.know.map((k, n) => <p key={n} className={`leading-[1.65] ${n === 0 ? "text-[19px] font-medium text-heading" : "text-[16px] text-text"}`}>{k}</p>)}</div>
              <div className="mt-8"><Primary on={() => s.setStep(1)}>Start quizzen</Primary></div>
            </div>
          ) : step >= 2 ? (
            <button onClick={() => s.setStep(0)} className="mt-3 text-[12.5px] font-medium text-muted underline underline-offset-4 hover:text-heading sm:ml-14">Læs teksten igen</button>
          ) : null}
        </li>

        {/* 2 Quiz */}
        <li id="trin-1" className="relative scroll-mt-4 rounded-[12px] border bg-white p-4 sm:p-6" style={{ borderColor: step === 1 ? INK : LINE }}>
          <Head n={2} t="Quiz" sub={step < 1 ? "Låses op, når du har læst" : step === 1 ? "Uden at kigge" : s.ok ? "Rigtigt svar" : "Forkert svar"} state={step < 1 ? "locked" : step === 1 ? "cur" : "done"} />
          {step === 1 && (
            <div className={`mt-6 sm:pl-14 ${ENTER}`}>
              <p className="flex items-center gap-1.5 text-[12px] text-muted"><EyeSlashIcon size={13} />Teksten er skjult</p>
              <h2 className="mt-2 text-[28px] font-bold leading-[1.15] tracking-[-0.03em] text-heading">{l.quiz.question}</h2>
              <div className="mt-6"><Options s={s} /></div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <span className={`text-[14px] font-semibold ${s.pick === null ? "!text-[12.5px] !font-medium text-muted" : s.ok ? "text-[#2f8a5c]" : "text-[#c4502f]"}`}>{s.pick === null ? "Vælg et svar" : s.ok ? "Rigtigt" : "Ikke helt. Det rigtige svar er grønt."}</span>
                <Primary on={s.pick === null ? undefined : () => s.setStep(2)}>Videre til Prøv</Primary>
              </div>
            </div>
          )}
        </li>

        {/* 3 Prøv */}
        <li id="trin-2" className="relative scroll-mt-4 rounded-[12px] border p-4 sm:p-6" style={{ borderColor: step === 2 ? INK : LINE, background: step === 2 ? "#fff" : "#fff" }}>
          <Head n={3} t="Prøv" sub={step < 2 ? "Kan vente til senere" : step === 2 ? "Valgfrit" : s.tried === "tried" ? "Prøvet" : "Gemt til senere"} state={step < 2 ? "locked" : step === 2 ? "cur" : "done"} />
          {step === 2 && (
            <div className={`mt-6 sm:pl-14 ${ENTER}`}>
              <p className="max-w-[60ch] text-[16px] leading-[1.65] text-text">{l.tryIt.text}</p>
              <div className="mt-5"><TryAction s={s} /></div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button onClick={() => s.finishTry("later")} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-3 text-[14px] font-semibold text-heading hover:bg-[#f5f0ed]"><ClockIcon size={16} />Spring over, jeg prøver senere</button>
                <Primary on={() => s.finishTry("tried")}>Jeg har prøvet det</Primary>
              </div>
            </div>
          )}
        </li>

        {/* Færdig */}
        <li id="trin-3" className="relative scroll-mt-4">
          {step === 3 ? (
            <div className={`rounded-[12px] p-6 text-white sm:p-8 ${ENTER}`} style={{ background: BROWN }}>
              <div className="flex items-center gap-4"><span className="grid size-10 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={18} weight="bold" /></span><p className="text-[24px] font-bold tracking-[-0.02em]">Lektion {l.nr} er klaret</p></div>
              <button onClick={() => s.nxt && s.reset(s.i + 1)} className="group mt-6 flex w-full items-center gap-4 rounded-[10px] bg-white p-5 text-left transition hover:-translate-y-0.5 sm:ml-14 sm:w-[calc(100%-3.5rem)]">
                <span className="min-w-0 flex-1"><span className="block text-[12px] text-muted">{s.nxt ? `Næste lektion · ${s.nxt.nr} · ${s.nxt.minutes} min` : "Sidste lektion i modulet"}</span><span className="mt-0.5 block truncate text-[19px] font-semibold text-heading">{s.nxt ? s.nxt.title : "Afslut modulet"}</span></span>
                <span className="grid size-12 shrink-0 place-items-center rounded-[8px] text-white transition group-hover:translate-x-0.5" style={{ background: O }}><ArrowRightIcon size={18} weight="bold" /></span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 rounded-[12px] border border-dashed p-4 sm:p-6" style={{ borderColor: LINE }}>
              <span className="grid size-10 place-items-center rounded-full border-[1.5px] text-[#b9aaa3]" style={{ borderColor: LINE }}><CheckIcon size={16} /></span>
              <p className="text-[15px] font-semibold text-[#b9aaa3]">Lektionen er klaret</p>
            </div>
          )}
        </li>
      </ol>
    </div>
  );
}
