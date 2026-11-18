// The dashboard (CampusHub design, built 2026-11-02 at /ny-oversigt), live on "/" since 2026-11-04 (Marco).
// Preview of the new dashboard (Marco 2026-11-02): his "CampusHub" reference rebuilt with the same sizes, grid,
// type scale and charts, in Mindforward's colours and Danish copy. Only the dashboard content changes; the AppShell
// (side menu, top bar, names) is untouched, and the live dashboard at "/" is not changed until Marco approves.
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, CheckIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, ClockIcon, FireIcon, GraduationCapIcon } from "@phosphor-icons/react/dist/ssr";
import { courseBySlug, learner, lessonsFor, progress } from "@/content/platform";
import { MineKurser } from "./MineKurser";

const card = "relative min-w-0 rounded-[16px] bg-white px-[18px] pb-4 pt-[18px]";

function CardHead({ icon: Icon, title, sub }: { icon?: typeof ClockIcon; title: string; sub: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--ink)] text-white"><Icon size={17} weight="bold" /></span>}
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">{title}</h4><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      </div>
      <button type="button" className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-[#f3eeeb] pl-3 pr-2 text-[11.5px] font-medium text-heading hover:bg-[#ebe4e0]">Denne uge <CaretDownIcon size={12} /></button>
    </div>
  );
}

function Hero() {
  return (
    <div className="relative min-h-[284px] overflow-hidden rounded-[16px] p-[34px] text-white" style={{ background: "radial-gradient(70% 85% at 58% 108%, #ffc46e 0%, #f0803a 16%, #e2643f 32%, rgba(170,62,30,.9) 52%, rgba(60,18,4,0) 82%), radial-gradient(45% 70% at 92% 60%, rgba(226,100,63,.55) 0%, transparent 70%), radial-gradient(70% 90% at 25% 112%, rgba(226,100,63,.85) 0%, rgba(130,38,6,.45) 45%, transparent 72%), linear-gradient(180deg, #0b0806 0%, #1a0d06 45%, #3d1606 100%)" }}>
      <Image src="/img/mf-hero-wave.webp" alt="" width={1100} height={998} priority className="pointer-events-none absolute bottom-0 left-[61%] hidden h-[100%] w-auto -translate-x-1/2 sm:block" style={{ filter: "drop-shadow(0 0 22px rgba(255,140,60,.45))" }} />
      <div className="relative z-[2] max-w-[300px]">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-white/70">Godmorgen, {learner.first}</p>
        <h1 className="mt-[26px] text-[37px] font-bold leading-[1.08] tracking-[-0.025em] !text-white">Få dagen<br />til at tælle</h1>
        <p className="mt-3 max-w-[230px] text-[12.5px] leading-[1.5] text-white/80">Kurser, opgaver og dit hold, samlet ét sted.</p>
        <Link href="/kurser/ai-paa-arbejdet/6" className="mt-[22px] inline-flex h-11 items-center gap-2.5 rounded-full bg-white px-5 text-[14px] font-semibold text-[#111] transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,.25)]">Fortsæt hvor du slap <ArrowRightIcon size={15} weight="bold" /></Link>
      </div>
      <div aria-hidden className="absolute left-[42%] top-[40%] z-[2] hidden size-[108px] -rotate-[9deg] place-items-center rounded-[20px] border border-white/40 bg-gradient-to-br from-white/25 to-white/[0.08] shadow-[0_20px_40px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-[14px] md:grid"><GraduationCapIcon size={50} weight="fill" /></div>
      <div className="absolute left-[74.6%] top-[22%] z-[2] hidden h-[172px] w-[142px] rotate-[5deg] flex-col justify-between rounded-[18px] border border-white/40 bg-gradient-to-br from-white/25 to-white/[0.08] px-4 py-[18px] shadow-[0_20px_40px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-[14px] md:flex">
        <p className="text-[17.5px] font-medium leading-[1.32] tracking-[-0.01em]">”Øv i dag, <span className="text-[#ffb27a]">bliv skarpere</span> i morgen.”</p>
        <div className="relative h-[3px] rounded-[3px] bg-white/30"><span className="absolute inset-y-0 left-0 w-[34%] rounded-[3px] bg-white" /></div>
      </div>
    </div>
  );
}

