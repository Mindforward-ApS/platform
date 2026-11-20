import { coverPhoto, illustrationForModule } from "@/lib/config/illustrations";
import { Illustration } from "./illustration";
import { cx } from "./primitives";

// Module covers (Marco 14 Oct 2026, reference: community-app course cards): a soft tinted ground with faint rings,
// the module's 3D clay object on the right and a small chip top-left. Color and object are stable per slug.

const GROUNDS = [
  { ground: "bg-cover-blue", ring: "stroke-cover-blue-ink" },
  { ground: "bg-cover-amber", ring: "stroke-cover-amber-ink" },
  { ground: "bg-cover-mint", ring: "stroke-cover-mint-ink" },
  { ground: "bg-cover-coral", ring: "stroke-cover-coral-ink" },
  { ground: "bg-cover-sky", ring: "stroke-cover-sky-ink" },
] as const;

const BY_MODULE: Record<string, number> = {
  "core-aiact-01": 0,
  "core-data-01": 3,
  "core-fact-01": 1,
  "core-llm-01": 4,
  "core-mail-01": 2,
  "core-meeting-01": 1,
  "core-policy-01": 0,
  "core-prompt-01": 4,
  "core-prompt-02": 3,
};

export function coverGround(seed: string) {
  const known = BY_MODULE[seed];
  if (known !== undefined) return GROUNDS[known]!;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return GROUNDS[h % GROUNDS.length]!;
}

export function ModuleCover({
  seed,
  label,
  className = "",
  size = "md",
  priority = false,
}: {
  seed: string;
  label?: string;
  className?: string;
  size?: "md" | "lg";
  priority?: boolean;
}) {
  const g = coverGround(seed);
  const photo = coverPhoto(seed);
  if (photo) {
    return (
      <div className={cx("relative overflow-hidden bg-sunken", size === "lg" ? "aspect-[2/1] min-h-56" : "aspect-[16/9]", className)} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-optimized WebP from /public */}
        <img src={photo} alt="" loading={priority ? "eager" : "lazy"} decoding="async" className="absolute inset-0 size-full object-cover object-[72%_50%]" />
        {label && (
          <span className="absolute top-3 left-3 inline-flex h-6 items-center rounded-full bg-surface/90 px-2.5 text-caption font-semibold text-ink shadow-xs backdrop-blur-sm">
            {label}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={cx("relative overflow-hidden", size === "lg" ? "min-h-56" : "aspect-[16/9]", g.ground, className)} aria-hidden="true">
      <svg viewBox="0 0 320 180" preserveAspectRatio="xMaxYMid slice" className="absolute inset-0 size-full" fill="none">
        <g className={g.ring} strokeWidth="1.5" opacity=".22">
          <circle cx="250" cy="96" r="54" />
          <circle cx="250" cy="96" r="84" />
          <circle cx="250" cy="96" r="116" />
        </g>
      </svg>
      <Illustration
        name={illustrationForModule(seed)}
        priority={priority}
        className={cx("absolute top-1/2 -translate-y-1/2", size === "lg" ? "right-[8%] h-[78%] max-h-52" : "right-[9%] h-[70%]")}
      />
      {label && (
        <span className="absolute top-3 left-3 inline-flex h-6 items-center rounded-full bg-surface/90 px-2.5 text-caption font-semibold text-ink shadow-xs backdrop-blur-sm">
          {label}
        </span>
      )}
    </div>
  );
}
