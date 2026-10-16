import { cx } from "./primitives";

// Design v3 bar chart (platform preview "Bestået pr. uge"): rounded green bars on a 0/mid/max axis, the latest week
// with data highlighted with a dot and a dark tooltip. Server-rendered CSS; the numbers are also in a hidden table.

export interface WeekBar {
  key: string;
  label: string;
  longLabel: string;
  value: number;
  /** Extra tooltip rows for the highlighted bar, e.g. [["Gns. score", "86 %"]]. */
  details?: [string, string][];
}

function niceMax(max: number): number {
  if (max <= 2) return 2;
  if (max <= 10) return Math.ceil(max / 2) * 2;
  const step = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / (step / 2)) * (step / 2);
}

export function WeekChart({ bars, summary, valueLabel, weekLabel }: { bars: WeekBar[]; summary: string; valueLabel: string; weekLabel: string }) {
  const max = niceMax(Math.max(0, ...bars.map((b) => b.value)));
  const hot = bars.findLastIndex((b) => b.value > 0);
  return (
    <figure className="m-0 flex flex-col gap-2">
      <div role="img" aria-label={summary} className="relative grid h-56 grid-cols-[1.75rem_minmax(0,1fr)] gap-2 pt-14">
        <div aria-hidden="true" className="flex flex-col justify-between pb-6 text-caption font-normal text-ink-muted tabular-nums">
          <span>{max}</span>
          <span>{max / 2}</span>
          <span>0</span>
        </div>
        <div aria-hidden="true" className="grid items-end gap-1.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((b, i) => {
            const pct = (b.value / max) * 100;
            const isHot = i === hot;
            return (
              <div key={b.key} className="relative flex h-full flex-col items-center justify-end gap-2">
                {/* The tooltip sits above the plot (in the reserved top band), aligned with the highlighted week. */}
                {isHot && (
                <span
                  className={cx(
                    "absolute bottom-full z-10 mb-1 grid min-w-max grid-cols-[auto_auto] gap-x-5 gap-y-1 rounded-xl bg-chart-tip px-3.5 py-2.5 text-caption text-on-chart-tip shadow-md",
                    i >= bars.length - 3 ? "right-0" : i <= 1 ? "left-0" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <span className="font-normal opacity-80">{valueLabel}</span>
                  <b className="tabular-nums">{b.value}</b>
                  {b.details?.map(([k, v]) => (
                    <span key={k} className="contents">
                      <span className="font-normal opacity-80">{k}</span>
                      <b className="tabular-nums">{v}</b>
                    </span>
                  ))}
                </span>
                )}
                <span
                  className={cx(
                    "relative w-full max-w-[1.625rem] rounded-full",
                    b.value === 0 ? "bg-seg-off" : isHot ? "bg-chart-bar-hot" : "bg-chart-bar",
                  )}
                  style={{ height: b.value === 0 ? "0.375rem" : `max(0.75rem, calc(${pct}% - 1.5rem))` }}
                >
                  {isHot && (
                    <span className="absolute -top-1.5 left-1/2 size-3 -translate-x-1/2 rounded-full border-[3px] border-chart-bar-hot bg-surface" />
                  )}
                </span>
                {/* Every other week is labelled so the axis stays legible in a narrow card; the table has all of them. */}
                <small className="h-4 text-[0.6875rem] leading-4 whitespace-nowrap text-ink-muted">{(bars.length - 1 - i) % 2 === 0 ? b.label : ""}</small>
              </div>
            );
          })}
        </div>
      </div>
      <table className="sr-only">
        <caption>{summary}</caption>
        <thead>
          <tr>
            <th scope="col">{weekLabel}</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {bars.map((b) => (
            <tr key={b.key}>
              <th scope="row">{b.longLabel}</th>
              <td>{b.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
