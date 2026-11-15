// Oversigt (/hjem), ported 1:1 from the approved platform dashboard (mindforward-platform "/", Marco 2026-11-04;
// his "CampusHub" reference in Mindforward colours). Real data: greeting, "Fortsæt" target, Mine kurser, next
// module task, latest feedback, Fremskridt and the streak. Example data (marked "Eksempeldata"): the day calendar and
// the Øvetid split per tool (no calendar or practice-time tracking exists yet).
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon, CheckIcon, CaretDownIcon, CaretLeftIcon, CaretRightIcon, ClockIcon, FireIcon, GraduationCapIcon } from "@phosphor-icons/react/dist/ssr";
import { Demo } from "@/components/platform/ui";
import { MineKurser, type MineKurserCourse } from "./MineKurser";

export interface OversigtData {
  greeting: string;
  continueHref: string;
  today: string;
  courses: MineKurserCourse[];
  nextTask: { title: string; minutes: number; href: string } | null;
  feedback: { title: string; score: number; when: string; href: string; good: string[]; better: string[] } | null;
  progress: { total: number; done: number; started: number };
  streak: { days: number; week: boolean[] };
}

const card = "relative min-w-0 rounded-[16px] bg-pf-white px-[18px] pb-4 pt-[18px]";

function CardHead({ icon: Icon, title, sub, demo }: { icon?: typeof ClockIcon; title: string; sub: string; demo?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--ink)] text-pf-white"><Icon size={17} weight="bold" /></span>}
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">{title}</h4><small className="mt-px block text-[11.5px] text-pf-muted">{sub}</small></div>
      </div>
      <div className="flex items-center gap-2">
        {demo && <Demo />}
        <button type="button" className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-[var(--pf-f3eeeb)] pl-3 pr-2 text-[11.5px] font-medium text-heading hover:bg-[var(--pf-ebe4e0)]">Denne uge <CaretDownIcon size={12} /></button>
      </div>
    </div>
  );
}

function Hero({ greeting, href }: { greeting: string; href: string }) {
  return (
    <div className="relative min-h-[284px] overflow-hidden rounded-[16px] p-[34px] text-pf-white" style={{ background: "radial-gradient(70% 85% at 58% 108%, var(--pf-ffc46e) 0%, var(--pf-f0803a) 16%, var(--pf-e2643f) 32%, var(--pf-rgba-170-62-30-9) 52%, var(--pf-rgba-60-18-4-0) 82%), radial-gradient(45% 70% at 92% 60%, var(--pf-rgba-226-100-63-55) 0%, transparent 70%), radial-gradient(70% 90% at 25% 112%, var(--pf-rgba-226-100-63-85) 0%, var(--pf-rgba-130-38-6-45) 45%, transparent 72%), linear-gradient(180deg, var(--pf-0b0806) 0%, var(--pf-1a0d06) 45%, var(--pf-3d1606) 100%)" }}>
      <Image src="/img/mf-hero-wave.webp" alt="" width={1100} height={998} priority className="pointer-events-none absolute bottom-0 left-[61%] hidden h-[100%] w-auto -translate-x-1/2 sm:block" style={{ filter: "drop-shadow(0 0 22px var(--pf-rgba-255-140-60-45))" }} />
      <div className="relative z-[2] max-w-[300px]">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-pf-white/70">{greeting}</p>
        <h1 className="mt-[26px] text-[37px] font-bold leading-[1.08] tracking-[-0.025em] !text-pf-white">Få dagen<br />til at tælle</h1>
        <p className="mt-3 max-w-[230px] text-[12.5px] leading-[1.5] text-pf-white/80">Kurser, opgaver og dit hold, samlet ét sted.</p>
        <Link href={href} className="mt-[22px] inline-flex h-11 items-center gap-2.5 rounded-full bg-pf-white px-5 text-[14px] font-semibold text-[var(--pf-111)] transition hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,.25)]">Fortsæt hvor du slap <ArrowRightIcon size={15} weight="bold" /></Link>
      </div>
      <div aria-hidden className="absolute left-[42%] top-[40%] z-[2] hidden size-[108px] -rotate-[9deg] place-items-center rounded-[20px] border border-pf-white/40 bg-gradient-to-br from-pf-white/25 to-pf-white/[0.08] shadow-[0_20px_40px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-[14px] md:grid"><GraduationCapIcon size={50} weight="fill" /></div>
      <div className="absolute left-[74.6%] top-[22%] z-[2] hidden h-[172px] w-[142px] rotate-[5deg] flex-col justify-between rounded-[18px] border border-pf-white/40 bg-gradient-to-br from-pf-white/25 to-pf-white/[0.08] px-4 py-[18px] shadow-[0_20px_40px_rgba(0,0,0,.25),inset_0_1px_0_rgba(255,255,255,.35)] backdrop-blur-[14px] md:flex">
        <p className="text-[17.5px] font-medium leading-[1.32] tracking-[-0.01em]">”Øv i dag, <span className="text-[var(--pf-ffb27a)]">bliv skarpere</span> i morgen.”</p>
        <div className="relative h-[3px] rounded-[3px] bg-pf-white/30"><span className="absolute inset-y-0 left-0 w-[34%] rounded-[3px] bg-pf-white" /></div>
      </div>
    </div>
  );
}

