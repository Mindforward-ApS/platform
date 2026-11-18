"use client";
// Three new module-page proposals (Marco 2026-11-03: the first three were "en ommer"; modules have NO video).
// Built on the real forløb: tool → 4 levels (each ends in a certificate test) → modules → 5-minute lessons with
// "Vid det", "Prøv i øvemiljøet" and a quiz. Progress is demo data.
// 1 Niveauer: level stepper + module columns with lesson dots (Sprigly reference, Khan Academy mastery grid).
// 2 Pensum: sticky table of contents + a readable syllabus (Codecademy syllabus pattern).
// 3 Modulet åbent: module rail + the chosen module opened with its real lesson content (Brilliant course map).
import Link from "next/link";
import { useState } from "react";
import { ArrowRightIcon, BookOpenTextIcon, CheckIcon, ClockIcon, FlaskIcon, LockSimpleIcon, QuestionIcon, SealCheckIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { tracks, type FLesson, type FModule, type FTrack } from "@/content/forloeb";

export const O = "#e2643f", GREEN = "#5cbf8f", INK = "#201613";
const card = "relative min-w-0 rounded-[16px] bg-white";
const BROWN = "linear-gradient(140deg, #3a2722 0%, #201613 100%)";

// Demo progress: the first four lessons of module 1 are done, 1.5 is next.
const DONE = 4;
type State = "done" | "next" | "open" | "soon";
function lessonState(m: FModule, i: number): State {
  if (!m.ready) return "soon";
  if (m.nr !== 1) return "open";
  return i < DONE ? "done" : i === DONE ? "next" : "open";
}
const quizScore = (i: number) => [100, 80, 100, 90][i] ?? null;

function ToolTabs({ v, t }: { v: string; t: FTrack }) {
  return (
    <div className="flex gap-1 rounded-[12px] bg-[#f3eeeb] p-1">
      {tracks.map((x) => (
        <Link key={x.id} href={`/modul-forslag/${v}/${x.id}`} aria-current={x.id === t.id ? "page" : undefined} className={`h-8 rounded-[9px] px-3.5 text-[12.5px] font-semibold leading-8 transition ${x.id === t.id ? "bg-white text-heading shadow-[0_1px_3px_rgba(32,22,19,.12)]" : "text-muted hover:text-heading"}`}>{x.tool}</Link>
      ))}
    </div>
  );
}

function Parts({ l, dark }: { l: FLesson; dark?: boolean }) {
  const c = dark ? "text-white/60" : "text-muted";
  return (
    <span className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] ${c}`}>
      <span className="inline-flex items-center gap-1"><BookOpenTextIcon size={12} />Vid det</span>
      <span className="inline-flex items-center gap-1"><FlaskIcon size={12} />Prøv i øvemiljøet</span>
      <span className="inline-flex items-center gap-1"><QuestionIcon size={12} />Quiz</span>
    </span>
  );
}

function Dot({ s, n }: { s: State; n?: string }) {
  if (s === "done") return <span className="grid size-6 shrink-0 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={11} weight="bold" /></span>;
  if (s === "next") return <span className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white shadow-[0_0_0_4px_rgba(226,100,63,.18)]" style={{ background: O }}>{n?.split(".")[1]}</span>;
  if (s === "soon") return <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#f3eeeb] text-[#b9aaa3]"><LockSimpleIcon size={10} /></span>;
  return <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#e3d8d2] text-[10px] font-semibold text-muted">{n?.split(".")[1]}</span>;
}

function Header({ v, t, children }: { v: string; t: FTrack; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
      <div>
        <p className="text-[12px] text-muted"><Link href="/kurser-forslag/b" className="hover:underline">Mine kurser</Link> › {t.tool}</p>
        <h1 className="mt-1 text-[30px] font-bold leading-[1.05] tracking-[-0.03em] text-heading">{t.headline}</h1>
      </div>
      <div className="flex items-center gap-3">{children}<ToolTabs v={v} t={t} /></div>
    </div>
  );
}

const lessonsIn = (t: FTrack) => t.levels.flatMap((L) => L.modules.flatMap((m) => m.lessons));

// ——— 1 · Niveauer ———
export function V1({ t }: { t: FTrack }) {
  const [lv, setLv] = useState(1);
  const L = t.levels[lv - 1];
  return (
    <div className="flex flex-col gap-3">
      <Header v="1" t={t}><Demo /></Header>

      <section className="grid gap-2 sm:grid-cols-4">
        {t.levels.map((x) => {
          const active = x.nr === lv;
          const total = x.modules.reduce((n, m) => n + m.lessons.length, 0);
          const done = x.nr === 1 ? DONE : 0;
          return (
            <button key={x.nr} onClick={() => setLv(x.nr)} aria-pressed={active} className={`group relative flex flex-col rounded-[16px] p-4 text-left transition ${active ? "text-white" : "bg-white hover:-translate-y-0.5"}`} style={active ? { background: BROWN } : undefined}>
              <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${active ? "text-white/55" : "text-muted"}`}>Niveau {x.nr}</span>
              <span className={`mt-1 text-[22px] font-bold leading-none tracking-[-0.02em] ${active ? "text-white" : "text-heading"}`}>{x.name}</span>
              <span className={`mt-1 text-[12px] ${active ? "text-white/70" : "text-muted"}`}>{x.title}</span>
              <span className="mt-4 flex items-center gap-2">
                <span className={`h-1.5 flex-1 overflow-hidden rounded-full ${active ? "bg-white/15" : "bg-[#f3eeeb]"}`}><span className="block h-full rounded-full" style={{ width: `${(done / total) * 100}%`, background: O }} /></span>
                <span className={`text-[11px] font-semibold tabular-nums ${active ? "text-white" : "text-heading"}`}>{done}/{total}</span>
              </span>
              <SealCheckIcon size={22} weight="fill" className={`absolute right-4 top-4 ${active ? "text-[#f6b49b]" : "text-[#e9dfd9]"}`} />
            </button>
          );
        })}
      </section>

      <section className={`${card} p-[18px]`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-[15.5px] font-semibold text-heading">{L.name}: {L.title}</h2><p className="mt-0.5 max-w-[70ch] text-[12.5px] text-muted">{L.outcome}</p></div>
        </div>
        <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(230px, 1fr))` }}>
          {L.modules.map((m) => {
            const done = m.lessons.filter((_, i) => lessonState(m, i) === "done").length;
            const isNow = m.ready && m.nr === 1;
            return (
              <article key={m.nr} className={`flex flex-col rounded-[14px] p-4 ${isNow ? "bg-[#fdf3ee] ring-1 ring-[#f3c8b6]" : m.ready ? "bg-[#f7f2ee]" : "bg-[#fbf9f7]"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Modul {m.nr}</span>
                  {!m.ready ? <span className="rounded-full bg-white px-2 py-0.5 text-[10.5px] font-medium text-muted">Kommer snart</span> : isNow ? <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-white" style={{ background: O }}>I gang</span> : null}
                </div>
                <h3 className={`mt-1.5 text-[16px] font-semibold leading-tight ${m.ready ? "text-heading" : "text-[#8a7a73]"}`}>{m.title}</h3>
                <p className="mt-1 line-clamp-2 text-[12px] leading-[1.45] text-muted">{m.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.lessons.map((l, i) => <span key={l.nr} title={l.title}><Dot s={lessonState(m, i)} n={l.nr} /></span>)}
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 text-[11.5px]">
                  <span className="text-muted">{m.ready ? `${done}/${m.lessons.length} lektioner` : `${m.lessons.length} lektioner`} · {m.lessons.length * 5} min</span>
                  {isNow && <Link href="/kurser/ai-paa-arbejdet/6" className="inline-flex h-8 items-center gap-1 rounded-full px-3 text-[11.5px] font-semibold text-white" style={{ background: INK }}>Fortsæt <ArrowRightIcon size={12} weight="bold" /></Link>}
                </div>
              </article>
            );
          })}
          <article className="flex flex-col justify-between rounded-[14px] p-4 text-white" style={{ background: BROWN }}>
            <div>
              <SealCheckIcon size={26} weight="fill" className="text-[#f6b49b]" />
              <h3 className="mt-3 text-[16px] font-semibold !text-white">{L.test.title}</h3>
              <p className="mt-1 text-[12px] leading-[1.45] text-white/65">Bestå med mindst {L.test.pass} %, når modulerne er færdige.</p>
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-[11.5px] text-white/60"><ClockIcon size={13} />{L.test.minutes} min · låst indtil videre</p>
          </article>
        </div>
      </section>
    </div>
  );
}

