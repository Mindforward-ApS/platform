// Abstract 3D "silk ribbon" for the warm hero (original artwork, generated in code).
// Many thin curves are offset along a twisting path; their spacing and brightness change along the ribbon,
// so it reads as a folding surface with light on one side. Drifts slowly; static under reduced motion.

const W = 1600;
const H = 900;

type Ribbon = { y0: number; rise: number; amp: number; width: number; phase: number; lines: number; light: number; scale: number };

// Two ribbons: a wide main one sweeping up to the right, and a thinner one crossing lower.
const ribbons: Ribbon[] = [
  { y0: 0.88, rise: 0.82, amp: 120, width: 640, phase: 0.1, lines: 90, light: 0.3, scale: 1.25 },
  { y0: 0.78, rise: 0.35, amp: 70, width: 320, phase: 2.2, lines: 44, light: 0.2, scale: 0.75 },
];

function ribbonPath(r: Ribbon, t: number) {
  // A ribbon twisting around its own centre line, projected to 2D: the cross-section rotates by theta,
  // so the visible width follows cos(theta) and the lines slide sideways by sin(theta). No cusps.
  const pts: string[] = [];
  const steps = 90;
  const off = t - 0.5;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const theta = (u - 0.15) * Math.PI * 1.15 + r.phase * 0.3;
    const cx = -150 + u * (W + 300);
    const cy = H * r.y0 - u * H * r.rise + Math.sin(u * Math.PI * 1.4 + r.phase) * r.amp;
    const x = cx + off * r.width * 0.55 * Math.sin(theta);
    const y = cy + off * r.width * Math.cos(theta) + Math.sin(u * 6 + t * 2) * 4;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const paths = ribbons.flatMap((r, ri) =>
  Array.from({ length: r.lines }, (_, k) => {
    const t = k / (r.lines - 1);
    // light falls on one edge of each ribbon, fading across it
    const light = Math.pow(Math.max(0, 1 - Math.abs(t - r.light) / 0.75), 2);
    return { key: `${ri}-${k}`, d: ribbonPath(r, t), o: Number(((0.04 + light * 0.3) * r.scale).toFixed(3)), w: Number(((0.5 + light * 1.1) * r.scale).toFixed(2)), glow: k % 8 === 0 };
  }),
);

// Filled strips between neighbouring offsets: together they form a smooth, shaded surface (the "fluid" variants).
function ribbonPts(r: Ribbon, t: number) {
  return ribbonPath(r, t).slice(1).split("L").map((p) => p.trim());
}
function strip(r: Ribbon, t0: number, t1: number) {
  const a = ribbonPts(r, t0);
  const b = ribbonPts(r, t1).reverse();
  return `M${a.join(" L")} L${b.join(" L")} Z`;
}
const STRIPS = 90;
const strips = ribbons.flatMap((r, ri) =>
  Array.from({ length: STRIPS }, (_, k) => {
    const t0 = k / STRIPS;
    const t1 = (k + 1) / STRIPS;
    const tm = (t0 + t1) / 2;
    const light = Math.pow(Math.max(0, 1 - Math.abs(tm - r.light) / 0.75), 2);
    return { key: `s${ri}-${k}`, d: strip(r, t0, t1 + 0.004), o: Number(((0.05 + light * 0.42) * r.scale).toFixed(3)) };
  }),
);
const edge = ribbons.map((r, ri) => ({ key: `e${ri}`, d: ribbonPath(r, r.light), scale: r.scale }));

export type SilkStyle = "lines" | "silk" | "glow" | "liquid";

export function SilkWave({ className = "", look = "lines" }: { className?: string; look?: SilkStyle }) {
  if (look !== "lines") return <FluidSilk className={className} look={look} />;
  return <LineSilk className={className} />;
}

function Defs() {
  return (
    <linearGradient id="silk-tone" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stopColor="#6b4a40" stopOpacity="0" />
      <stop offset="30%" stopColor="#b08070" />
      <stop offset="55%" stopColor="#f0c8b0" />
      <stop offset="80%" stopColor="#a06a58" />
      <stop offset="100%" stopColor="#5a3a32" stopOpacity="0" />
    </linearGradient>
  );
}

const mask = "linear-gradient(90deg, rgba(0,0,0,0.25) 0%, black 38%, black 62%, rgba(0,0,0,0.35) 82%, rgba(0,0,0,0.2) 100%)";

// Fluid versions: same path, same place, same light-bronze tone, but a continuous surface instead of lines.
function FluidSilk({ className, look }: { className: string; look: Exclude<SilkStyle, "lines"> }) {
  const blur = { silk: 4, glow: 26, liquid: 2.2 }[look];
  const boost = { silk: 1.6, glow: 1.9, liquid: 1.3 }[look];
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <svg className="silk-drift absolute left-1/2 top-1/2 h-[120%] w-[130%]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <Defs />
          <filter id={`fl-${look}`} x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation={blur} /></filter>
          <filter id="fl-sheen" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation={look === "liquid" ? 6 : 18} /></filter>
        </defs>
        <g filter={`url(#fl-${look})`}>
          {strips.map((p) => (
            <path key={p.key} d={p.d} fill="url(#silk-tone)" fillOpacity={Math.min(1, p.o * boost)} />
          ))}
        </g>
        {/* the bright fold: a soft highlight along the lit edge */}
        {look !== "glow" && (
          <g filter="url(#fl-sheen)">
            {edge.map((e) => (
              <path key={e.key} d={e.d} stroke="#ffe2cc" strokeOpacity={look === "liquid" ? 0.55 * e.scale : 0.32 * e.scale} strokeWidth={look === "liquid" ? 10 : 26} />
            ))}
          </g>
        )}
        {look === "liquid" && edge.map((e) => <path key={`c${e.key}`} d={e.d} stroke="#fff3e8" strokeOpacity={0.5 * e.scale} strokeWidth={1.2} />)}
      </svg>
    </div>
  );
}

function LineSilk({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <svg className="silk-drift absolute left-1/2 top-1/2 h-[120%] w-[130%]" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <Defs />
          <filter id="silk-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        {/* soft body of the ribbon */}
        <g filter="url(#silk-glow)" opacity="0.35">
          {paths.filter((p) => p.glow).map((p) => (
            <path key={`g${p.key}`} d={p.d} stroke="url(#silk-tone)" strokeWidth={30} strokeOpacity={p.o} />
          ))}
        </g>
        {/* fine lines */}
        <g>
          {paths.map((p) => (
            <path key={p.key} d={p.d} stroke="url(#silk-tone)" strokeWidth={p.w} strokeOpacity={p.o} />
          ))}
        </g>
      </svg>
    </div>
  );
}

// The same line ribbon as the hero, for reuse on light surfaces (certificate). Read-only export; the hero is unchanged.
export const silkLinePaths = paths;
export const SILK_VIEWBOX = `0 0 ${W} ${H}`;