// Example events (there is no calendar backend yet); the date is today's.
function Calendar({ today }: { today: string }) {
  const events = [
    { t: "AI til mails", s: "8.30 – 10.00", l: 0, w: 30, top: 34, c: "bg-[var(--coral)] text-pf-white", href: "/forloeb" },
    { t: "Holdmøde", s: "16.00 – 17.00", l: 66, w: 33, top: 38, c: "bg-pf-white text-[var(--pf-111)]", href: "/beskeder" },
    { t: "Frokost", s: "12.00 – 13.00", l: 34, w: 27, top: 86, c: "bg-pf-white text-[var(--pf-111)]", href: "/kalender" },
    { t: "Øvemiljø: Mail til en kunde", s: "11.00 – 16.00", l: 28.5, w: 70, top: 134, c: "bg-[var(--pf-67c48f)] text-[var(--pf-0d2a19)]", href: "/sandkasse" },
  ];
  return (
    <div className="relative min-h-[284px] overflow-hidden rounded-[16px] bg-gradient-to-b from-[var(--pf-2a211e)] to-[var(--pf-1f1916)] px-4 py-[18px] text-pf-white">
      <div className="relative z-[2] flex items-center justify-between">
        <strong className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[14px] font-semibold">{today}<span className="hidden 2xl:contents"><Demo dark /></span></strong>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/kalender" className="h-[26px] whitespace-nowrap rounded-full border border-pf-white/20 px-3.5 text-[11px] leading-[24px] text-[var(--pf-ddd)] hover:bg-pf-white/10">I dag</Link>
          <button type="button" aria-label="Forrige dag" className="grid size-8 place-items-center rounded-full bg-pf-white/10 text-[var(--pf-ddd)] hover:bg-pf-white/20"><CaretLeftIcon size={13} weight="bold" /></button>
          <button type="button" aria-label="Næste dag" className="grid size-8 place-items-center rounded-full bg-pf-white/10 text-[var(--pf-ddd)] hover:bg-pf-white/20"><CaretRightIcon size={13} weight="bold" /></button>
        </div>
      </div>
      {/* Below 2xl the "Eksempeldata" badge sits bottom-left, so it never runs into "I dag" (Marco 2026-11-15). */}
      <span className="absolute bottom-3 left-4 z-[3] 2xl:hidden"><Demo dark /></span>
      <div className="absolute inset-x-4 bottom-0 top-[58px] z-[1]">
        <div className="relative z-[2] flex justify-between pl-1 pr-1.5 text-[10px] text-pf-white/70">{["8", "10", "12", "14", "16", "18"].map((x) => <span key={x}>{x}</span>)}</div>
        <div className="absolute bottom-[30px] left-1 right-1.5 top-5 flex justify-between">{Array.from({ length: 6 }, (_, i) => <i key={i} className="border-l border-dashed border-pf-white/[0.08]" />)}</div>
        {events.map((e) => (
          <Link key={e.t} href={e.href} className={`absolute z-[2] rounded-[6px] px-2 py-1.5 leading-[1.25] shadow-[0_6px_16px_rgba(0,0,0,.25)] transition hover:-translate-y-0.5 ${e.c}`} style={{ left: `${e.l}%`, width: `${e.w}%`, top: e.top }}>
            <b className="block truncate text-[10.5px] font-semibold">{e.t}</b><span className="mt-0.5 block whitespace-nowrap text-[9px] opacity-80">{e.s}</span>
          </Link>
        ))}
      </div>
      <svg aria-hidden viewBox="0 0 340 90" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-[90px] w-full"><path d="M0 60 L40 42 L70 52 L110 26 L150 48 L185 36 L220 54 L262 30 L300 50 L340 40 V90 H0z" fill="var(--pf-362c28)" /><path d="M0 74 L50 58 L95 68 L140 52 L190 70 L240 56 L290 70 L340 60 V90 H0z" fill="var(--pf-2a221f)" /></svg>
    </div>
  );
}

