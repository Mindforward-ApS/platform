// Preview: three versions of the "Læringsrytme" card (Marco 2026-11-02). Same size as the card on /ny-oversigt at
// 1440 px (about 730 × 230), same header style without an icon (like the chosen Øvetid card). Example data.
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr";

const O = "#e2643f", O2 = "#f6b49b", O3 = "#fadccd", LINE = "#efe9e5";
const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

function Head({ sub, right }: { sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div><h4 className="text-[15.5px] font-semibold leading-[1.2] tracking-[-0.01em] text-heading">Læringsrytme</h4><small className="mt-px block text-[11.5px] text-muted">{sub}</small></div>
      {right ?? <span className="inline-flex h-7 items-center gap-1.5 rounded-[8px] bg-[#f3eeeb] pl-3 pr-2 text-[11.5px] font-medium text-heading">Denne uge <CaretDownIcon size={12} /></span>}
    </div>
  );
}
const shell = "relative flex h-[230px] w-[730px] max-w-full flex-col overflow-hidden rounded-[16px] bg-white px-[18px] pb-4 pt-[18px]";

/* A · Dag for dag: minutes per day as bars, the score as a line on top, the best day called out. */
function VersionA() {
  const mins = [24, 52, 18, 61, 38, 0, 12];
  const score = [72, 78, 76, 84, 86, 86, 87];
  const best = 3, H = 110, W = 694;
  const x = (i: number) => (i + 0.5) * (W / 7);
  const ys = (v: number) => 8 + (1 - (v - 60) / 40) * (H - 16);
  return (
    <div className={shell}>
      <Head sub="Minutter og score pr. dag" />
      <div className="relative mt-3 flex-1">
        <div className="absolute inset-x-0 bottom-5 top-0 grid grid-cols-7 items-end gap-5 px-3">
          {mins.map((m, i) => (
            <div key={i} className="relative flex h-full flex-col justify-end">
              {i === best && <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--ink)] px-2 py-0.5 text-[10px] font-semibold text-white">Bedste dag · {m} min</span>}
              <span className="rounded-t-[6px]" style={{ height: `${Math.max(3, (m / 70) * 78)}%`, background: i === best ? O : m ? O2 : LINE }} />
            </div>
          ))}
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-x-0 bottom-5 top-0 h-[calc(100%-1.25rem)] w-full overflow-visible">
          <polyline points={score.map((v, i) => `${x(i)},${ys(v)}`).join(" ")} fill="none" stroke="var(--ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>
        {score.map((v, i) => <span key={i} className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--ink)]" style={{ left: `${((i + 0.5) / 7) * 100}%`, top: `calc(${(ys(v) / H) * 100}% * (1 - 20 / 158))` }} />)}
        <div className="absolute inset-x-0 bottom-0 grid grid-cols-7 px-3 text-center text-[11px] text-muted">{days.map((d) => <span key={d}>{d}</span>)}</div>
      </div>
      <div className="mt-1 flex gap-4 text-[10.5px] text-muted"><span className="flex items-center gap-1.5"><i className="size-2 rounded-[2px]" style={{ background: O2 }} />Minutter</span><span className="flex items-center gap-1.5"><i className="h-[2px] w-3 bg-[var(--ink)]" />Score</span></div>
    </div>
  );
}

/* B · Hvornår på dagen: each day as a row, practice sessions as pills on a 8–18 time axis. */
function VersionB() {
  const sessions: [number, number, boolean?][][] = [
    [[8.5, 9]], [[8.25, 9.1, true], [13, 13.5]], [[16, 16.3]], [[8.5, 9.3, true], [12.2, 12.6]], [[9, 9.4], [15, 15.3]], [], [[10, 10.2]],
  ];
  const pos = (h: number) => ((h - 8) / 10) * 100;
  return (
    <div className={shell}>
      <Head sub="Hvornår på dagen du øver" />
      <div className="mt-2 grid min-h-0 flex-1 grid-cols-[34px_1fr] gap-x-2">
        <div className="grid grid-rows-7 text-[10.5px] text-muted">{days.map((d) => <span key={d} className="self-center">{d}</span>)}</div>
        <div className="relative grid grid-rows-7">
          {[8, 10, 12, 14, 16, 18].map((h) => <i key={h} className="absolute inset-y-0 border-l border-dashed" style={{ left: `${pos(h)}%`, borderColor: LINE }} />)}
          {sessions.map((row, d) => (
            <div key={d} className="relative">
              {row.map(([a, b, hot], k) => <span key={k} className="absolute top-1/2 h-[11px] -translate-y-1/2 rounded-full" style={{ left: `${pos(a)}%`, width: `${Math.max(1.6, pos(b) - pos(a))}%`, background: hot ? O : O2 }} />)}
            </div>
          ))}
        </div>
        <div />
        <div className="relative mt-1 h-3 text-[10px] text-muted">{[8, 10, 12, 14, 16, 18].map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: `${pos(h)}%` }}>{h}</span>)}</div>
      </div>
      <p className="mt-1.5 shrink-0 rounded-[8px] bg-[#f7f2ee] px-3 py-1 text-[11px] text-heading">Du lærer bedst <b className="font-semibold">om morgenen, mellem 8 og 9</b>. Sæt et fast tidspunkt i kalenderen.</p>
    </div>
  );
}

