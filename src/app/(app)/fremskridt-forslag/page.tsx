// Preview: three versions of the "Fremskridt" card (Marco 2026-11-02). Same size as the slot on /ny-oversigt at
// 1440 px (about 420 × 195), header without an icon like the other new cards. Lesson numbers come from platform data.
import Link from "next/link";
import { ArrowRightIcon, SealCheckIcon, LockSimpleIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";
import { courseBySlug, lessonsFor, progress } from "@/content/platform";

const O = "#e2643f";
const shell = "relative flex h-[195px] w-[420px] max-w-full flex-col overflow-hidden rounded-[16px] bg-white px-[18px] pb-4 pt-[18px]";

const all = [...courseBySlug.values()];
const ls = all.flatMap((c) => lessonsFor(c));
const total = ls.length, done = ls.filter((l) => l.done).length;
const started = all.filter((c) => (progress[c.slug] ?? 0) > 0).reduce((n, c) => n + lessonsFor(c).filter((l) => !l.done).length, 0);
const todo = total - done - started;
const pct = Math.round((done / total) * 100);

function Head({ title = "Fremskridt", sub, right }: { title?: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">{title}</h4><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      {right}
    </div>
  );
}

/* A · Én samlet ring: all lessons in one ring, the three states as counts beside it. */
function VersionA() {
  const R = 44, C = 2 * Math.PI * R;
  const seg = [{ v: done, c: "#5cbf8f", l: "Gennemført" }, { v: started, c: O, l: "I gang" }, { v: todo, c: "#efe6e1", l: "Ikke startet" }];
  let acc = 0;
  return (
    <div className={shell}>
      <Head sub={`${total} lektioner i alt`} />
      <div className="mt-2 flex flex-1 items-center gap-5">
        <div className="relative size-[112px] shrink-0">
          <svg viewBox="0 0 104 104" className="size-full -rotate-90">
            {seg.map((s) => { const len = (s.v / total) * C; const el = <circle key={s.l} cx="52" cy="52" r={R} fill="none" stroke={s.c} strokeWidth="10" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} />; acc += len; return el; })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[24px] font-semibold tracking-[-0.03em] text-heading">{pct}%</strong><small className="text-[10px] text-muted">gennemført</small></div>
        </div>
        <ul className="grid flex-1 gap-2.5">
          {seg.map((s) => (
            <li key={s.l} className="flex items-center gap-2 text-[12px]"><i className="size-2.5 rounded-full" style={{ background: s.c }} /><span className="flex-1 text-muted">{s.l}</span><b className="font-semibold tabular-nums text-heading">{s.v}</b></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* B · Næste bevis: progress shown as certificates: what you have, and how close the next one is. */
function VersionB() {
  const next = courseBySlug.get("excel-med-ai")!;
  const nl = lessonsFor(next), nd = nl.filter((l) => l.done).length;
  return (
    <div className={shell}>
      <Head title="Fremskridt" sub="Dine kursusbeviser" right={<Link href="/beviser" className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#f3eeeb] px-3 text-[11.5px] font-medium text-heading">Se beviser <ArrowRightIcon size={12} /></Link>} />
      <div className="mt-3 grid flex-1 grid-cols-[1fr_1.25fr] gap-3">
        <div className="flex flex-col justify-between rounded-[12px] p-3 text-white" style={{ background: "linear-gradient(140deg, #3a2722 0%, #201613 100%)" }}>
          <span className="grid size-8 place-items-center rounded-[9px]" style={{ background: O }}><SealCheckIcon size={17} weight="fill" /></span>
          <div><p className="text-[26px] font-semibold leading-none tracking-[-0.03em]">1</p><p className="mt-1 text-[10.5px] text-white/65">bevis taget</p></div>
        </div>
        <div className="flex flex-col justify-between rounded-[12px] bg-[#f7f2ee] p-3">
          <p className="text-[10.5px] text-muted">Næste bevis</p>
          <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-heading">{next.title}</p>
          <p className="text-[11px] text-muted"><b className="font-semibold text-heading">{nl.length - nd} lektioner</b> tilbage</p>
        </div>
      </div>
    </div>
  );
}

/* C · Trin for trin: five milestones as stones; done, now and still locked. */
function VersionC() {
  const steps = ["Første lektion", "Første opgave", "Første bevis", "Halvvejs", "Niveau 1"];
  const now = 3;
  return (
    <div className={shell}>
      <Head sub="Vejen til niveau 1" right={<span className="text-[11.5px] font-semibold text-heading">{pct}%</span>} />
      <div className="mt-3 grid flex-1 grid-cols-5 items-center">
        {steps.map((s, i) => {
          const isDone = i < now, cur = i === now;
          return (
            <div key={s} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid size-11 place-items-center rounded-full" style={{ background: isDone ? "#e3f4ea" : cur ? O : "#f3efec", color: isDone ? "#2f7a4f" : cur ? "#fff" : "#b9aca6", boxShadow: cur ? "0 0 0 5px #fbe1d7" : undefined }}>
                {isDone ? <CheckIcon size={18} weight="bold" /> : cur ? <span className="text-[12px] font-bold">{i + 1}</span> : <LockSimpleIcon size={16} weight="fill" />}
              </span>
              <span className={`text-[10px] leading-tight ${cur ? "font-semibold text-heading" : "text-muted"}`}>{s}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted">Næste: <b className="font-semibold text-heading">Halvvejs</b>. Det svarer til 8 lektioner mere.</p>
    </div>
  );
}

export default function FremskridtForslag() {
  const items = [
    { t: "A · Én samlet ring", d: "Alle lektioner i én ring, med gennemført, i gang og ikke startet som tal ved siden af.", n: <VersionA /> },
    { t: "B · Næste bevis", d: "Fremskridt som kursusbeviser: hvor mange du har, og hvad der skal til for det næste.", n: <VersionB /> },
    { t: "C · Trin for trin", d: "Fem milepæle på vejen til niveau 1: klaret, i gang og låst.", n: <VersionC /> },
  ];
  return (
    <div data-dash-cream>
      <style>{`.app:has([data-dash-cream]), body:has([data-dash-cream]) { background: #f7f2ee; }`}</style>
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">Fremskridt · 3 versioner</h1>
      <p className="mt-1 text-[0.8125rem] text-muted">Samme størrelse som pladsen på det nye dashboard. Lektionstal er platformens data, resten er eksempler.</p>
      <div className="mt-6 flex flex-wrap gap-6">
        {items.map((it) => (
          <section key={it.t} className="grid max-w-[420px] content-start gap-2">
            <div className="min-h-[3em]"><p className="text-[0.9375rem] font-semibold text-heading">{it.t}</p><p className="text-[0.75rem] text-muted">{it.d}</p></div>
            {it.n}
          </section>
        ))}
      </div>
    </div>
  );
}