// Øvetid · version C, chosen by Marco 2026-11-02 (no clock icon): time split by tool, plus the next task.
function Oevetid({ nextTask }: { nextTask: OversigtData["nextTask"] }) {
  const tools = [
    { n: "ChatGPT", m: 95, c: "var(--pf-e2643f)" },
    { n: "Copilot", m: 80, c: "var(--pf-8a4e3b)" },
    { n: "Claude", m: 45, c: "var(--pf-f6b49b)" },
  ];
  const total = tools.reduce((n, t) => n + t.m, 0);
  return (
    <div className={`${card} flex min-h-[230px] flex-col`}>
      <CardHead title="Øvetid" sub="Fordelt på værktøjer" demo />
      <p className="mt-3 flex items-baseline gap-2"><strong className="text-[28px] font-semibold tracking-[-0.03em] text-heading">3 t 40 m</strong><span className="text-[12px] font-semibold text-[var(--pf-3fae72)]">↑ 28 %</span></p>
      <div className="mt-2 flex h-2.5 overflow-hidden rounded-full">{tools.map((t) => <span key={t.n} style={{ width: `${(t.m / total) * 100}%`, background: t.c }} />)}</div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {tools.map((t) => (
          <li key={t.n}>
            <p className="flex items-center gap-1.5 text-[11px] text-pf-muted"><i className="size-2 rounded-full" style={{ background: t.c }} />{t.n}</p>
            <p className="text-[13px] font-semibold text-heading">{Math.floor(t.m / 60)} t {t.m % 60} m</p>
          </li>
        ))}
      </ul>
      {nextTask ? (
        <Link href={nextTask.href} className="mt-auto flex items-center justify-between gap-2 rounded-[10px] bg-[var(--pf-f7f2ee)] px-3 py-2 text-[11.5px] text-heading hover:bg-[var(--pf-f1e9e4)]">
          <span className="truncate">Næste opgave: <b className="font-semibold">{nextTask.title}</b> · {nextTask.minutes} min</span><ArrowRightIcon size={13} weight="bold" className="shrink-0" />
        </Link>
      ) : (
        <Link href="/sandkasse" className="mt-auto flex items-center justify-between gap-2 rounded-[10px] bg-[var(--pf-f7f2ee)] px-3 py-2 text-[11.5px] text-heading hover:bg-[var(--pf-f1e9e4)]">
          <span className="truncate">Åbn øvemiljøet</span><ArrowRightIcon size={13} weight="bold" className="shrink-0" />
        </Link>
      )}
    </div>
  );
}


