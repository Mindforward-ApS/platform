import { cx } from "./primitives";

// Abstract module covers: a soft ground with one strong shape color, built from the brand's shapes
// (ascending steps, dots, discs, arcs). Deterministic per slug, so a module always keeps its cover.

const PALETTES = [
  { ground: "bg-cover-blue", ink: "fill-cover-blue-ink", stroke: "stroke-cover-blue-ink" },
  { ground: "bg-cover-amber", ink: "fill-cover-amber-ink", stroke: "stroke-cover-amber-ink" },
  { ground: "bg-cover-mint", ink: "fill-cover-mint-ink", stroke: "stroke-cover-mint-ink" },
  { ground: "bg-cover-coral", ink: "fill-cover-coral-ink", stroke: "stroke-cover-coral-ink" },
  { ground: "bg-cover-sky", ink: "fill-cover-sky-ink", stroke: "stroke-cover-sky-ink" },
] as const;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Palette = (typeof PALETTES)[number];

/** Each pattern draws in a 320×160 box, right-aligned so the number on the left stays clear. */
function Pattern({ kind, p }: { kind: number; p: Palette }) {
  switch (kind) {
    case 0: // ascending steps: levels 1 → 2 → 3
      return (
        <g className={p.ink}>
          <rect x="176" y="104" width="40" height="72" rx="8" opacity=".35" />
          <rect x="224" y="72" width="40" height="104" rx="8" opacity=".65" />
          <rect x="272" y="32" width="40" height="144" rx="8" />
        </g>
      );
    case 1: // dot grid fading in
      return (
        <g className={p.ink}>
          {Array.from({ length: 5 }, (_, r) =>
            Array.from({ length: 6 }, (_, c) => <circle key={`${r}-${c}`} cx={176 + c * 24} cy={28 + r * 24} r={4} opacity={0.25 + (c / 5) * 0.75} />),
          )}
        </g>
      );
    case 2: // overlapping discs
      return (
        <g className={p.ink}>
          <circle cx="210" cy="96" r="44" opacity=".3" />
          <circle cx="262" cy="70" r="44" opacity=".6" />
          <circle cx="292" cy="128" r="30" />
        </g>
      );
    default: // concentric arcs from the corner
      return (
        <g className={p.stroke} fill="none" strokeWidth="14" strokeLinecap="round">
          <path d="M320 40 a120 120 0 0 0 -120 120" opacity=".3" />
          <path d="M320 76 a84 84 0 0 0 -84 84" opacity=".6" />
          <path d="M320 112 a48 48 0 0 0 -48 48" />
        </g>
      );
  }
}

export function ModuleCover({ seed, label, className = "", size = "md" }: { seed: string; label?: string; className?: string; size?: "md" | "lg" }) {
  const h = hash(seed);
  const p = PALETTES[h % PALETTES.length]!;
  const kind = (h >>> 8) % 4;
  return (
    <div className={cx("relative aspect-[5/2] overflow-hidden", p.ground, className)} aria-hidden="true">
      <svg viewBox="0 0 320 160" preserveAspectRatio={size === "lg" ? "xMaxYMax meet" : "xMaxYMid slice"} className="absolute inset-0 size-full">
        <Pattern kind={kind} p={p} />
      </svg>
      {label && (
        <span className={cx("absolute bottom-3 left-4 font-semibold tracking-[-0.04em] text-ink", size === "lg" ? "text-display" : "text-title-1")}>{label}</span>
      )}
    </div>
  );
}
