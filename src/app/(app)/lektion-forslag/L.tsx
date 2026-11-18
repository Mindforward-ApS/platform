"use client";
// Three versions of the lesson page (Marco 2026-11-03: "når jeg mener modul så tænker jeg på lektion"). No video.
// Real lesson content: "Vid det" points, "Prøv det" (in the øvemiljø or in the tool itself) and one quiz question.
// 1 Trin for trin: one focused card, three steps with a progress bar (Brilliant / Duolingo lesson flow).
// 2 Læs og øv: the text as a calm article on the left, øvemiljø + quiz side by side on the right (Codecademy split).
// 3 Kort: one point per big card with story-style segments at the top, then the try card and the quiz (Instagram stories / Duolingo).
import Link from "next/link";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, ArrowUpRightIcon, ClockIcon, BookOpenTextIcon, CheckIcon, CopyIcon, FlaskIcon, QuestionIcon, XIcon } from "@phosphor-icons/react";
import { lektioner, type Lektion } from "@/content/lektioner";

const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613";
const BROWN = "linear-gradient(140deg, #3a2722 0%, #201613 100%)";
const card = "relative min-w-0 rounded-[16px] bg-white";

type Data = (typeof lektioner)[string];

// Lesson picker: back to the course + the module's lessons as numbered chips (demo: 1.1–1.4 done).
function TopBar({ d, i, setI, track }: { d: Data; i: number; setI: (n: number) => void; track: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1 pt-1">
      <Link href="/kurser-forslag/b" aria-label="Tilbage" className="grid size-9 place-items-center rounded-[10px] bg-white text-heading hover:bg-[#f3eeeb]"><ArrowLeftIcon size={15} /></Link>
      <div className="min-w-0">
        <p className="text-[11.5px] text-muted">{d.tool} · Modul {d.module.nr} · {d.module.title}</p>
        <p className="truncate text-[15px] font-semibold text-heading">Lektion {d.lessons[i].nr} af {d.lessons.length}</p>
      </div>
      <div className="ml-auto flex flex-wrap gap-1">
        {d.lessons.map((l, k) => (
          <button key={l.nr} onClick={() => setI(k)} aria-current={k === i ? "step" : undefined} title={l.title} className={`grid size-8 place-items-center rounded-full text-[11px] font-semibold transition ${k === i ? "text-white" : k < 4 ? "text-white" : "bg-white text-muted hover:text-heading"}`} style={k === i ? { background: O } : k < 4 ? { background: GREEN } : undefined}>{k < 4 && k !== i ? <CheckIcon size={12} weight="bold" /> : l.nr.split(".")[1]}</button>
        ))}
      </div>
      <span className="hidden" data-track={track} />
    </div>
  );
}

