"use client";

// Charts ported 1:1 from Marco's CampusHub reference (same algorithms, same seeds, same sizes), in our colours.
// They measure their box like the reference does, so dots stay round and bars stay sharp at every width.
import { useEffect, useRef, useState } from "react";

const CORAL = "var(--coral)";

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setS({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, s] as const;
}

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// Catmull-Rom → cubic bezier, as in the reference.
function smooth(pts: [number, number][]) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export function FocusArea() {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const ys = [0.86, 0.84, 0.78, 0.8, 0.62, 0.3, 0.16, 0.24, 0.52, 0.72, 0.74, 0.6];
  const pts = ys.map((y, i) => [(i / (ys.length - 1)) * w, 14 + y * (h - 18)] as [number, number]);
  const line = w ? smooth(pts) : "";
  return (
    <div ref={ref} className="absolute inset-x-0 bottom-0 h-[120px] overflow-hidden rounded-b-[16px]">
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CORAL} stopOpacity=".38" /><stop offset="1" stopColor={CORAL} stopOpacity="0" /></linearGradient></defs>
          <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#fg)" />
          <path d={line} fill="none" stroke={CORAL} strokeWidth="1.8" />
        </svg>
      )}
    </div>
  );
}

const rhythmBars = (() => {
  const rand = rng(11);
  const n = 84, out: { x: number; h: number; hot: boolean }[] = [];
  const peaks = [{ c: 0.17, s: 0.03, a: 3.6 }, { c: 0.645, s: 0.032, a: 4.4 }];
  for (let i = 0; i < n; i++) {
    const x = (i + 0.5) / n;
    let boost = 0;
    peaks.forEach((p) => (boost += p.a * Math.exp(-((x - p.c) ** 2) / (2 * p.s * p.s))));
    const base = 2.1 + rand() * 1.9 + Math.sin(i * 0.9) * 0.4;
    out.push({ x, h: Math.min(7.6, base + boost * (0.75 + rand() * 0.35)), hot: boost > 1.1 });
  }
  return out;
})();
const rhythmLine = [4.2, 4.9, 6.2, 4.6, 4.0, 5.0, 4.7, 4.1, 4.9, 6.5, 5.4, 4.0, 5.0, 4.4, 3.8];

export function RhythmPlot() {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const y = (v: number) => h - (v / 8) * h;
  const bw = Math.max(2, (w / rhythmBars.length) * 0.62);
  const pts = rhythmLine.map((v, i) => [(i / (rhythmLine.length - 1)) * w, y(v)] as [number, number]);
  return (
    <div ref={ref} className="relative min-h-0">
      {w > 0 && (
        <svg className="absolute inset-0 size-full overflow-visible" viewBox={`0 0 ${w} ${h}`}>
          <defs><linearGradient id="hot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2643f" /><stop offset="1" stopColor="#f08a64" /></linearGradient></defs>
          {Array.from({ length: 7 }, (_, d) => { const gx = ((d + 0.5) / 7) * w; return <line key={d} x1={gx} x2={gx} y1={0} y2={h} stroke="#efe9e5" strokeDasharray="2 3" />; })}
          {rhythmBars.map((b, i) => <rect key={i} x={b.x * w - bw / 2} y={y(b.h)} width={bw} height={h - y(b.h)} fill={b.hot ? "url(#hot)" : "#ece6e2"} />)}
          <path d={smooth(pts)} fill="none" stroke="var(--ink)" strokeWidth="1.4" />
          {pts.map((p, i) => {
            if (i === 0 || i === pts.length - 1) return null;
            const hot = i === 2 || i === 9;
            if (!hot && i % 2 !== 1) return null;
            return (
              <g key={i}>
                {hot && <circle cx={p[0]} cy={p[1]} r={6} fill={CORAL} opacity={0.18} />}
                <circle cx={p[0]} cy={p[1]} r={hot ? 3.6 : 2.4} fill={hot ? CORAL : "var(--ink)"} stroke="#fff" strokeWidth={hot ? 1.5 : 0} />
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

const blobs = [
  { c: 0.12, r: 0.8, sc: 0.022, sr: 0.2, a: 1.1 }, { c: 0.05, r: 0.55, sc: 0.02, sr: 0.12, a: 0.35 },
  { c: 0.215, r: 0.12, sc: 0.026, sr: 0.2, a: 1.15 }, { c: 0.36, r: 0.65, sc: 0.025, sr: 0.18, a: 0.45 },
  { c: 0.535, r: 0.42, sc: 0.04, sr: 0.3, a: 1.25 }, { c: 0.71, r: 0.28, sc: 0.022, sr: 0.3, a: 1.05 },
  { c: 0.835, r: 0.12, sc: 0.024, sr: 0.22, a: 1.15 }, { c: 0.965, r: 0.75, sc: 0.02, sr: 0.24, a: 1.15 },
  { c: 0.66, r: 0.85, sc: 0.02, sr: 0.12, a: 0.4 },
];
export function FocusMap() {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const rows = 9, step = h / rows, cols = w && step ? Math.floor(w / (step * 0.92)) : 0;
  const dot = Math.min(step * 0.7, 6.2);
  const rand = rng(23);
  const cells: { x: number; y: number; f: string }[] = [];
  for (let ci = 0; ci < cols; ci++) for (let ri = 0; ri < rows; ri++) {
    const c = ci / (cols - 1), r = ri / (rows - 1);
    let v = 0;
    blobs.forEach((b) => (v += b.a * Math.exp(-(((c - b.c) ** 2) / (2 * b.sc * b.sc) + ((r - b.r) ** 2) / (2 * b.sr * b.sr)))));
    v += (rand() - 0.5) * 0.22;
    cells.push({ x: (ci + 0.5) * (w / cols), y: (ri + 0.5) * step, f: v > 0.68 ? "#e2643f" : v > 0.4 ? "#f6b49b" : v > 0.17 ? "#f9dccb" : "#f3efec" });
  }
  return (
    <div ref={ref} className="relative min-h-0">
      {cols > 0 && <svg className="absolute inset-0 size-full" viewBox={`0 0 ${w} ${h}`}>{cells.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={dot / 2} fill={p.f} />)}</svg>}
    </div>
  );
}

export function Rings({ data }: { data: { v: number; label: string; color: string; track: string }[] }) {
  const R = 46, C = 2 * Math.PI * R;
  const [on, setOn] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true))); return () => cancelAnimationFrame(id); }, []);
  return (
    <div className="mt-5 flex items-center justify-between px-1.5">
      {data.map((d) => (
        <div key={d.label} className="relative size-[104px]">
          <svg viewBox="0 0 104 104" className="size-full -rotate-90">
            <circle cx="52" cy="52" r={R} fill="none" stroke={d.track} strokeWidth="4" />
            <circle cx="52" cy="52" r={R} fill="none" stroke={d.color} strokeWidth="4.5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={on ? C * (1 - d.v / 100) : C} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.2,.7,.2,1)" }} />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center"><strong className="text-[21px] font-semibold tracking-[-0.02em] text-heading">{d.v}%</strong><small className="text-[10.5px] text-muted">{d.label}</small></div>
        </div>
      ))}
    </div>
  );
}
