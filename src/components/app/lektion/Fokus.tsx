"use client";
// The lesson page, version 5 "Fokus" (Marco 2026-11-03), used by /kurser/[slug]/[lesson].
// Sits inside the app (sidebar stays, Marco 2026-11-03) and fills the window on lg+: Læs → Quiz (text hidden) → Prøv (can wait) → Færdig.
// Top bar: one segment per step that fills completely orange when you reach it (Marco). The one primary action
// always sits in the bottom bar, which turns green/red when the quiz is answered.
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, ArrowUpIcon, ArrowUpRightIcon, CheckIcon, ClockIcon, EyeSlashIcon, XIcon } from "@phosphor-icons/react";
import type { Lektion } from "@/content/lektioner";

const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613", LINE = "#ece4df";
const STEPS = ["Læs", "Quiz", "Prøv"] as const;
const ENTER = "motion-safe:animate-[trin-in_320ms_cubic-bezier(0.16,1,0.3,1)]";

export type FokusProps = {
  lesson: Lektion;
  tool: string;
  label: string; // e.g. "AI på arbejdet · Lektion 5 af 12"
  closeHref: string;
  next?: { href: string; title: string; minutes: number };
  finishHref: string;
  sample?: boolean; // content is example content, not this course's own
};

export function LektionFokus({ lesson: l, tool, label, closeHref, next, finishHref, sample }: FokusProps) {
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [tried, setTried] = useState<"tried" | "later" | null>(null);
  const ok = pick === l.quiz.correctIndex;
  const finish = (s: "tried" | "later") => { setTried(s); setStep(3); };

  const tone = step === 1 && pick !== null ? (ok ? "good" : "bad") : "plain";
  const barBg = tone === "good" ? "#eef8f2" : tone === "bad" ? "#fdf0ea" : "#fff";

  return (
    <div data-lektion className="flex min-h-[calc(100svh-6.5rem)] flex-col overflow-hidden rounded-[12px] border bg-white lg:h-[max(560px,calc(100svh-5.9rem))] lg:min-h-0" style={{ borderColor: LINE }}>
      <style>{`@media (min-width: 1024px) { main > div:has(> [data-lektion]) { padding-bottom: 0; } }`}</style>
      <style>{`@keyframes trin-in { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }`}</style>
      <header className="flex items-center gap-5 border-b px-5 py-4 sm:px-8" style={{ borderColor: LINE }}>
        <Link href={closeHref} aria-label="Luk lektionen" className="grid size-9 place-items-center rounded-[8px] text-muted hover:bg-[#f5f0ed] hover:text-heading"><XIcon size={18} weight="bold" /></Link>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-label="Trin i lektionen" aria-valuemin={1} aria-valuemax={3} aria-valuenow={Math.min(step + 1, 3)}>
          {STEPS.map((t, k) => <span key={t} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#f1ebe7]"><span className="block h-full rounded-full transition-all duration-500" style={{ width: step >= k ? "100%" : "0%", background: O }} /></span>)}
        </div>
        <span className="hidden max-w-[40%] truncate text-[12.5px] font-medium text-muted sm:block">{label}</span>
      </header>

      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        <div key={step} className={`mx-auto w-full max-w-[680px] px-6 py-12 sm:py-16 ${ENTER}`}>
          {sample && <p className="mb-6 w-fit rounded-[4px] border border-dashed border-[#d9ccc5] px-1.5 py-px text-[10.5px] font-medium text-muted">Eksempelindhold</p>}
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
              <ul className="mt-8 grid gap-2.5">
                {l.quiz.options.map((o, k) => {
                  const chosen = pick === k, right = pick !== null && k === l.quiz.correctIndex;
                  return (
                    <li key={o}>
                      <button disabled={pick !== null} onClick={() => setPick(k)} className="flex w-full items-center gap-4 rounded-[10px] border-[1.5px] px-5 py-5 text-left text-[17px] font-medium text-heading transition enabled:hover:border-[#201613]" style={{ borderColor: right ? GREEN : chosen ? O : LINE, background: right ? "#f1faf5" : chosen ? "#fdf2ed" : "#fff" }}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-[6px] text-[13px] font-bold" style={right ? { background: GREEN, color: "#fff" } : chosen ? { background: O, color: "#fff" } : { background: "#f5f0ed", color: INK }}>{right ? <CheckIcon size={14} weight="bold" /> : chosen ? <XIcon size={14} weight="bold" /> : "ABC"[k]}</span>
                        {o}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>3 · Prøv · kan vente</p>
              <h2 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.tryIt.where === "oevemiljoe" ? "Skriv det i øvemiljøet" : `Prøv det i ${tool}`}</h2>
              <p className="mt-4 text-[17px] leading-[1.65] text-text">{l.tryIt.text}</p>
              <div className="mt-7">
                {l.tryIt.where === "oevemiljoe" ? (
                  <div className="rounded-[10px] border-[1.5px] p-4" style={{ borderColor: INK }}>
                    <p className="min-h-[64px] text-[15px] leading-[1.55] text-heading">{l.tryIt.prefill ?? l.tryIt.text}</p>
                    <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: LINE }}>
                      <span className="text-[11.5px] text-muted">Øvemiljø · {tool}</span>
                      <button onClick={() => finish("tried")} aria-label="Send" className="grid size-10 place-items-center rounded-[8px] text-white" style={{ background: O }}><ArrowUpIcon size={16} weight="bold" /></button>
                    </div>
                  </div>
                ) : (
                  <a href="#" className="inline-flex h-12 items-center gap-2 rounded-[8px] border-[1.5px] px-5 text-[14.5px] font-semibold text-heading hover:bg-[#f7f2ee]" style={{ borderColor: INK }}>Åbn {tool} <ArrowUpRightIcon size={15} weight="bold" /></a>
                )}
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="grid size-16 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={30} weight="bold" /></span>
              <h2 className="mt-5 text-[44px] font-bold leading-[1.02] tracking-[-0.04em] text-heading">Lektionen er klaret</h2>
              <ul className="mt-7 border-y" style={{ borderColor: LINE }}>
                {([["Læst", true, "Teksten"], ["Quiz", ok, ok ? "Rigtigt svar" : "Forkert svar, vi spørger igen senere"], ["Prøv", tried === "tried", tried === "tried" ? "Prøvet" : "Gemt til senere under Øvemiljø"]] as const).map(([t, good, sub]) => (
                  <li key={t} className="flex items-center gap-4 border-b py-3.5 last:border-0" style={{ borderColor: LINE }}>
                    <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: good ? GREEN : "#d9ccc5" }}>{good ? <CheckIcon size={12} weight="bold" /> : <ClockIcon size={12} weight="bold" />}</span>
                    <span className="w-16 text-[14px] font-semibold text-heading">{t}</span>
                    <span className="text-[13.5px] text-muted">{sub}</span>
                  </li>
                ))}
              </ul>
              {next && <p className="mt-6 text-[13px] text-muted">Næste: <b className="font-semibold text-heading">{next.title}</b> · {next.minutes} min</p>}
            </>
          )}
        </div>
      </div>

      <footer className="sticky bottom-0 border-t transition-colors duration-300" style={{ borderColor: LINE, background: barBg }}>
        <div className="mx-auto flex w-full max-w-[680px] flex-wrap items-center justify-between gap-3 px-6 py-5">
          {step === 2 ? (
            <button onClick={() => finish("later")} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-3 text-[14px] font-semibold text-heading hover:bg-[#f5f0ed]"><ClockIcon size={16} />Spring over, jeg prøver senere</button>
          ) : (
            <p className={`flex items-center gap-2 text-[15px] font-semibold ${tone === "good" ? "text-[#2f8a5c]" : tone === "bad" ? "text-[#c4502f]" : "text-muted"}`}>
              {tone === "good" && <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={13} weight="bold" /></span>}
              {tone === "bad" && <span className="grid size-7 place-items-center rounded-full text-white" style={{ background: O }}><XIcon size={13} weight="bold" /></span>}
              <span className={tone === "plain" ? "text-[13px] font-medium" : ""}>
                {step === 0 ? "Teksten skjules, når du starter quizzen" : step === 1 ? (pick === null ? "Vælg et svar" : ok ? "Rigtigt!" : "Ikke helt. Det rigtige svar er grønt.") : ""}
              </span>
            </p>
          )}
          {step === 0 && <Btn on={() => setStep(1)}>Start quizzen</Btn>}
          {step === 1 && <Btn on={pick === null ? undefined : () => setStep(2)} bg={tone === "good" ? GREEN : tone === "bad" ? O : INK}>Fortsæt</Btn>}
          {step === 2 && <Btn on={() => finish("tried")}>Jeg har prøvet det</Btn>}
          {step === 3 && <Link href={next?.href ?? finishHref} className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-[8px] px-6 text-[15px] font-semibold text-white transition hover:-translate-y-px" style={{ background: INK }}>{next ? "Næste lektion" : "Afslut kurset"} <ArrowRightIcon size={15} weight="bold" /></Link>}
        </div>
      </footer>
    </div>
  );
}

function Btn({ on, bg = INK, children }: { on?: () => void; bg?: string; children: React.ReactNode }) {
  return <button disabled={!on} onClick={on} className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-[8px] px-6 text-[15px] font-semibold text-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[#d9ccc5]" style={on ? { background: bg } : undefined}>{children} <ArrowRightIcon size={15} weight="bold" /></button>;
}
