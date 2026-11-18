"use client";
// Version A · Katalog. Course list after the "Coursify" reference (three overview cards on top, a filterable card grid
// below); the course page after the "Academia" reference (big player left, modules list right).
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BookmarkSimpleIcon, CaretDownIcon, CheckIcon, ClockIcon, ClosedCaptioningIcon, FileTextIcon, FlaskIcon, GearSixIcon, PlayIcon, SealCheckIcon, SpeakerHighIcon } from "@phosphor-icons/react";
import { Demo } from "@/components/app/ui";
import { categories, outcomes } from "@/content/academy";
import { all, card, fmtMin, GREEN, O, pill, sorted, type CourseView, type Module } from "./data";
import { Cover } from "./parts";

function Level({ level }: { level: string }) {
  const n = level === "Begynder" ? 1 : level === "Øvet" ? 2 : 3;
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/95 px-2.5 text-[10.5px] font-semibold text-heading shadow-[0_2px_8px_rgba(0,0,0,.08)]">
      <span className="flex items-end gap-[2px]">{[5, 7, 9].map((h, i) => <i key={h} className="w-[2.5px] rounded-full" style={{ height: h, background: i < n ? O : "#e6dcd6" }} />)}</span>
      {level}
    </span>
  );
}

const TABS = ["Alle", "I gang", "Gemt", "Færdige"] as const;

