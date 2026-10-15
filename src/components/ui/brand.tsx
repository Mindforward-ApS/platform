import { BRAND } from "@/lib/i18n/da";

/** The Mindforward mark: a dot and a forward chevron in a rounded tile (design system → Logo). */
export function LogoMark({ size = 24, className = "", tone = "default" }: { size?: number; className?: string; tone?: "default" | "night" }) {
  const tile = tone === "night" ? "fill-on-night" : "fill-ink";
  const chevron = tone === "night" ? "stroke-night" : "stroke-bg";
  const dot = tone === "night" ? "fill-accent" : "fill-mark-dot";
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ width: `${size / 16}rem`, height: `${size / 16}rem` }} aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <rect className={tile} width="64" height="64" rx="16" />
      <circle className={dot} cx="21" cy="32" r="6" />
      <path className={chevron} d="M32 19 L45 32 L32 45" fill="none" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark + lowercase wordmark. `size` is the wordmark's font size in px. */
export function Wordmark({ size = 20, tone = "default", className = "" }: { size?: number; tone?: "default" | "night"; className?: string }) {
  return (
    <span
      className={`inline-flex items-center font-[650] leading-none tracking-[-0.03em] ${tone === "night" ? "text-on-night" : "text-ink"} ${className}`}
      style={{ fontSize: `${size / 16}rem`, gap: "0.4em" }}
    >
      <LogoMark size={Math.round(size * 1.15)} tone={tone} />
      <span>{BRAND.toLowerCase()}</span>
    </span>
  );
}