function Quiz({ q, dark, onAnswer }: { q: Lektion["quiz"]; dark?: boolean; onAnswer?: (ok: boolean) => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const ok = pick === q.correctIndex;
  return (
    <div>
      <p className={`text-[17px] font-semibold leading-snug ${dark ? "text-white" : "text-heading"}`}>{q.question}</p>
      <ul className="mt-3 grid gap-2">
        {q.options.map((o, k) => {
          const chosen = pick === k, right = pick !== null && k === q.correctIndex;
          return (
            <li key={o}>
              <button disabled={pick !== null} onClick={() => { setPick(k); onAnswer?.(k === q.correctIndex); }} className={`flex w-full items-center gap-3 rounded-[12px] border px-4 py-3 text-left text-[13.5px] transition ${right ? "border-[#5cbf8f] bg-[#eef8f2] text-heading" : chosen ? "border-[#e2643f] bg-[#fdf0ea] text-heading" : dark ? "border-white/15 text-white hover:bg-white/[0.06]" : "border-[#ece4df] text-heading hover:bg-[#f7f2ee]"}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${right ? "text-white" : chosen ? "text-white" : dark ? "bg-white/10 text-white/80" : "bg-[#f3eeeb] text-heading"}`} style={right ? { background: GREEN } : chosen ? { background: O } : undefined}>{right ? <CheckIcon size={11} weight="bold" /> : chosen ? <XIcon size={11} weight="bold" /> : "ABC"[k]}</span>
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {pick !== null && (
        <p className={`mt-3 flex items-center justify-between rounded-[12px] px-4 py-3 text-[13px] font-semibold ${ok ? "bg-[#eef8f2] text-[#2f8a5c]" : "bg-[#fdf0ea] text-[#c4502f]"}`}>
          {ok ? "Rigtigt. Godt gået." : "Ikke helt. Det rigtige svar er markeret med grønt."}
          {!ok && <button onClick={() => setPick(null)} className="text-[12px] underline underline-offset-4">Prøv igen</button>}
        </p>
      )}
    </div>
  );
}

function TryBox({ l, dark, tried, onTried }: { l: Lektion; dark?: boolean; tried?: boolean; onTried?: () => void }) {
  const inPractice = l.tryIt.where === "oevemiljoe";
  return (
    <div>
      <p className={`text-[14px] leading-[1.6] ${dark ? "text-white/85" : "text-text"}`}>{l.tryIt.text}</p>
      {inPractice ? (
        <div className={`mt-3 rounded-[14px] p-3 ${dark ? "bg-white/[0.07]" : "bg-[#f7f2ee]"}`}>
          <p className={`min-h-[64px] text-[13px] leading-[1.55] ${dark ? "text-white" : "text-heading"}`}>{l.tryIt.prefill ?? l.tryIt.text}</p>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-[11px] ${dark ? "text-white/50" : "text-muted"}`}>Øvemiljø · svaret bliver ikke delt</span>
            <Link href="/oevemiljoe" onClick={onTried} aria-label="Send" className="grid size-9 place-items-center rounded-full text-white" style={{ background: O }}><ArrowUpIcon size={15} weight="bold" /></Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="#" className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white" style={{ background: O }}>Åbn værktøjet <ArrowRightIcon size={13} weight="bold" /></a>
          <button onClick={onTried} aria-pressed={tried} className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold transition ${tried ? "bg-[#5cbf8f] text-white" : dark ? "bg-white/10 text-white" : "bg-[#f3eeeb] text-heading"}`}><CheckIcon size={13} weight="bold" /> {tried ? "Prøvet" : "Jeg har prøvet det"}</button>
        </div>
      )}
    </div>
  );
}

// ——— 1 · Trin for trin ———
export function L1({ track }: { track: string }) {
  const d = lektioner[track];
  const [i, setI] = useState(4);
  const [step, setStep] = useState(0);
  const l = d.lessons[i];
  const steps = [{ t: "Vid det", icon: BookOpenTextIcon }, { t: "Prøv det", icon: FlaskIcon }, { t: "Quiz", icon: QuestionIcon }];
  const go = (k: number) => { setI(k); setStep(0); };
  return (
    <div className="flex flex-col gap-3">
      <TopBar d={d} i={i} setI={go} track={track} />
      <section className={`${card} mx-auto w-full max-w-[760px] px-6 pb-6 pt-5 sm:px-10 sm:pb-8 sm:pt-7`}>
        <div className="grid grid-cols-3 gap-2">
          {steps.map((s, k) => (
            <button key={s.t} onClick={() => setStep(k)} className="text-left">
              <span className="block h-1.5 overflow-hidden rounded-full bg-[#f3eeeb]"><span className="block h-full rounded-full transition-all duration-300" style={{ width: k <= step ? "100%" : "0%", background: k < step ? GREEN : O }} /></span>
              <span className={`mt-2 flex items-center gap-1.5 text-[12px] font-semibold ${k === step ? "text-heading" : "text-muted"}`}><s.icon size={14} />{s.t}</span>
            </button>
          ))}
        </div>
        <h1 className="mt-7 text-[30px] font-bold leading-[1.1] tracking-[-0.03em] text-heading">{l.title}</h1>
        <p className="mt-1 text-[12.5px] text-muted">{l.minutes} min · {steps[step].t}</p>

        <div className="mt-6 min-h-[300px]">
          {step === 0 && (
            <ol className="grid gap-3">
              {l.know.map((k, n) => (
                <li key={n} className="flex gap-4 rounded-[14px] bg-[#f7f2ee] p-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[12px] font-bold text-heading">{n + 1}</span>
                  <p className="text-[14.5px] leading-[1.6] text-heading">{k}</p>
                </li>
              ))}
            </ol>
          )}
          {step === 1 && <TryBox l={l} />}
          {step === 2 && <Quiz key={l.nr} q={l.quiz} />}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#f1e9e4] pt-5">
          <button onClick={() => (step ? setStep(step - 1) : i && go(i - 1))} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold text-heading hover:bg-[#f7f2ee]"><ArrowLeftIcon size={14} /> Tilbage</button>
          <button onClick={() => (step < 2 ? setStep(step + 1) : i < d.lessons.length - 1 && go(i + 1))} className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-[14px] font-semibold text-white transition hover:-translate-y-px" style={{ background: INK }}>{step < 2 ? `Videre til ${steps[step + 1].t.toLowerCase()}` : "Næste lektion"} <ArrowRightIcon size={14} weight="bold" /></button>
        </div>
      </section>
    </div>
  );
}

// ——— 2 · Læs og øv ———
export function L2({ track, nav = "a" }: { track: string; nav?: "a" | "b" | "c" }) {
  const d = lektioner[track];
  const [i, setI] = useState(4);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [tried, setTried] = useState<Record<number, boolean>>({});
  const l = d.lessons[i];
  const nxt = d.lessons[i + 1];
  const last = !nxt;
  const go = (k: number) => { setI(k); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const done = { read: true, tried: !!tried[i], quiz: answered[i] !== undefined };
  const ready = done.quiz;
  const nextLabel = last ? "Afslut modulet" : "Næste lektion";
  const goNext = () => (last ? undefined : go(i + 1));

  return (
    <div className="flex flex-col gap-3">
      <TopBar d={d} i={i} setI={go} track={track} />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        <article className={`${card} px-6 py-8 sm:px-12 sm:py-10`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: O }}>Vid det · {l.minutes} min</p>
          <h1 className="mt-2 max-w-[20ch] text-[38px] font-bold leading-[1.05] tracking-[-0.035em] text-heading">{l.title}</h1>
          <div className="mt-7 max-w-[62ch] space-y-5">
            {l.know.map((k, n) => <p key={n} className={`leading-[1.7] text-heading ${n === 0 ? "text-[18px]" : "text-[15.5px] text-text"}`}>{k}</p>)}
          </div>

          {/* A · Stort næste-kort i bunden af teksten */}
          {nav === "a" && (
            <div className="mt-10 grid gap-3 border-t border-[#f1e9e4] pt-6 sm:grid-cols-[auto_minmax(0,1fr)]">
              <button disabled={!i} onClick={() => go(i - 1)} className="inline-flex h-full min-h-14 items-center justify-center gap-2 rounded-[16px] bg-[#f7f2ee] px-5 text-[13px] font-semibold text-heading hover:bg-[#f1e9e4] disabled:opacity-30"><ArrowLeftIcon size={15} />Forrige</button>
              <button onClick={goNext} className="group flex items-center gap-4 rounded-[16px] p-4 pl-5 text-left text-white transition hover:-translate-y-0.5" style={{ background: BROWN }}>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11.5px] text-white/60">{last ? `Du er færdig med modul ${d.module.nr}` : `${nextLabel} · ${nxt.nr} · ${nxt.minutes} min`}</span>
                  <span className="mt-0.5 block truncate text-[18px] font-semibold">{last ? "Afslut modulet" : nxt.title}</span>
                </span>
                <span className="grid size-12 shrink-0 place-items-center rounded-full text-white transition group-hover:translate-x-0.5" style={{ background: O }}><ArrowRightIcon size={18} weight="bold" /></span>
              </button>
            </div>
          )}
          {nav !== "a" && (
            <div className="mt-10 border-t border-[#f1e9e4] pt-6">
              <button disabled={!i} onClick={() => go(i - 1)} className="text-[13px] font-medium text-muted hover:text-heading disabled:opacity-30">← {d.lessons[i - 1]?.title ?? "Forrige"}</button>
            </div>
          )}
        </article>

        <aside className="flex flex-col gap-3 xl:sticky xl:top-3 xl:self-start">
          <section className="rounded-[16px] p-5 text-white" style={{ background: BROWN }}>
            <p className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-[8px]" style={{ background: O }}><FlaskIcon size={15} /></span>Prøv det</p>
            <div className="mt-3"><TryBox l={l} dark tried={done.tried} onTried={() => setTried({ ...tried, [i]: true })} /></div>
          </section>
          <section className={`${card} p-5`}>
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-heading"><span className="grid size-7 place-items-center rounded-[8px] bg-[#f7f2ee]"><QuestionIcon size={15} /></span>Quiz</p>
            <Quiz key={l.nr} q={l.quiz} onAnswer={(ok) => setAnswered({ ...answered, [i]: ok })} />
          </section>

          {/* C · Næste lektion folder sig ud under quizzen, når du har svaret */}
          {nav === "c" && (
            ready ? (
              <section className="rounded-[16px] p-5 text-white" style={{ background: `linear-gradient(150deg, ${O} 0%, #b8462a 100%)` }}>
                <p className="flex items-center gap-2 text-[13px] font-semibold"><span className="grid size-7 place-items-center rounded-full bg-white/20"><CheckIcon size={14} weight="bold" /></span>Lektion {l.nr} er klaret</p>
                <p className="mt-3 text-[11.5px] text-white/75">{last ? "Det var sidste lektion i modulet" : `Næste · ${nxt.nr} · ${nxt.minutes} min`}</p>
                <p className="mt-0.5 text-[19px] font-semibold leading-tight">{last ? "Afslut modulet" : nxt.title}</p>
                <button onClick={goNext} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-semibold text-[#201613] transition hover:-translate-y-px">{nextLabel} <ArrowRightIcon size={15} weight="bold" /></button>
              </section>
            ) : (
              <section className="rounded-[16px] border border-dashed border-[#e3d8d2] p-5">
                <p className="text-[11.5px] text-muted">{last ? "Sidste lektion i modulet" : `Næste · ${nxt.nr} · ${nxt.title}`}</p>
                <p className="mt-1 text-[13px] font-medium text-heading">Svar på quizzen, så er du klar til at gå videre.</p>
                {!last && <button onClick={goNext} className="mt-2 text-[12px] font-medium text-muted underline underline-offset-4 hover:text-heading">Spring over</button>}
              </section>
            )
          )}
        </aside>
      </div>

      {/* B · Fast bjælke i bunden med de tre dele og Næste-knappen */}
      {nav === "b" && (
        <div className="sticky bottom-[64px] z-40 mt-1 flex flex-wrap items-center gap-4 rounded-[16px] bg-white px-4 py-3 shadow-[0_16px_40px_-12px_rgba(32,22,19,.35)] ring-1 ring-[#f1e9e4]">
          <button disabled={!i} onClick={() => go(i - 1)} aria-label="Forrige lektion" className="grid size-10 place-items-center rounded-full bg-[#f3eeeb] text-heading disabled:opacity-30"><ArrowLeftIcon size={15} /></button>
          <ul className="flex flex-wrap items-center gap-4 text-[12.5px]">
            {([["Læst", done.read], ["Prøvet", done.tried], ["Quiz", done.quiz]] as const).map(([t, ok]) => (
              <li key={t} className={`flex items-center gap-1.5 font-medium ${ok ? "text-heading" : "text-muted"}`}><span className={`grid size-5 place-items-center rounded-full ${ok ? "text-white" : "border border-[#e3d8d2]"}`} style={ok ? { background: GREEN } : undefined}>{ok && <CheckIcon size={10} weight="bold" />}</span>{t}</li>
            ))}
          </ul>
          <span className="ml-auto hidden text-[12px] text-muted md:block">{ready ? (last ? "Sidste lektion i modulet" : `Næste: ${nxt.title}`) : "Svar på quizzen for at gå videre"}</span>
          <button onClick={goNext} disabled={!ready} className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold text-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[#d9ccc5]" style={ready ? { background: O } : undefined}>{nextLabel} <ArrowRightIcon size={15} weight="bold" /></button>
        </div>
      )}
    </div>
  );
}

// ——— 3 · Kort ———
export function L3({ track }: { track: string }) {
  const d = lektioner[track];
  const [i, setI] = useState(4);
  const [c, setC] = useState(0);
  const l = d.lessons[i];
  const total = l.know.length + 2;
  const go = (k: number) => { setI(k); setC(0); };
  const isKnow = c < l.know.length, isTry = c === l.know.length;
  return (
    <div className="flex flex-col gap-3">
      <TopBar d={d} i={i} setI={go} track={track} />
      <section className="mx-auto w-full max-w-[680px]">
        <div className="flex gap-1.5">{Array.from({ length: total }, (_, k) => <button key={k} aria-label={`Kort ${k + 1}`} onClick={() => setC(k)} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9dfd9]"><span className="block h-full rounded-full transition-all duration-300" style={{ width: k <= c ? "100%" : "0%", background: k < c ? INK : O }} /></button>)}</div>
        <div className={`mt-3 flex min-h-[460px] flex-col rounded-[24px] p-8 sm:p-11 ${isKnow ? "bg-white" : "text-white"}`} style={isKnow ? undefined : { background: isTry ? BROWN : `linear-gradient(150deg, ${O} 0%, #b8462a 100%)` }}>
          <p className={`flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] ${isKnow ? "text-muted" : "text-white/70"}`}>
            {isKnow ? <><BookOpenTextIcon size={14} />{l.title} · {c + 1}/{l.know.length}</> : isTry ? <><FlaskIcon size={14} />Prøv det</> : <><QuestionIcon size={14} />Quiz</>}
          </p>
          <div className="my-auto py-8">
            {isKnow ? <p className="text-[26px] font-semibold leading-[1.3] tracking-[-0.02em] text-heading sm:text-[30px]">{l.know[c]}</p> : isTry ? <TryBox l={l} dark /> : <Quiz key={l.nr} q={l.quiz} dark />}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => (c ? setC(c - 1) : i && go(i - 1))} aria-label="Forrige kort" className={`grid size-12 place-items-center rounded-full ${isKnow ? "bg-[#f3eeeb] text-heading" : "bg-white/15 text-white"}`}><ArrowLeftIcon size={17} weight="bold" /></button>
            {isTry && <button onClick={() => navigator.clipboard?.writeText(l.tryIt.prefill ?? l.tryIt.text)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-white/70 hover:text-white"><CopyIcon size={14} />Kopiér teksten</button>}
            <button onClick={() => (c < total - 1 ? setC(c + 1) : i < d.lessons.length - 1 && go(i + 1))} className={`inline-flex h-12 items-center gap-2 rounded-full px-6 text-[14px] font-semibold ${isKnow ? "text-white" : "bg-white text-[#201613]"}`} style={isKnow ? { background: INK } : undefined}>{c < total - 1 ? "Næste" : "Næste lektion"} <ArrowRightIcon size={15} weight="bold" /></button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ——— 4 · Trin (Marco 2026-11-03): Læs → Quiz (teksten er skjult) → Prøv (kan springes over og gemmes til senere). Skarpere look.
const LINE = "#ece4df";
export function L4({ track }: { track: string }) {
  const d = lektioner[track];
  const [i, setI] = useState(4);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [pick, setPick] = useState<number | null>(null);
  const [tryState, setTryState] = useState<"tried" | "later" | null>(null);
  const l = d.lessons[i];
  const nxt = d.lessons[i + 1];
  const ok = pick === l.quiz.correctIndex;
  const go = (k: number) => { setI(k); setStep(0); setPick(null); setTryState(null); window.scrollTo({ top: 0 }); };
  const steps = ["Læs", "Quiz", "Prøv"];

  return (
    <div className="flex flex-col gap-3">
      <TopBar d={d} i={i} setI={go} track={track} />
      <section className="overflow-hidden rounded-[12px] border bg-white" style={{ borderColor: LINE }}>
        {/* Trin-bjælke */}
        <ol className="grid grid-cols-3 border-b" style={{ borderColor: LINE }}>
          {steps.map((t, k) => {
            const done = step > k, cur = step === k;
            return (
              <li key={t} className={`relative flex items-center gap-3 px-5 py-4 sm:px-7 ${k ? "border-l" : ""}`} style={{ borderColor: LINE }}>
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold ${done ? "text-white" : cur ? "text-white" : "border text-muted"}`} style={done ? { background: INK } : cur ? { background: O } : { borderColor: LINE }}>{done ? <CheckIcon size={12} weight="bold" /> : k + 1}</span>
                <span className={`text-[14px] font-semibold ${cur || done ? "text-heading" : "text-muted"}`}>{t}</span>
                {k === 2 && <span className="hidden text-[11.5px] text-muted md:inline">· kan vente</span>}
                <span className="absolute inset-x-0 bottom-[-1px] h-[2px] transition-all" style={{ background: cur ? O : done ? INK : "transparent" }} />
              </li>
            );
          })}
        </ol>

        <div className="mx-auto w-full max-w-[720px] px-6 py-10 sm:py-14">
          {step === 0 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Lektion {l.nr} · {l.minutes} min</p>
              <h1 className="mt-3 text-[40px] font-bold leading-[1.02] tracking-[-0.04em] text-heading sm:text-[48px]">{l.title}</h1>
              <div className="mt-9 space-y-6 border-l-2 pl-6" style={{ borderColor: INK }}>
                {l.know.map((k, n) => <p key={n} className={`leading-[1.65] ${n === 0 ? "text-[19px] font-medium text-heading" : "text-[16px] text-text"}`}>{k}</p>)}
              </div>
              <div className="mt-12 flex items-center justify-between border-t pt-6" style={{ borderColor: LINE }}>
                <p className="text-[12.5px] text-muted">Teksten skjules, når du starter quizzen.</p>
                <button onClick={() => setStep(1)} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-6 text-[14.5px] font-semibold text-white transition hover:-translate-y-px" style={{ background: INK }}>Start quizzen <ArrowRightIcon size={15} weight="bold" /></button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Quiz · uden at kigge</p>
              <h2 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.quiz.question}</h2>
              <ul className="mt-8 grid gap-2.5">
                {l.quiz.options.map((o, k) => {
                  const chosen = pick === k, right = pick !== null && k === l.quiz.correctIndex;
                  return (
                    <li key={o}>
                      <button disabled={pick !== null} onClick={() => setPick(k)} className="flex w-full items-center gap-4 rounded-[10px] border-[1.5px] px-5 py-4 text-left text-[15.5px] font-medium text-heading transition enabled:hover:border-[#201613]" style={{ borderColor: right ? GREEN : chosen ? O : LINE, background: right ? "#f1faf5" : chosen ? "#fdf2ed" : "#fff" }}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-[6px] text-[13px] font-bold" style={right ? { background: GREEN, color: "#fff" } : chosen ? { background: O, color: "#fff" } : { background: "#f5f0ed", color: INK }}>{right ? <CheckIcon size={14} weight="bold" /> : chosen ? <XIcon size={14} weight="bold" /> : "ABC"[k]}</span>
                        {o}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-10 flex min-h-12 flex-wrap items-center justify-between gap-3 border-t pt-6" style={{ borderColor: LINE }}>
                {pick === null ? (
                  <button onClick={() => setStep(0)} className="text-[13px] font-medium text-muted underline underline-offset-4 hover:text-heading">Læs teksten igen</button>
                ) : ok ? (
                  <p className="flex items-center gap-2 text-[14px] font-semibold text-[#2f8a5c]"><span className="grid size-6 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={12} weight="bold" /></span>Rigtigt</p>
                ) : (
                  <p className="flex flex-wrap items-center gap-3 text-[14px] font-semibold text-[#c4502f]">Ikke helt. Det rigtige svar er grønt.<button onClick={() => { setPick(null); setStep(0); }} className="text-[13px] font-medium text-heading underline underline-offset-4">Læs igen og prøv igen</button></p>
                )}
                <button disabled={pick === null} onClick={() => setStep(2)} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-6 text-[14.5px] font-semibold text-white transition enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:bg-[#d9ccc5]" style={pick !== null ? { background: INK } : undefined}>Videre til Prøv <ArrowRightIcon size={15} weight="bold" /></button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-muted">Prøv det selv · valgfrit</p>
              <h2 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-[-0.035em] text-heading">{l.tryIt.where === "oevemiljoe" ? "Skriv det i øvemiljøet" : `Prøv det i ${d.tool}`}</h2>
              <p className="mt-4 text-[16px] leading-[1.65] text-text">{l.tryIt.text}</p>
              {l.tryIt.where === "oevemiljoe" ? (
                <div className="mt-6 rounded-[10px] border-[1.5px] p-4" style={{ borderColor: INK }}>
                  <p className="min-h-[72px] text-[15px] leading-[1.55] text-heading">{l.tryIt.prefill ?? l.tryIt.text}</p>
                  <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: LINE }}>
                    <span className="text-[11.5px] text-muted">Øvemiljø · {d.tool}</span>
                    <button onClick={() => { setTryState("tried"); setStep(3); }} aria-label="Send" className="grid size-10 place-items-center rounded-[8px] text-white" style={{ background: O }}><ArrowUpIcon size={16} weight="bold" /></button>
                  </div>
                </div>
              ) : (
                <a href="#" className="mt-6 inline-flex h-12 items-center gap-2 rounded-[8px] border-[1.5px] px-5 text-[14.5px] font-semibold text-heading hover:bg-[#f7f2ee]" style={{ borderColor: INK }}>Åbn {d.tool} <ArrowUpRightIcon size={15} weight="bold" /></a>
              )}
              <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-6" style={{ borderColor: LINE }}>
                <button onClick={() => { setTryState("later"); setStep(3); }} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-4 text-[14px] font-semibold text-heading hover:bg-[#f7f2ee]"><ClockIcon size={16} />Spring over, jeg prøver senere</button>
                <button onClick={() => { setTryState("tried"); setStep(3); }} className="inline-flex h-12 items-center gap-2 rounded-[8px] px-6 text-[14.5px] font-semibold text-white transition hover:-translate-y-px" style={{ background: INK }}><CheckIcon size={15} weight="bold" />Jeg har prøvet det</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <span className="grid size-14 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={26} weight="bold" /></span>
              <h2 className="mt-5 text-[40px] font-bold leading-[1.02] tracking-[-0.04em] text-heading">Lektion {l.nr} er klaret</h2>
              <ul className="mt-6 grid gap-0 border-y" style={{ borderColor: LINE }}>
                {[["Læst", true, "Teksten"], ["Quiz", ok, ok ? "Rigtigt svar" : "Forkert svar, se det igen senere"], ["Prøv", tryState === "tried", tryState === "tried" ? "Prøvet" : "Gemt til senere under Øvemiljø"]].map(([t, good, sub]) => (
                  <li key={String(t)} className="flex items-center gap-4 border-b py-3.5 last:border-0" style={{ borderColor: LINE }}>
                    <span className="grid size-6 place-items-center rounded-full text-white" style={{ background: good ? GREEN : "#d9ccc5" }}>{good ? <CheckIcon size={12} weight="bold" /> : <ClockIcon size={12} weight="bold" />}</span>
                    <span className="w-16 text-[14px] font-semibold text-heading">{String(t)}</span>
                    <span className="text-[13.5px] text-muted">{String(sub)}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => nxt && go(i + 1)} className="group mt-8 flex w-full items-center gap-4 rounded-[10px] p-5 text-left text-white transition hover:-translate-y-0.5" style={{ background: INK }}>
                <span className="min-w-0 flex-1"><span className="block text-[12px] text-white/55">{nxt ? `Næste lektion · ${nxt.nr} · ${nxt.minutes} min` : `Sidste lektion i modul ${d.module.nr}`}</span><span className="mt-0.5 block truncate text-[20px] font-semibold">{nxt ? nxt.title : "Afslut modulet"}</span></span>
                <span className="grid size-12 shrink-0 place-items-center rounded-[8px] text-white transition group-hover:translate-x-0.5" style={{ background: O }}><ArrowRightIcon size={18} weight="bold" /></span>
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function Switch({ v, track }: { v: string; track: string }) {
  const names: Record<string, string> = ["4", "5", "6", "7"].includes(v) ? { "4": "4 · Skarp", "5": "5 · Fokus", "6": "6 · Delt", "7": "7 · Én side" } : v.startsWith("2") ? { "2a": "A · Stort næste-kort", "2b": "B · Fast bjælke", "2c": "C · Efter quizzen" } : { "1": "1 · Trin for trin", "2": "2 · Læs og øv", "3": "3 · Kort" };
  return (
    <nav aria-label="Skift version" className={`fixed ${v === "5" ? "top-[76px]" : "bottom-4"} left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]`}>
      {Object.entries(names).map(([k, n]) => (
        <Link key={k} href={`/lektion-forslag/${k}/${track}`} aria-current={k === v ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k.toUpperCase()}</span><span className="hidden sm:inline">{n}</span></Link>
      ))}
      <span className="mx-1 h-4 w-px bg-white/20" />
      {Object.entries(lektioner).map(([id, x]) => <Link key={id} href={`/lektion-forslag/${v}/${id}`} className={`whitespace-nowrap rounded-full px-2.5 py-1.5 font-medium ${id === track ? "bg-[#e2643f] text-white" : "text-white/75 hover:text-white"}`}>{x.tool}</Link>)}
    </nav>
  );
}