export function KatalogA() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Alle");
  const [cat, setCat] = useState<string>("Alle");
  const list = useMemo(() => sorted.filter((c) =>
    (tab === "Alle" || (tab === "I gang" && c.status === "I gang") || (tab === "Gemt" && c.saved) || (tab === "Færdige" && c.status === "Færdig")) &&
    (cat === "Alle" || c.category === cat)), [tab, cat]);
  const count = (t: (typeof TABS)[number]) => all.filter((c) => t === "Alle" || (t === "I gang" && c.status === "I gang") || (t === "Gemt" && c.saved) || (t === "Færdige" && c.status === "Færdig")).length;
  const next = sorted[0];

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1 pt-1">
        <div>
          <h1 className="text-[28px] font-semibold leading-none tracking-[-0.025em] text-heading">Kurser</h1>
          <p className="mt-1.5 text-[12.5px] text-muted">{all.length} kurser i dit abonnement · {count("I gang")} i gang</p>
        </div>
        <Demo />
      </header>

      <section className="grid gap-3 lg:grid-cols-[1fr_1.15fr_1fr]">
        <Donut />
        <ProgressBars />
        <NextLesson c={next} />
      </section>

      <section className={`${card} p-[18px]`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Filtrér kurser" className="flex gap-1 rounded-[10px] bg-[#f7f2ee] p-1">
            {TABS.map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-8 rounded-[8px] px-3.5 text-[12.5px] font-medium transition ${tab === t ? "bg-white text-heading shadow-[0_1px_3px_rgba(32,22,19,.12)]" : "text-muted hover:text-heading"}`}>
                {t} <span className="ml-0.5 tabular-nums text-[11px] text-muted">{count(t)}</span>
              </button>
            ))}
          </div>
          <label className="relative">
            <span className="sr-only">Emne</span>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 appearance-none rounded-[10px] border border-[#ece4df] bg-white pl-3.5 pr-9 text-[12.5px] font-medium text-heading outline-none focus-visible:ring-2 focus-visible:ring-[#e2643f]">
              {categories.map((c) => <option key={c} value={c}>{c === "Alle" ? "Alle emner" : c}</option>)}
            </select>
            <CaretDownIcon size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          </label>
        </div>

        {list.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {list.map((c) => <li key={c.slug}><CourseCardA c={c} /></li>)}
          </ul>
        ) : (
          <div className="mt-4 grid h-[220px] place-content-center rounded-[12px] bg-[#f7f2ee] text-center">
            <p className="text-[14px] font-semibold text-heading">Ingen kurser her endnu</p>
            <button onClick={() => { setTab("Alle"); setCat("Alle"); }} className="mt-2 text-[12.5px] font-medium text-[#c4502f] underline underline-offset-4">Vis alle kurser</button>
          </div>
        )}
      </section>
    </div>
  );
}

function CardTitle({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">{title}</h2><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      {right}
    </div>
  );
}

function Donut() {
  const seg = [
    { l: "I gang", v: all.filter((c) => c.status === "I gang").length, c: O },
    { l: "Ikke startet", v: all.filter((c) => c.status === "Ikke startet").length, c: "#efe6e1" },
    { l: "Færdige", v: all.filter((c) => c.status === "Færdig").length, c: GREEN },
  ];
  const R = 46, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className={`${card} flex min-h-[210px] flex-col p-[18px]`}>
      <CardTitle title="Dine kurser" sub="Status lige nu" />
      <div className="mt-2 flex flex-1 items-center gap-5">
        <div className="relative size-[118px] shrink-0">
          <svg viewBox="0 0 108 108" className="size-full -rotate-90">
            {seg.map((x) => { const len = (x.v / all.length) * C; const el = <circle key={x.l} cx="54" cy="54" r={R} fill="none" stroke={x.c} strokeWidth="11" strokeDasharray={`${Math.max(0, len - 2.5)} ${C}`} strokeDashoffset={-acc} />; acc += len; return el; })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-heading">{all.length}</strong><small className="mt-1 text-[10px] text-muted">kurser</small></div>
        </div>
        <ul className="grid flex-1 gap-2.5">
          {seg.map((x) => <li key={x.l} className="flex items-center gap-2 text-[12px]"><i className="size-2.5 rounded-full" style={{ background: x.c === "#efe6e1" ? "#d9ccc5" : x.c }} /><span className="flex-1 text-muted">{x.l}</span><b className="font-semibold tabular-nums text-heading">{x.v}</b></li>)}
        </ul>
      </div>
    </div>
  );
}

function ProgressBars() {
  const going = sorted.filter((c) => c.status !== "Ikke startet").slice(0, 5);
  const short: Record<string, string> = { "ai-paa-arbejdet": "AI på arbejdet", "gode-prompts": "Prompts", "mails-og-tilbud": "Mails", "excel-med-ai": "Excel", "data-og-gdpr": "GDPR" };
  return (
    <div className={`${card} flex min-h-[210px] flex-col p-[18px]`}>
      <CardTitle title="Fremskridt" sub="Kurser du er startet på" />
      <div className="mt-3 grid flex-1 grid-cols-5 items-end gap-3">
        {going.map((c) => (
          <Link key={c.slug} href={`/kurser-forslag/a/${c.slug}`} className="group flex h-full flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] font-semibold tabular-nums text-heading">{c.p}%</span>
            <div className="relative w-full max-w-[44px] flex-1 overflow-hidden rounded-[8px] bg-[#f7f2ee]" style={{ minHeight: 84 }}>
              <div className="absolute inset-x-0 bottom-0 rounded-[8px] transition-[filter] group-hover:brightness-95" style={{ height: `${c.p}%`, background: c.p >= 100 ? GREEN : O }} />
            </div>
            <span className="w-full truncate text-center text-[10.5px] text-muted">{short[c.slug] ?? c.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function NextLesson({ c }: { c: CourseView }) {
  return (
    <Link href={`/kurser-forslag/a/${c.slug}`} className="group relative flex min-h-[210px] flex-col overflow-hidden rounded-[16px] p-[18px] text-white" style={{ background: "linear-gradient(140deg, #3a2722 0%, #201613 100%)" }}>
      <Cover slug={c.slug} sizes="200px" className="absolute inset-y-0 right-0 w-[46%] opacity-90 [mask-image:linear-gradient(90deg,transparent,#000_55%)]" />
      <div className="relative z-[1] flex flex-1 flex-col">
        <p className="text-[11px] text-white/65">Næste lektion · {c.next?.minutes} min</p>
        <p className="mt-2 max-w-[62%] text-[20px] font-semibold leading-[1.15] tracking-[-0.015em]">{c.next?.title}</p>
        <p className="mt-1.5 max-w-[60%] text-[11.5px] text-white/65">{c.title}</p>
        <span className="mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-[#111] transition group-hover:-translate-y-px">Fortsæt <ArrowRightIcon size={14} weight="bold" /></span>
      </div>
    </Link>
  );
}

function CourseCardA({ c }: { c: CourseView }) {
  return (
    <Link href={`/kurser-forslag/a/${c.slug}`} className="group flex h-full flex-col rounded-[14px] border border-[#f1e9e4] bg-white p-2 transition hover:border-[#e6d9d2] hover:shadow-[0_10px_28px_-12px_rgba(32,22,19,.25)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e2643f]">
      <div className="relative">
        <Cover slug={c.slug} sizes="(min-width:1280px) 280px, 50vw" className="h-[148px] rounded-[10px]" icon={46} />
        <span className="absolute left-2 top-2"><Level level={c.level} /></span>
        {c.saved && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-white/95 text-heading"><BookmarkSimpleIcon size={13} weight="fill" /></span>}
      </div>
      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-3">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          <span className="flex-1 truncate">{c.category}</span>
          <span className="flex items-center gap-1"><FileTextIcon size={12} />{c.lessons}</span>
          <span className="flex items-center gap-1"><ClockIcon size={12} />{fmtMin(c.minutes)}</span>
        </div>
        <h3 className="mt-1.5 line-clamp-2 text-[14.5px] font-semibold leading-[1.25] tracking-[-0.01em] text-heading">{c.title}</h3>
        <div className="mt-auto pt-3">
          {c.status === "Færdig" ? (
            <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#2f8a5c]"><SealCheckIcon size={15} weight="fill" /> Færdig · bevis klar</p>
          ) : c.status === "I gang" ? (
            <div className="flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f3eeeb]"><div className="h-full rounded-full" style={{ width: `${c.p}%`, background: O }} /></div><span className="text-[11px] font-semibold tabular-nums text-heading">{c.done}/{c.total}</span></div>
          ) : (
            <p className="flex items-center justify-between text-[11.5px] text-muted">Ikke startet <span className="font-semibold text-heading group-hover:text-[#c4502f]">Start →</span></p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ——— Course page with its modules ———

export function ModulA({ c }: { c: CourseView }) {
  const [tab, setTab] = useState<"Moduler" | "Opgaver" | "Materialer">("Moduler");
  const [open, setOpen] = useState<number>(c.nextModule?.n ?? 1);
  const lesson = c.next ?? c.lessonsList[0];

  return (
    <div className="flex flex-col gap-3">
      <div className={`${card} flex items-center gap-2 px-4 py-3 text-[12.5px]`}>
        <Link href="/kurser-forslag/a" aria-label="Tilbage til kurser" className="grid size-7 place-items-center rounded-[8px] border border-[#ece4df] text-heading hover:bg-[#f7f2ee]"><ArrowLeftIcon size={13} /></Link>
        <Link href="/kurser-forslag/a" className="font-semibold text-heading hover:underline">Kurser</Link>
        <span className="text-muted">/</span>
        <span className="truncate text-muted">{c.title}</span>
        <span className="ml-auto hidden sm:block"><Demo /></span>
      </div>

      <section className={`${card} grid gap-5 p-[18px] xl:grid-cols-[minmax(0,1fr)_360px]`}>
        <div className="min-w-0">
          {/* Player */}
          <div className="relative aspect-[16/8.6] overflow-hidden rounded-[14px] bg-[#201613]">
            <Cover slug={c.slug} sizes="(min-width:1280px) 760px, 100vw" className="absolute inset-0" icon={90} zoom={false} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#201613]/85 via-transparent to-[#201613]/30" />
            <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11.5px] font-semibold text-heading">Lektion {lesson.n} · {lesson.title}</span>
            <button aria-label="Afspil" className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-[#201613] shadow-[0_12px_32px_rgba(0,0,0,.3)] transition hover:scale-105"><PlayIcon size={24} weight="fill" className="translate-x-[1px]" /></button>
            <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 text-white">
              <span className="grid size-9 place-items-center rounded-[9px]" style={{ background: O }}><PlayIcon size={15} weight="fill" /></span>
              <SpeakerHighIcon size={18} />
              <div className="h-1 flex-1 rounded-full bg-white/25"><div className="h-full w-[38%] rounded-full bg-white" /></div>
              <span className="text-[11px] tabular-nums text-white/85">03:02 / {String(lesson.minutes).padStart(2, "0")}:00</span>
              <ClosedCaptioningIcon size={19} />
              <GearSixIcon size={18} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {[c.level, `${c.lessons} lektioner`, fmtMin(c.minutes), `${c.tasks} opgaver`].map((t) => <span key={t} className="rounded-[8px] border border-[#ece4df] px-2.5 py-1 text-[11.5px] text-heading">{t}</span>)}
            <div className="ml-auto flex gap-2">
              <button className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[#ece4df] px-3.5 text-[12.5px] font-medium text-heading hover:bg-[#f7f2ee]"><BookmarkSimpleIcon size={14} weight={c.saved ? "fill" : "regular"} /> {c.saved ? "Gemt" : "Gem"}</button>
              <Link href={`/kurser/${c.slug}/${lesson.n}`} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] px-4 text-[12.5px] font-semibold text-white transition hover:brightness-95" style={{ background: O }}><PlayIcon size={13} weight="fill" /> {c.p === 0 ? "Start kurset" : `Fortsæt lektion ${lesson.n}`}</Link>
            </div>
          </div>

          <h1 className="mt-4 text-[28px] font-semibold leading-[1.12] tracking-[-0.025em] text-heading">{c.title}</h1>
          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.6] text-text">{c.summary} Hver lektion tager omkring 10 minutter, og du øver på opgaver fra din egen arbejdsdag i øvemiljøet.</p>

          <h2 className="mt-5 text-[13px] font-semibold text-heading">Det lærer du</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {outcomes.map((o) => <li key={o.title} className="flex items-start gap-2 rounded-[10px] bg-[#f7f2ee] px-3 py-2.5 text-[12.5px] text-heading"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={9} weight="bold" /></span>{o.title}</li>)}
          </ul>
        </div>

        {/* Modules */}
        <aside className="min-w-0">
          <div role="tablist" className="grid grid-cols-3 gap-1.5">
            {(["Moduler", "Opgaver", "Materialer"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-9 rounded-[10px] border text-[12.5px] font-medium transition ${tab === t ? "border-[#e2643f] bg-[#fdf0ea] text-[#c4502f]" : "border-[#ece4df] text-heading hover:bg-[#f7f2ee]"}`}>{t}</button>
            ))}
          </div>
          <p className="mt-3 flex items-center justify-between text-[11.5px] text-muted"><span>{c.modules.length} moduler · {c.done} af {c.total} lektioner</span><span className="font-semibold tabular-nums text-heading">{c.p}%</span></p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#f3eeeb]"><div className="h-full rounded-full" style={{ width: `${c.p}%`, background: O }} /></div>

          {tab === "Moduler" ? (
            <ol className="mt-3 flex flex-col gap-2">
              {c.modules.map((m) => <ModuleRow key={m.n} m={m} open={open === m.n} onToggle={() => setOpen(open === m.n ? 0 : m.n)} slug={c.slug} next={lesson.n} />)}
            </ol>
          ) : tab === "Opgaver" ? (
            <ul className="mt-3 flex flex-col gap-2">
              {c.lessonsList.filter((l) => l.task).map((l) => (
                <li key={l.n} className="flex items-center gap-3 rounded-[12px] border border-[#f1e9e4] px-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-[#f7f2ee] text-heading"><FlaskIcon size={15} /></span>
                  <span className="min-w-0 flex-1"><b className="block truncate text-[12.5px] font-semibold text-heading">{l.title}</b><small className="text-[11px] text-muted">Lektion {l.n} · {l.minutes} min</small></span>
                  {l.score !== undefined ? <span className="text-[13px] font-semibold tabular-nums text-heading">{l.score}<small className="text-[10px] text-muted">/100</small></span> : <span className="text-[11px] text-muted">Ikke afleveret</span>}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-3 flex flex-col gap-2 text-[12.5px]">
              {["Prompt-skabeloner (PDF)", "Tjekliste: før du deler data", "Ordliste: AI på dansk"].map((t) => <li key={t} className="flex items-center gap-3 rounded-[12px] border border-[#f1e9e4] px-3 py-3 text-heading"><FileTextIcon size={16} className="text-muted" />{t}</li>)}
            </ul>
          )}
        </aside>
      </section>
    </div>
  );
}

function ModuleRow({ m, open, onToggle, slug, next }: { m: Module; open: boolean; onToggle: () => void; slug: string; next: number }) {
  return (
    <li className={`overflow-hidden rounded-[12px] border transition ${m.state === "current" ? "border-[#f3c8b6] bg-[#fffaf7]" : "border-[#f1e9e4]"}`}>
      <button onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={`grid size-8 shrink-0 place-items-center rounded-[9px] text-[12px] font-semibold ${m.state === "done" ? "text-white" : m.state === "current" ? "text-white" : "bg-[#f3eeeb] text-heading"}`} style={m.state === "done" ? { background: GREEN } : m.state === "current" ? { background: O } : undefined}>
          {m.state === "done" ? <CheckIcon size={14} weight="bold" /> : m.n}
        </span>
        <span className="min-w-0 flex-1"><b className="block truncate text-[13px] font-semibold text-heading">Modul {m.n} · {m.title}</b><small className="text-[11px] text-muted">{m.done}/{m.lessons.length} lektioner · {m.minutes} min</small></span>
        <CaretDownIcon size={14} className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ol className="border-t border-[#f1e9e4] px-1.5 py-1.5">
          {m.lessons.map((l) => {
            const cur = l.n === next;
            return (
              <li key={l.n}>
                <Link href={`/kurser/${slug}/${l.n}`} className={`flex items-center gap-3 rounded-[9px] px-2 py-2 ${cur ? "bg-white shadow-[0_1px_4px_rgba(32,22,19,.1)]" : "hover:bg-[#f7f2ee]"}`}>
                  {l.done ? (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full text-white" style={{ background: GREEN }}><CheckIcon size={11} weight="bold" /></span>
                  ) : cur ? (
                    <span className="grid size-6 shrink-0 place-items-center rounded-[7px] text-white" style={{ background: O }}><PlayIcon size={10} weight="fill" /></span>
                  ) : (
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#e3d8d2] text-muted"><PlayIcon size={9} weight="fill" /></span>
                  )}
                  <span className="min-w-0 flex-1"><span className={`block truncate text-[12.5px] ${cur ? "font-semibold text-heading" : "text-heading"}`}>{l.title}</span><small className="text-[10.5px] text-muted">{l.minutes} min{l.task ? " · opgave" : ""}</small></span>
                  {l.score !== undefined && <span className="text-[11px] font-semibold tabular-nums text-muted">{l.score}</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