// ——— 2 · Pensum ———
export function V2({ t }: { t: FTrack }) {
  const all = lessonsIn(t).length;
  return (
    <div className="flex flex-col gap-3">
      <Header v="2" t={t}><Demo /></Header>
      <div className="grid gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-3 xl:self-start">
          <nav className={`${card} p-4`} aria-label="Indhold">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Indhold</p>
            <p className="mt-1 text-[12px] text-muted">{t.levels.length} niveauer · {t.levels.reduce((n, L) => n + L.modules.length, 0)} moduler · {all} lektioner</p>
            <ol className="mt-3 grid gap-3">
              {t.levels.map((L) => (
                <li key={L.nr}>
                  <a href={`#niveau-${L.nr}`} className="flex items-center justify-between text-[13px] font-semibold text-heading hover:underline">{L.nr}. {L.name}<span className="text-[11px] font-normal text-muted">{L.modules.length} moduler</span></a>
                  <ol className="mt-1.5 grid gap-0.5 border-l border-[#efe6e1] pl-3">
                    {L.modules.map((m) => (
                      <li key={m.nr}><a href={`#modul-${m.nr}`} className={`flex items-center gap-2 rounded-[6px] py-0.5 text-[12px] hover:text-heading ${m.nr === 1 ? "font-semibold text-[#c4502f]" : m.ready ? "text-heading" : "text-muted"}`}>{m.nr === 1 && <span className="size-1.5 rounded-full" style={{ background: O }} />}{m.title}</a></li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          {t.levels.map((L) => (
            <section key={L.nr} id={`niveau-${L.nr}`} className={`${card} scroll-mt-4 px-6 py-6 xl:px-9`}>
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[#f1e9e4] pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: O }}>Niveau {L.nr} · {L.name}</p>
                  <h2 className="mt-1 text-[24px] font-bold tracking-[-0.02em] text-heading">{L.title}</h2>
                  <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.55] text-text">{L.outcome}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f2ee] px-3 py-1.5 text-[11.5px] font-medium text-heading"><SealCheckIcon size={14} weight="fill" style={{ color: O }} />{L.test.title} · {L.test.minutes} min</span>
              </div>
              {L.modules.map((m) => (
                <div key={m.nr} id={`modul-${m.nr}`} className="grid scroll-mt-4 gap-4 border-b border-[#f6f0ec] py-5 last:border-0 md:grid-cols-[200px_minmax(0,1fr)]">
                  <div>
                    <p className="text-[12px] tabular-nums text-muted">Modul {m.nr}</p>
                    <h3 className={`mt-0.5 text-[17px] font-semibold leading-tight ${m.ready ? "text-heading" : "text-[#8a7a73]"}`}>{m.title}</h3>
                    <p className="mt-1 text-[12px] leading-[1.45] text-muted">{m.description}</p>
                    {!m.ready && <span className="mt-2 inline-block rounded-full bg-[#f3eeeb] px-2 py-0.5 text-[10.5px] font-medium text-muted">Kommer snart</span>}
                  </div>
                  <ol className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
                    {m.lessons.map((l, i) => {
                      const s = lessonState(m, i);
                      return (
                        <li key={l.nr} className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 ${s === "next" ? "bg-[#fdf3ee]" : ""}`}>
                          <Dot s={s} n={l.nr} />
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[13.5px] ${s === "next" ? "font-semibold text-heading" : s === "soon" ? "text-[#8a7a73]" : "text-heading"}`}>{l.nr} {l.title}</span>
                            {m.ready && <Parts l={l} />}
                          </span>
                          {s === "done" && quizScore(i) !== null ? <span className="text-[11.5px] font-semibold tabular-nums text-heading">Quiz {quizScore(i)} %</span> : null}
                          {s === "next" ? <Link href="/kurser/ai-paa-arbejdet/6" className="inline-flex h-8 items-center gap-1 rounded-full px-3.5 text-[11.5px] font-semibold text-white" style={{ background: O }}>Start <ArrowRightIcon size={12} weight="bold" /></Link> : <span className="w-12 text-right text-[11.5px] text-muted">{l.minutes} min</span>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// ——— 3 · Modulet åbent ———
export function V3({ t }: { t: FTrack }) {
  const mods = t.levels.flatMap((L) => L.modules.map((m) => ({ m, L })));
  const [sel, setSel] = useState(1);
  const cur = mods.find((x) => x.m.nr === sel) ?? mods[0];
  const [lesson, setLesson] = useState(DONE);
  const m = cur.m;
  const l = m.lessons[Math.min(lesson, m.lessons.length - 1)];
  return (
    <div className="flex flex-col gap-3">
      <Header v="3" t={t}><Demo /></Header>
      <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${card} max-h-[calc(100svh-9rem)] overflow-y-auto p-3 xl:sticky xl:top-3 xl:self-start`}>
          {t.levels.map((L) => (
            <div key={L.nr} className="mb-2">
              <p className="px-2 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Niveau {L.nr} · {L.name}</p>
              {L.modules.map((x) => {
                const active = x.nr === sel;
                return (
                  <button key={x.nr} onClick={() => { setSel(x.nr); setLesson(x.nr === 1 ? DONE : 0); }} aria-pressed={active} className={`flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition ${active ? "bg-[#201613] text-white" : "hover:bg-[#f7f2ee]"}`}>
                    <span className={`grid size-7 shrink-0 place-items-center rounded-[8px] text-[11px] font-bold ${active ? "bg-white/15 text-white" : x.nr === 1 ? "text-white" : x.ready ? "bg-[#f3eeeb] text-heading" : "bg-[#f7f4f2] text-[#b9aaa3]"}`} style={!active && x.nr === 1 ? { background: O } : undefined}>{x.ready ? x.nr : <LockSimpleIcon size={11} />}</span>
                    <span className="min-w-0 flex-1"><span className={`block truncate text-[12.5px] font-medium ${active ? "text-white" : x.ready ? "text-heading" : "text-[#8a7a73]"}`}>{x.title}</span><span className={`text-[10.5px] ${active ? "text-white/55" : "text-muted"}`}>{x.ready ? (x.nr === 1 ? `${DONE}/${x.lessons.length} lektioner` : `${x.lessons.length} lektioner`) : "Kommer snart"}</span></span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <section className="rounded-[16px] p-7 text-white" style={{ background: BROWN }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">Niveau {cur.L.nr} · {cur.L.name} · Modul {m.nr}</p>
            <h2 className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.03em] !text-white">{m.title}</h2>
            <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.55] text-white/75">{m.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {m.lessons.map((x, i) => {
                const s = lessonState(m, i);
                const on = i === lesson;
                return (
                  <button key={x.nr} onClick={() => setLesson(i)} aria-pressed={on} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[11.5px] transition ${on ? "bg-white text-[#201613]" : "bg-white/[0.08] text-white/80 hover:bg-white/[0.14]"}`}>
                    <Dot s={s} n={x.nr} />{x.nr}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] text-muted">Lektion {l.nr} · {l.minutes} min</p>
                <h3 className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] text-heading">{l.title}</h3>
              </div>
              {m.ready ? <Link href="/kurser/ai-paa-arbejdet/6" className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white" style={{ background: O }}>{lessonState(m, lesson) === "done" ? "Tag den igen" : "Start lektionen"} <ArrowRightIcon size={13} weight="bold" /></Link> : <span className="rounded-full bg-[#f3eeeb] px-3 py-1.5 text-[12px] font-medium text-muted">Kommer snart</span>}
            </div>
            <ol className="mt-5 grid gap-3 md:grid-cols-3">
              <li className="flex flex-col rounded-[14px] bg-[#f7f2ee] p-4">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-heading"><span className="grid size-7 place-items-center rounded-[8px] bg-white"><BookOpenTextIcon size={15} /></span>1 · Vid det</p>
                <p className="mt-3 text-[12.5px] leading-[1.55] text-text">{l.know ?? "Kort forklaring i almindeligt dansk. Indholdet kommer, når modulet er klar."}</p>
              </li>
              <li className="flex flex-col rounded-[14px] p-4 text-white" style={{ background: BROWN }}>
                <p className="flex items-center gap-2 text-[12px] font-semibold"><span className="grid size-7 place-items-center rounded-[8px]" style={{ background: O }}><FlaskIcon size={15} /></span>2 · Prøv i øvemiljøet</p>
                <p className="mt-3 text-[12.5px] leading-[1.55] text-white/85">{l.tryIt ?? "En lille opgave, du løser med AI i øvemiljøet."}</p>
              </li>
              <li className="flex flex-col rounded-[14px] border border-[#f1e6df] p-4">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-heading"><span className="grid size-7 place-items-center rounded-[8px] bg-[#f7f2ee]"><QuestionIcon size={15} /></span>3 · Quiz</p>
                <p className="mt-3 text-[12.5px] leading-[1.55] text-text">{l.quiz ?? "Ét spørgsmål, der tjekker, at du har fanget pointen."}</p>
                {lessonState(m, lesson) === "done" && quizScore(lesson) !== null && <p className="mt-auto pt-3 text-[12px] font-semibold" style={{ color: "#2f8a5c" }}>Du svarede rigtigt · {quizScore(lesson)} %</p>}
              </li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

export function Switch({ v, track }: { v: string; track: string }) {
  const names: Record<string, string> = { "1": "1 · Niveauer", "2": "2 · Pensum", "3": "3 · Modulet åbent" };
  return (
    <nav aria-label="Skift version" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-[#201613] p-1 text-[12px] text-white shadow-[0_12px_32px_rgba(32,22,19,.35)]">
      {Object.entries(names).map(([k, n]) => (
        <Link key={k} href={`/modul-forslag/${k}/${track}`} aria-current={k === v ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3 py-1.5 font-medium transition ${k === v ? "bg-white text-[#201613]" : "text-white/75 hover:text-white"}`}><span className="sm:hidden">{k}</span><span className="hidden sm:inline">{n}</span></Link>
      ))}
    </nav>
  );
}