function Calendar() {
  const events = [
    { t: "AI til mails", s: "8.30 – 10.00", l: 0, w: 30, top: 34, c: "bg-[var(--coral)] text-white", href: "/kurser/ai-paa-arbejdet/6" },
    { t: "Holdmøde", s: "16.00 – 17.00", l: 66, w: 33, top: 38, c: "bg-white text-[#111]", href: "/beskeder" },
    { t: "Frokost", s: "12.00 – 13.00", l: 34, w: 27, top: 86, c: "bg-white text-[#111]", href: "/plan" },
    { t: "Øvemiljø: Mail til en kunde", s: "11.00 – 16.00", l: 28.5, w: 70, top: 134, c: "bg-[#67c48f] text-[#0d2a19]", href: "/oevemiljoe" },
  ];
  return (
    <div className="relative min-h-[284px] overflow-hidden rounded-[16px] bg-gradient-to-b from-[#2a211e] to-[#1f1916] px-4 py-[18px] text-white">
      <div className="relative z-[2] flex items-center justify-between">
        <strong className="text-[14px] font-semibold">Fre, 23. okt</strong>
        <div className="flex items-center gap-1.5">
          <Link href="/plan" className="h-[26px] rounded-full border border-white/20 px-3.5 text-[11px] leading-[24px] text-[#ddd] hover:bg-white/10">I dag</Link>
          <button type="button" aria-label="Forrige dag" className="grid size-[26px] place-items-center rounded-full bg-white/10 text-[#ddd] hover:bg-white/20"><CaretLeftIcon size={13} weight="bold" /></button>
          <button type="button" aria-label="Næste dag" className="grid size-[26px] place-items-center rounded-full bg-white/10 text-[#ddd] hover:bg-white/20"><CaretRightIcon size={13} weight="bold" /></button>
        </div>
      </div>
      <div className="absolute inset-x-4 bottom-0 top-[58px] z-[1]">
        <div className="relative z-[2] flex justify-between pl-1 pr-1.5 text-[10px] text-white/70">{["8", "10", "12", "14", "16", "18"].map((x) => <span key={x}>{x}</span>)}</div>
        <div className="absolute bottom-[30px] left-1 right-1.5 top-5 flex justify-between">{Array.from({ length: 6 }, (_, i) => <i key={i} className="border-l border-dashed border-white/[0.08]" />)}</div>
        {events.map((e) => (
          <Link key={e.t} href={e.href} className={`absolute z-[2] rounded-[6px] px-2 py-1.5 leading-[1.25] shadow-[0_6px_16px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 ${e.c}`} style={{ left: `${e.l}%`, width: `${e.w}%`, top: e.top }}>
            <b className="block truncate text-[10.5px] font-semibold">{e.t}</b><span className="mt-0.5 block whitespace-nowrap text-[9px] opacity-80">{e.s}</span>
          </Link>
        ))}
      </div>
      <svg aria-hidden viewBox="0 0 340 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[90px] w-full"><path d="M0 60 L40 42 L70 52 L110 26 L150 48 L185 36 L220 54 L262 30 L300 50 L340 40 V90 H0z" fill="#362c28" /><path d="M0 74 L50 58 L95 68 L140 52 L190 70 L240 56 L290 70 L340 60 V90 H0z" fill="#2a221f" /></svg>
    </div>
  );
}

