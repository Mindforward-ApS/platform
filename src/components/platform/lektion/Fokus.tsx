"use client";
// The lesson page, version 5 "Fokus" (Marco 2026-11-03), ported 1:1 to /forloeb/[spor]/[lektion].
// Sits inside the app (sidebar stays) and fills the window on lg+: Læs → Quiz (text hidden) → Prøv (can wait) → Færdig.
// Top bar: one segment per step that fills completely orange when you reach it. The one primary action always sits in
// the bottom bar, which turns green/red when the quiz is answered. No videos (Mindforward lessons have none).
// Greb rules kept: the server checks the answer (the client never knows the right option), a correct answer marks the
// lesson done, options are shuffled after hydration, and a wrong answer can be retried.
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { ArrowRightIcon, ArrowUpIcon, ArrowUpRightIcon, CheckIcon, ClockIcon, EyeSlashIcon, XIcon } from "@phosphor-icons/react";
import { shuffledOrder } from "@/lib/course-quiz";

const O = "var(--pf-e2643f)", GREEN = "var(--pf-5cbf8f)", INK = "var(--pf-201613)", LINE = "var(--pf-ece4df)";
const STEPS = ["Læs", "Quiz", "Prøv"] as const;
const ENTER = "motion-safe:animate-[trin-in_320ms_cubic-bezier(0.16,1,0.3,1)]";

type Answer = (chosenIndex: number) => Promise<{ ok: true; correct: boolean } | { ok: false; error: string }>;
const subscribe = () => () => {};

export type FokusProps = {
  lesson: {
    title: string;
    know: string[];
    quiz: { question: string; options: string[] };
    tryIt: { where: string; text: string; prefill: string | null };
  };
  tool: string;
  toolUrl: string;
  /** /sandkasse/<tool>, where "oevemiljoe" tasks open with the prompt filled in. */
  sandboxHref: string;
  label: string; // e.g. "ChatGPT · Modul 1 · Lektion 3 af 7"
  closeHref: string;
  next?: { href: string; title: string; minutes: number };
  finishHref: string;
  initiallyCompleted: boolean;
  answer: Answer;
};