// Seneste feedback (Marco 2026-11-02, chosen over all Fokuskort versions): the last scored task from the øvemiljø,
// what went well and what to do better. Real: the learner's latest finished module attempt (score, step counts).
// Without any attempt yet the approved example is shown, marked "Eksempeldata".
const EXAMPLE_FEEDBACK: NonNullable<OversigtData["feedback"]> = {
  title: "Hvad må du dele?",
  score: 92,
  when: "i går",
  href: "/moduler",
  good: ["Du fjernede alle navne", "Du så CPR-nummeret", "Kort og klar begrundelse"],
  better: ["Tjek også adresser i fritekst", "Skriv hvorfor, ikke kun hvad"],
};
function Fokuskort({ feedback }: { feedback: OversigtData["feedback"] }) {
  const f = feedback ?? EXAMPLE_FEEDBACK;
  return (
    <div className={`${card} flex min-h-[200px] flex-col`}>
      <div className="flex items-start justify-between gap-3">
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Seneste feedback</h4><small className="mt-px block text-[11.5px] text-pf-muted">Fra øvemiljøet · {f.when}</small></div>
        <div className="flex items-center gap-2">
          {!feedback && <Demo />}
          <Link href={f.href} className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-[8px] bg-[var(--pf-f3eeeb)] px-3 text-[11.5px] font-medium text-heading hover:bg-[var(--pf-ebe4e0)]">Se opgaven <ArrowRightIcon size={12} /></Link>
        </div>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-[170px_1fr_1fr]">
        <div className="flex flex-col justify-between rounded-[12px] p-3.5 text-pf-white" style={{ background: "linear-gradient(140deg, var(--pf-3a2722) 0%, var(--pf-201613) 100%)" }}>
          <p className="text-[11px] leading-snug text-pf-white/70">{f.title}</p>
          <p className="flex items-baseline gap-1"><span className="text-[34px] font-semibold leading-none tracking-[-0.04em]">{f.score}</span><span className="text-[12px] text-pf-white/60">/ 100</span></p>
          <span className="w-fit rounded-full bg-[var(--pf-e2643f)] px-2 py-0.5 text-[10px] font-semibold">{f.score >= 80 ? "Flot klaret" : "Bestået"}</span>
        </div>
        <div className="rounded-[12px] bg-[var(--pf-f7f2ee)] p-3.5">
          <p className="text-[11px] font-semibold text-heading">Det gik godt</p>
          <ul className="mt-2 grid gap-1.5 text-[11.5px] text-heading">
            {f.good.map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full bg-[var(--pf-5cbf8f)] text-pf-white"><CheckIcon size={9} weight="bold" /></span>{t}</li>)}
          </ul>
        </div>
        <div className="rounded-[12px] border border-[var(--pf-f1e6df)] p-3.5">
          <p className="text-[11px] font-semibold text-heading">Gør det endnu bedre</p>
          <ul className="mt-2 grid gap-1.5 text-[11.5px] text-heading">
            {f.better.map((t) => <li key={t} className="flex items-start gap-1.5"><span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-full bg-[var(--pf-e2643f)] text-pf-white"><ArrowUpRightIcon size={9} weight="bold" /></span>{t}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Fremskridt · version A, chosen by Marco 2026-11-02: all lessons in one ring, the three states as counts.
// Real: forløb lessons that can be opened today; "I gang" = open lessons in courses the learner has started.
function Praestation({ progress }: { progress: OversigtData["progress"] }) {
  const { total, done, started } = progress;
  const seg = [{ v: done, c: "var(--pf-5cbf8f)", l: "Gennemført" }, { v: started, c: "var(--pf-e2643f)", l: "I gang" }, { v: total - done - started, c: "var(--pf-efe6e1)", l: "Ikke startet" }];
  const R = 44, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className={`${card} flex min-h-[200px] flex-col`}>
      <CardHead title="Fremskridt" sub={`${total} lektioner i alt`} />
      <div className="mt-2 flex flex-1 items-center gap-5">
        <div className="relative size-[112px] shrink-0">
          <svg viewBox="0 0 104 104" className="size-full -rotate-90">
            {seg.map((x) => { const len = total ? (x.v / total) * C : 0; const el = <circle key={x.l} cx="52" cy="52" r={R} fill="none" stroke={x.c} strokeWidth="10" strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} />; acc += len; return el; })}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[24px] font-semibold tracking-[-0.03em] text-heading">{total ? Math.round((done / total) * 100) : 0}%</strong><small className="text-[10px] text-pf-muted">gennemført</small></div>
        </div>
        <ul className="grid flex-1 gap-2.5">
          {seg.map((x) => <li key={x.l} className="flex items-center gap-2 text-[12px]"><i className="size-2.5 rounded-full" style={{ background: x.c }} /><span className="flex-1 text-pf-muted">{x.l}</span><b className="font-semibold tabular-nums text-heading">{x.v}</b></li>)}
        </ul>
      </div>
    </div>
  );
}

// Real: days with a finished lesson or module attempt (this week Mon–Sun, and the current run of days).
function Streak({ streak }: { streak: OversigtData["streak"] }) {
  const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  const title = streak.days > 1 ? `Du har øvet ${streak.days} dage i træk!` : streak.days === 1 ? "Du har øvet i dag. Godt gået!" : "Tag 10 minutter i dag";
  return (
    <section className="flex min-h-[72px] flex-wrap items-center gap-3.5 rounded-[16px] bg-pf-white px-4 py-3.5">
            <div><strong className="text-[15px] font-semibold tracking-[-0.01em] text-heading">{title}</strong><small className="mt-0.5 block text-[11.5px] text-pf-muted">Bliv ved. Det er vanen, der gør forskellen.</small></div>
      <div className="ml-auto mr-14 flex gap-4">{days.map((d, i) => (
        <div key={d} className="flex flex-col items-center gap-1 text-[10.5px] text-[var(--pf-444)]">
          <i className={`grid size-8 place-items-center rounded-full ${streak.week[i] ? "bg-[var(--pf-fde8dc)] text-[var(--coral)]" : "bg-[var(--pf-f1f1f1)] text-[var(--pf-cdcdcd)]"}`}><FireIcon size={17} weight="fill" /></i>{d}
        </div>
      ))}</div>
      <Link href="/sandkasse" className="inline-flex h-[42px] items-center gap-2.5 rounded-full bg-[var(--ink)] px-5 text-[14px] font-semibold text-pf-white transition hover:-translate-y-px">Fortsæt med at øve <ArrowRightIcon size={15} weight="bold" /></Link>
    </section>
  );
}

export function Oversigt({ data }: { data: OversigtData }) {
  return (
    // Cream page background like the website (var(--pf-f7f2ee)) behind the whole dashboard, so the white cards stand out
    // with a clear edge, and the cards fill the full width (Marco 2026-11-02).
    // xl: the dashboard fills the window from under the top bar to the bottom (Marco: "fra bunden til toppen"), but on
    // short screens the rows grow to their content and the page scrolls instead of cutting cards off (Marco 2026-11-15).
    <div data-pf-cream data-pf-fill className="flex flex-col gap-3 xl:grid xl:min-h-[max(720px,calc(100svh-5.9rem))] xl:grid-rows-[minmax(min-content,284fr)_minmax(min-content,230fr)_minmax(min-content,200fr)_auto]">
      <section className="grid min-h-0 gap-3 xl:grid-cols-[2.45fr_1fr] [&>*]:min-h-[284px]"><Hero greeting={data.greeting} href={data.continueHref} /><Calendar today={data.today} /></section>
      <section className="grid min-h-0 gap-3 xl:grid-cols-[1fr_1.76fr] [&>*]:min-h-[230px]"><Oevetid nextTask={data.nextTask} /><MineKurser courses={data.courses} className="min-h-[230px]" /></section>
      <section className="grid min-h-0 gap-3 xl:grid-cols-[1.76fr_1fr] [&>*]:min-h-[200px]"><Fokuskort feedback={data.feedback} /><Praestation progress={data.progress} /></section>
      <Streak streak={data.streak} />
    </div>
  );
}