// Øvetid · version C, chosen by Marco 2026-11-02 (no clock icon): time split by tool, plus the next task.
function Oevetid() {
  const tools = [
    { n: "ChatGPT", m: 95, c: "#e2643f" },
    { n: "Copilot", m: 80, c: "#8a4e3b" },
    { n: "Claude", m: 45, c: "#f6b49b" },
  ];
  const total = tools.reduce((n, t) => n + t.m, 0);
  return (
    <div className={`${card} flex min-h-[230px] flex-col`}>
      <CardHead title="Øvetid" sub="Fordelt på værktøjer" />
      <p className="mt-3 flex items-baseline gap-2"><strong className="text-[28px] font-semibold tracking-[-0.03em] text-heading">3 t 40 m</strong><span className="text-[12px] font-semibold text-[#3fae72]">↑ 28 %</span></p>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full">{tools.map((t) => <span key={t.n} style={{ width: `${(t.m / total) * 100}%`, background: t.c }} />)}</div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {tools.map((t) => (
          <li key={t.n}>
            <p className="flex items-center gap-1.5 text-[11px] text-muted"><i className="size-2 rounded-full" style={{ background: t.c }} />{t.n}</p>
            <p className="text-[13px] font-semibold text-heading">{Math.floor(t.m / 60)} t {t.m % 60} m</p>
          </li>
        ))}
      </ul>
      <Link href="/oevemiljoe" className="mt-auto flex items-center justify-between gap-2 rounded-[10px] bg-[#f7f2ee] px-3 py-2 text-[11.5px] text-heading hover:bg-[#f1e9e4]">
        <span className="truncate">Næste opgave: <b className="font-semibold">Tjek et AI-svar for fejl</b> · 9 min</span><ArrowRightIcon size={13} weight="bold" className="shrink-0" />
      </Link>
    </div>
  );
}