export function LektionFokus({ lesson: l, tool, toolUrl, sandboxHref, label, closeHref, next, finishHref, initiallyCompleted, answer }: FokusProps) {
  const [step, setStep] = useState(0);
  const [order] = useState(() => shuffledOrder(l.quiz.options.length));
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [pick, setPick] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | "error" | null>(null);
  const [pending, start] = useTransition();
  const [tried, setTried] = useState<"tried" | "later" | null>(null);
  const ok = result === "correct";
  const finish = (s: "tried" | "later") => { setTried(s); setStep(3); };
  const choose = (k: number) => {
    if (pending || ok) return;
    setPick(k);
    setResult(null);
    start(async () => {
      const r = await answer(k);
      setResult(!r.ok ? "error" : r.correct ? "correct" : "wrong");
    });
  };

  const tone = step === 1 && result !== null && result !== "error" ? (ok ? "good" : "bad") : "plain";
  const barBg = tone === "good" ? "var(--pf-eef8f2)" : tone === "bad" ? "var(--pf-fdf0ea)" : "var(--pf-fff)";
  const sandboxLink = `${sandboxHref}?tekst=${encodeURIComponent(l.tryIt.prefill ?? l.tryIt.text)}`;
  const doneOk = ok || initiallyCompleted;

  return (
    <div data-pf-fill data-testid="lesson-fokus" className="flex min-h-[calc(100svh-6.5rem)] flex-col overflow-hidden rounded-[12px] border bg-pf-white lg:h-[max(560px,calc(100svh-5.9rem))] lg:min-h-0" style={{ borderColor: LINE }}>
      <header className="flex items-center gap-5 border-b px-5 py-4 sm:px-8" style={{ borderColor: LINE }}>
        <Link href={closeHref} aria-label="Luk lektionen" className="grid size-9 place-items-center rounded-[8px] text-pf-muted hover:bg-[var(--pf-f5f0ed)] hover:text-heading"><XIcon size={18} weight="bold" /></Link>
        <div className="flex flex-1 gap-1.5" role="progressbar" aria-label="Trin i lektionen" aria-valuemin={1} aria-valuemax={3} aria-valuenow={Math.min(step + 1, 3)}>
          {STEPS.map((t, k) => <span key={t} className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--pf-f1ebe7)]"><span className="block h-full rounded-full transition-all duration-500" style={{ width: step >= k ? "100%" : "0%", background: O }} /></span>)}
        </div>
        <span className="hidden max-w-[40%] truncate text-[12.5px] font-medium text-pf-muted sm:block" data-testid="lesson-position">{label}</span>
      </header>

      <div className="min-h-0 flex-1 lg:overflow-y-auto">
        <div key={step} className={`mx-auto w-full max-w-[680px] px-6 py-12 sm:py-16 ${ENTER}`}>
          {step === 0 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>1 · Læs</p>
              <h1 className="mt-3 text-[42px] font-bold leading-[1.02] tracking-[-0.04em] text-heading sm:text-[52px]">{l.title}</h1>
              <div className="mt-9 space-y-6" data-testid="lesson-know">{l.know.map((k, n) => <p key={n} className={`leading-[1.65] ${n === 0 ? "text-[20px] font-medium text-heading" : "text-[17px] text-pf-text"}`}>{k}</p>)}</div>
            </>
          )}
          {step === 1 && (
            <div data-testid="lesson-quiz">
              <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>2 · Quiz <span className="inline-flex items-center gap-1 normal-case tracking-normal text-pf-muted"><EyeSlashIcon size={13} />teksten er skjult</span></p>
              <h2 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.quiz.question}</h2>
              <ul className="mt-8 grid min-h-[13rem] gap-2.5">
                {hydrated && order.map((k, pos) => {
                  const chosen = pick === k, right = chosen && ok, wrong = chosen && result === "wrong";
                  return (
                    <li key={k}>
                      <button data-testid="quiz-option" disabled={pending || ok} aria-pressed={chosen} onClick={() => choose(k)} className="flex w-full items-center gap-4 rounded-[10px] border-[1.5px] px-5 py-5 text-left text-[17px] font-medium text-heading transition enabled:hover:border-[var(--pf-201613)]" style={{ borderColor: right ? GREEN : wrong ? O : LINE, background: right ? "var(--pf-f1faf5)" : wrong ? "var(--pf-fdf2ed)" : "var(--pf-fff)" }}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-[6px] text-[13px] font-bold" style={right ? { background: GREEN, color: "var(--pf-fff)" } : wrong ? { background: O, color: "var(--pf-fff)" } : { background: "var(--pf-f5f0ed)", color: INK }}>{right ? <CheckIcon size={14} weight="bold" /> : wrong ? <XIcon size={14} weight="bold" /> : "ABCDEFGHIJ"[pos]}</span>
                        {l.quiz.options[k]}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {step === 2 && (
            <div data-testid="try-it" data-where={l.tryIt.where}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em]" style={{ color: O }}>3 · Prøv · kan vente</p>
              <h2 className="mt-3 text-[34px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.tryIt.where === "oevemiljoe" ? "Skriv det i øvemiljøet" : l.tryIt.where === "tool" ? `Prøv det i ${tool}` : "Prøv det selv"}</h2>
              <p className="mt-4 text-[17px] leading-[1.65] text-pf-text">{l.tryIt.text}</p>
              <div className="mt-7">
                {l.tryIt.where === "oevemiljoe" ? (
                  <div className="rounded-[10px] border-[1.5px] p-4" style={{ borderColor: INK }}>
                    <p className="min-h-[64px] text-[15px] leading-[1.55] text-heading">{l.tryIt.prefill ?? l.tryIt.text}</p>
                    <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: LINE }}>
                      <span className="text-[11.5px] text-pf-muted">Øvemiljø · {tool}</span>
                      {/* Opens the real øvemiljø in a new tab with the prompt in the composer (never sent automatically). */}
                      <a href={sandboxLink} target="_blank" rel="noopener noreferrer" onClick={() => finish("tried")} aria-label="Åbn i øvemiljøet (nyt vindue)" data-testid="open-sandbox" className="grid size-10 place-items-center rounded-[8px] text-pf-white" style={{ background: O }}><ArrowUpIcon size={16} weight="bold" /></a>
                    </div>
                  </div>
                ) : l.tryIt.where === "tool" ? (
                  <a href={toolUrl} target="_blank" rel="noopener noreferrer" data-testid="open-tool" className="inline-flex h-12 items-center gap-2 rounded-[8px] border-[1.5px] px-5 text-[14.5px] font-semibold text-heading hover:bg-[var(--pf-f7f2ee)]" style={{ borderColor: INK }}>Åbn {tool} <ArrowUpRightIcon size={15} weight="bold" /><span className="sr-only"> (nyt vindue)</span></a>
                ) : null}
              </div>
            </div>
          )}
          {step === 3 && (
            <>
              <span className="grid size-16 place-items-center rounded-full text-pf-white" style={{ background: doneOk ? GREEN : "var(--pf-d9ccc5)" }}>{doneOk ? <CheckIcon size={30} weight="bold" /> : <ClockIcon size={30} weight="bold" />}</span>
              <h2 className="mt-5 text-[44px] font-bold leading-[1.02] tracking-[-0.04em] text-heading">{doneOk ? "Lektionen er klaret" : "Du er igennem lektionen"}</h2>
              <ul className="mt-7 border-y" style={{ borderColor: LINE }}>
                {([["Læst", true, "Teksten"], ["Quiz", doneOk, ok ? "Rigtigt svar" : initiallyCompleted ? "Klaret tidligere" : "Ikke klaret endnu. Tag quizzen igen, så er lektionen klaret"], ["Prøv", tried === "tried", tried === "tried" ? "Prøvet" : "Sprunget over"]] as const).map(([t, good, sub]) => (
                  <li key={t} className="flex items-center gap-4 border-b py-3.5 last:border-0" style={{ borderColor: LINE }}>
                    <span className="grid size-6 place-items-center rounded-full text-pf-white" style={{ background: good ? GREEN : "var(--pf-d9ccc5)" }}>{good ? <CheckIcon size={12} weight="bold" /> : <ClockIcon size={12} weight="bold" />}</span>
                    <span className="w-16 text-[14px] font-semibold text-heading">{t}</span>
                    <span className="text-[13.5px] text-pf-muted">{sub}</span>
                  </li>
                ))}
              </ul>
              {next && <p className="mt-6 text-[13px] text-pf-muted">Næste: <b className="font-semibold text-heading">{next.title}</b> · {next.minutes} min</p>}
            </>
          )}
        </div>
      </div>

      <footer className="sticky bottom-0 border-t transition-colors duration-300" style={{ borderColor: LINE, background: barBg }}>
        <div className="mx-auto flex w-full max-w-[680px] flex-wrap items-center justify-between gap-3 px-6 py-5">
          {step === 2 ? (
            <button onClick={() => finish("later")} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-3 text-[14px] font-semibold text-heading hover:bg-[var(--pf-f5f0ed)]"><ClockIcon size={16} />Spring over, jeg prøver senere</button>
          ) : (
            <p role="status" aria-live="polite" data-testid="quiz-feedback" className={`flex items-center gap-2 text-[15px] font-semibold ${tone === "good" ? "text-[var(--pf-2f8a5c)]" : tone === "bad" ? "text-[var(--pf-c4502f)]" : "text-pf-muted"}`}>
              {tone === "good" && <span className="grid size-7 place-items-center rounded-full text-pf-white" style={{ background: GREEN }}><CheckIcon size={13} weight="bold" /></span>}
              {tone === "bad" && <span className="grid size-7 place-items-center rounded-full text-pf-white" style={{ background: O }}><XIcon size={13} weight="bold" /></span>}
              <span className={tone === "plain" ? "text-[13px] font-medium" : ""}>
                {step === 0
                  ? "Teksten skjules, når du starter quizzen"
                  : step === 1
                    ? result === null
                      ? pending ? "Tjekker svaret …" : initiallyCompleted ? "Du har klaret lektionen før. Vælg et svar" : "Vælg et svar"
                      : ok ? "Rigtigt!" : result === "wrong" ? "Ikke helt. Prøv et andet svar, eller fortsæt." : "Svaret kunne ikke gemmes. Prøv igen."
                    : ""}
              </span>
            </p>
          )}
          {step === 0 && <Btn on={() => setStep(1)}>Start quizzen</Btn>}
          {step === 1 && <Btn on={result === null && !initiallyCompleted ? undefined : () => setStep(2)} bg={tone === "good" ? GREEN : tone === "bad" ? O : INK}>Fortsæt</Btn>}
          {step === 2 && <Btn on={() => finish("tried")}>Jeg har prøvet det</Btn>}
          {step === 3 && <Link href={next?.href ?? finishHref} data-testid="lesson-next" className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-[8px] px-6 text-[15px] font-semibold text-pf-white transition hover:-translate-y-px" style={{ background: INK }}>{next ? "Næste lektion" : "Afslut modulet"} <ArrowRightIcon size={15} weight="bold" /></Link>}
        </div>
      </footer>
    </div>
  );
}

function Btn({ on, bg = INK, children }: { on?: () => void; bg?: string; children: React.ReactNode }) {
  return <button disabled={!on} onClick={on} className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-[8px] px-6 text-[15px] font-semibold text-pf-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[var(--pf-d9ccc5)]" style={on ? { background: bg } : undefined}>{children} <ArrowRightIcon size={15} weight="bold" /></button>;
}
