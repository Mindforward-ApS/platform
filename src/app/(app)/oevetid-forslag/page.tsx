// Preview: three versions of the "Øvetid" card for the new dashboard (Marco 2026-11-02). Same size as the card on
// /ny-oversigt at 1440 px (about 420 × 230), same header and type scale. Example data.
import Link from "next/link";
import { CaretDownIcon, ClockIcon, ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

const ORANGE = "#e2643f";

function CardHead({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-[var(--ink)] text-white"><ClockIcon size={17} weight="bold" /></span>
        <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">{title}</h4><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      </div>
      {right ?? <span className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-[#f3eeeb] pl-3 pr-2 text-[11.5px] font-medium text-heading">Denne uge <CaretDownIcon size={12} /></span>}
    </div>
  );
}

const shell = "relative h-[230px] w-[420px] max-w-full overflow-hidden rounded-[16px] bg-white px-[18px] pb-4 pt-[18px]";

/* A · Ugemål: a ring towards the weekly goal, with the days under it. */
function VersionA() {
  const goal = 300, done = 220, R = 40, C = 2 * Math.PI * R;
  const days = [["M", 34], ["T", 52], ["O", 18], ["T", 61], ["F", 55], ["L", 0], ["S", 0]] as const;
  return (
    <div className={shell}>
      <CardHead title="Øvetid" sub="Dit ugemål: 5 timer" />
      <div className="mt-4 flex items-center gap-5">
        <div className="relative size-[96px] shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90"><circle cx="50" cy="50" r={R} fill="none" stroke="#fbe1d7" strokeWidth="9" /><circle cx="50" cy="50" r={R} fill="none" stroke={ORANGE} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(done / goal) * C} ${C}`} /></svg>
          <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[19px] font-semibold tracking-[-0.02em] text-heading">73%</strong><small className="text-[10px] text-muted">af målet</small></div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2"><strong className="text-[26px] font-semibold tracking-[-0.03em] text-heading">3 t 40 m</strong><span className="text-[12px] font-semibold text-[#3fae72]">↑ 28 %</span></p>
          <p className="text-[11px] text-muted">1 t 20 m tilbage til målet</p>
          <div className="mt-3 flex items-end gap-1.5">
            {days.map(([d, m], i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="w-full rounded-[3px]" style={{ height: Math.max(4, (m / 61) * 36), background: m ? (i === 4 ? ORANGE : "#f6b49b") : "#efe9e5" }} />
                <span className={`text-[10px] ${i === 4 ? "font-semibold text-heading" : "text-muted"}`}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* B · Denne uge mod sidste uge: two curves, this week filled. */
function VersionB() {
  const now = [20, 34, 30, 52, 61, 58, 66], last = [14, 22, 26, 30, 36, 34, 40];
  const W = 384, H = 92, pt = (a: number[]) => a.map((v, i) => [(i / 6) * W, H - (v / 70) * H] as const);
  const path = (a: number[]) => pt(a).map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  return (
    <div className={shell}>
      <CardHead title="Øvetid" sub="Denne uge mod sidste uge" />
      <div className="mt-3 flex items-end justify-between">
        <div><p className="flex items-baseline gap-2"><strong className="text-[28px] font-semibold tracking-[-0.03em] text-heading">3 t 40 m</strong><span className="text-[12px] font-semibold text-[#3fae72]">↑ 28 %</span></p></div>
        <div className="flex gap-3 text-[10.5px] text-muted"><span className="flex items-center gap-1.5"><i className="h-[3px] w-3 rounded" style={{ background: ORANGE }} />Denne uge</span><span className="flex items-center gap-1.5"><i className="h-[3px] w-3 rounded border-t border-dashed border-[#9a8f8a]" />Sidste uge</span></div>
      </div>
      <svg viewBox={`0 -6 ${W} ${H + 8}`} preserveAspectRatio="none" className="mt-2 h-[76px] w-full overflow-visible">
        <defs><linearGradient id="vb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={ORANGE} stopOpacity=".3" /><stop offset="1" stopColor={ORANGE} stopOpacity="0" /></linearGradient></defs>
        <path d={`${path(now)} L${W},${H} L0,${H} Z`} fill="url(#vb)" />
        <path d={path(last)} fill="none" stroke="#9a8f8a" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        <path d={path(now)} fill="none" stroke={ORANGE} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted">{["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"].map((d) => <span key={d}>{d}</span>)}</div>
    </div>
  );
}

/* C · Fordelt på værktøjer: where the time went, plus the next task. */
function VersionC() {
  const tools = [
    { n: "ChatGPT", m: 95, c: ORANGE },
    { n: "Copilot", m: 80, c: "#8a4e3b" },
    { n: "Claude", m: 45, c: "#f6b49b" },
  ];
  const total = tools.reduce((s, t) => s + t.m, 0);
  return (
    <div className={`${shell} flex flex-col`}>
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
      <Link href="/oevemiljoe" className="mt-auto flex items-center justify-between rounded-[10px] bg-[#f7f2ee] px-3 py-2 text-[11.5px] text-heading hover:bg-[#f1e9e4]">
        <span>Næste opgave: <b className="font-semibold">Tjek et AI-svar for fejl</b> · 9 min</span><ArrowRightIcon size={13} weight="bold" />
      </Link>
    </div>
  );
}

export default function OevetidForslag() {
  const items = [
    { t: "A · Ugemål", d: "Ring mod et ugemål og dagene under. Motiverer til at nå målet.", n: <VersionA /> },
    { t: "B · Uge mod uge", d: "Denne uge mod sidste uge som to kurver. Viser fremgangen.", n: <VersionB /> },
    { t: "C · Værktøjer", d: "Hvor tiden gik hen (ChatGPT, Copilot, Claude) og næste opgave.", n: <VersionC /> },
  ];
  return (
    <div data-dash-cream className="rounded-[16px] p-1">
      <style>{`.app:has([data-dash-cream]), body:has([data-dash-cream]) { background: #f7f2ee; }`}</style>
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">Øvetid · 3 versioner</h1>
      <p className="mt-1 text-[0.8125rem] text-muted">Samme størrelse som kortet på det nye dashboard. Alle tal er eksempler.</p>
      <div className="mt-6 flex flex-wrap gap-6">
        {items.map((it) => (
          <section key={it.t} className="grid max-w-[420px] content-start gap-2">
            <p className="text-[0.9375rem] font-semibold text-heading">{it.t}</p>
            <p className="min-h-[2.4em] text-[0.75rem] text-muted">{it.d}</p>
            {it.n}
          </section>
        ))}
      </div>
    </div>
  );
}