/* C · Fire uger: a calendar of the last four weeks, each day coloured by minutes practised. */
function VersionC() {
  const weeks = [
    [12, 0, 25, 30, 18, 0, 0], [20, 34, 0, 41, 22, 0, 8], [28, 45, 15, 52, 30, 0, 0], [24, 52, 18, 61, 38, 0, 12],
  ];
  const col = (m: number) => (m >= 40 ? O : m >= 20 ? O2 : m > 0 ? O3 : "#f3efec");
  return (
    <div className={shell}>
      <Head sub="De sidste fire uger" right={<span className="text-[11.5px] text-muted">Oktober</span>} />
      <div className="mt-3 flex flex-1 gap-6">
        <div className="grid flex-1 grid-cols-[48px_repeat(7,1fr)] content-between gap-y-1.5">
          <span />{days.map((d) => <span key={d} className="text-center text-[10.5px] text-muted">{d}</span>)}
          {weeks.map((w, wi) => (
            <div key={wi} className="contents">
              <span className="self-center text-[10.5px] text-muted">Uge {40 + wi}</span>
              {w.map((m, di) => <span key={di} className="mx-auto h-[26px] w-full max-w-[52px] rounded-[7px]" style={{ background: col(m), outline: wi === 3 && di === 4 ? "2px solid var(--ink)" : undefined, outlineOffset: 1 }} title={`${m} min`} />)}
            </div>
          ))}
        </div>
        <div className="flex w-[150px] shrink-0 flex-col justify-between border-l pl-5" style={{ borderColor: LINE }}>
          <div><p className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-heading">19</p><p className="mt-1 text-[11px] text-muted">dage med øvelse</p></div>
          <div><p className="text-[26px] font-semibold leading-none tracking-[-0.03em] text-heading">31 min</p><p className="mt-1 text-[11px] text-muted">i snit pr. øvedag</p></div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted">Lidt {["#f3efec", O3, O2, O].map((c) => <i key={c} className="size-2.5 rounded-[3px]" style={{ background: c }} />)} Meget</div>
        </div>
      </div>
    </div>
  );
}

export default function LaeringsrytmeForslag() {
  const items = [
    { t: "A · Dag for dag", d: "Minutter pr. dag som søjler og scoren som linje. Bedste dag er fremhævet.", n: <VersionA /> },
    { t: "B · Hvornår på dagen", d: "Hver dag som en række, øvelserne som streger på et døgn fra 8 til 18. Med et tip om bedste tidspunkt.", n: <VersionB /> },
    { t: "C · Fire uger", d: "En kalender over fire uger, farvet efter hvor meget du har øvet. Med dage og snit.", n: <VersionC /> },
  ];
  return (
    <div data-dash-cream>
      <style>{`.app:has([data-dash-cream]), body:has([data-dash-cream]) { background: #f7f2ee; }`}</style>
      <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em] text-heading">Læringsrytme · 3 versioner</h1>
      <p className="mt-1 text-[0.8125rem] text-muted">Samme størrelse som kortet på det nye dashboard. Alle tal er eksempler.</p>
      <div className="mt-6 grid gap-8">
        {items.map((it) => (
          <section key={it.t} className="grid content-start gap-2">
            <div><p className="text-[0.9375rem] font-semibold text-heading">{it.t}</p><p className="text-[0.75rem] text-muted">{it.d}</p></div>
            {it.n}
          </section>
        ))}
      </div>
    </div>
  );
}