// Seneste feedback (Marco 2026-11-02, chosen over all Fokuskort versions): the last scored task from the øvemiljø,
// what went well and what to do better. Example data.
function Fokuskort() {
  return (
    <div className={`${card} flex min-h-[200px] flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Seneste feedback</h4><small className="mt-px block text-[11.5px] text-muted">Fra øvemiljøet · i går</small></div>
        <Link href="/oevemiljoe?opgave=t3" className="inline-flex h-7 items-center gap-1 rounded-[8px] bg-[#f3eeeb] px-3 text-[11.5px] font-medium text-heading hover:bg-[#ebe4e0]">Se opgaven <ArrowRightIcon size={12} /></Link>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[170px_1fr_1fr]">
        <div className="flex flex-col justify-between rounded-[12px] p-3.5 text-white" style={{ background: "linear-gradient(140deg, #3a2722 0%, #201613 100%)" }}>
          <p className="text-[11px] leading-snug text-white/70">Hvad må du dele?</p>
          <p className="flex items-baseline gap-1"><span className="text-[34px] font-semibold leading-none tracking-[-0.04em]">92</span><span className="text-[12px] text-white/60">/ 100</span></p>
          <span className="w-fit rounded-full bg-[#e2643f] px-2 py-0.5 text-[10px] font-semibold">Flot klaret</span>
        </div>
        <div className="rounded-[12px] bg-[#f7f2ee] p-3.5">
          <p className="text-[11px] font-semibold text-heading">Det gik godt</p>
          <ul className="mt-2 grid gap-1.5 text-[11.5px] text-heading">
            {["Du fjernede alle navne", "Du så CPR-nummeret", "Kort og klar begrundelse"].map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full bg-[#5cbf8f] text-white"><CheckIcon size={9} weight="bold" /></span>{t}</li>)}
          </ul>
        </div>
        <div className="rounded-[12px] border border-[#f1e6df] p-3.5">
          <p className="text-[11px] font-semibold text-heading">Gør det endnu bedre</p>
          <ul className="mt-2 grid gap-1.5 text-[11.5px] text-heading">
            {["Tjek også adresser i fritekst", "Skriv hvorfor, ikke kun hvad"].map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full bg-[#e2643f] text-white"><ArrowUpRightIcon size={9} weight="bold" /></span>{t}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Fremskridt · version A, chosen by Marco 2026-11-02: all lessons in one ring, the three states as counts.
function Praestation() {
  const all = [...courseBySlug.values()];
  const ls = all.flatMap((c) => lessonsFor(c));
  const total = ls.length, done = ls.filter((l) => l.done).length;
  const started = all.filter((c) => (progress[c.slug] ?? 0) > 0).reduce((n, c) => n + lessonsFor(c).filter((l) => !l.done).length, 0);
  const seg = [{ v: done, c: "#5cbf8f", l: "Gennemført" }, { v: started, c: "#e2643f", l: "I gang" }, { v: total - done - started, c: "#efe6e1", l: "Ikke startet" }];
  const R = 44, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className={`${card} flex min-h-[200px] flex-col`}>
      <CardHead title="Fremskridt" sub={`${total} lektioner i alt`} />
      <div className="mt-2 flex flex-1 items-center gap-5">
        <div className="relative size-[112px] shrink-0">
          <svg viewBox="0 0 104 104" className="size-full -rotate-90">
            {seg.map((x) => { const len = (x.v / total) * C; const el = <circle key={x.l} cx="52" cy="52" r={R} fill="none" stroke={x.c} strokeWidth="10" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} />; acc += len; return el; })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[24px] font-semibold tracking-[-0.03em] text-heading">{Math.round((done / total) * 100)}%</strong><small className="text-[10px] text-muted">gennemført</small></div>
        </div>
        <ul className="grid flex-1 gap-2.5">
          {seg.map((x) => <li key={x.l} className="flex items-center gap-2 text-[12px]"><i className="size-2.5 rounded-full" style={{ background: x.c }} /><span className="flex-1 text-muted">{x.l}</span><b className="font-semibold tabular-nums text-heading">{x.v}</b></li>)}
        </ul>
      </div>
    </div>
  );
}

function Streak() {
  const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  return (
    <section className="flex min-h-[72px] flex-wrap items-center gap-3.5 rounded-[16px] bg-white px-4 py-3.5">
            <div><strong className="text-[15px] font-semibold tracking-[-0.01em] text-heading">Du har øvet 5 dage i træk!</strong><small className="mt-0.5 block text-[11.5px] text-muted">Bliv ved. Det er vanen, der gør forskellen.</small></div>
      <div className="ml-auto mr-14 flex gap-4">{days.map((d, i) => (
        <div key={d} className="flex flex-col items-center gap-1 text-[10.5px] text-[#444]">
          <i className={`grid size-8 place-items-center rounded-full ${i < 5 ? "bg-[#fde8dc] text-[var(--coral)]" : "bg-[#f1f1f1] text-[#cdcdcd]"}`}><FireIcon size={17} weight="fill" /></i>{d}
        </div>
      ))}</div>
      <Link href="/oevemiljoe" className="inline-flex h-[42px] items-center gap-2.5 rounded-full bg-[var(--ink)] px-5 text-[14px] font-semibold text-white transition hover:-translate-y-px">Fortsæt med at øve <ArrowRightIcon size={15} weight="bold" /></Link>
    </section>
  );
}

export function Oversigt() {
  return (
    // Cream page background like the website (#f7f2ee) behind the whole dashboard, so the white cards stand out
    // with a clear edge, and the cards fill the full width (Marco 2026-11-02).
    <div data-dash-cream className="flex flex-col gap-3 xl:grid xl:h-[var(--dash-h)] xl:grid-rows-[284fr_230fr_200fr_auto]">
      {/* xl: the dashboard fills the window from under the top bar to the bottom (Marco: "fra bunden til toppen"). */}
      <style>{`.app:has([data-dash-cream]), body:has([data-dash-cream]) { background: #f7f2ee; } [data-dash-cream] { --dash-h: max(720px, calc(100svh - 5.9rem)); } main > div:has(> [data-dash-cream]) { padding-bottom: 0; }`}</style>
      <section className="grid min-h-0 gap-3 xl:grid-cols-[2.45fr_1fr] [&>*]:min-h-[284px] xl:[&>*]:min-h-0"><Hero /><Calendar /></section>
      <section className="grid min-h-0 gap-3 xl:grid-cols-[1fr_1.76fr] [&>*]:min-h-[230px] xl:[&>*]:min-h-0"><Oevetid /><MineKurser className="min-h-[230px] xl:min-h-0" /></section>
      <section className="grid min-h-0 gap-3 xl:grid-cols-[1.76fr_1fr] [&>*]:min-h-[200px] xl:[&>*]:min-h-0"><Fokuskort /><Praestation /></section>
      <Streak />
    </div>
  );
}
