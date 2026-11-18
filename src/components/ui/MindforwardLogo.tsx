import { BrainIcon } from "@phosphor-icons/react/dist/ssr";

// Mindforward logo (Marco's brand, as in ai-skabelon): duotone brain + "Forward" wordmark.
// On this site the brain is orange (Marco 2026-10-22) to match the warm palette; the word is white.
export function MindforwardLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={`flex items-center gap-1.5 text-white ${className}`}>
      <BrainIcon weight="duotone" size={size} className="brain-pulse shrink-0 text-[oklch(0.7_0.17_40)]" aria-hidden />
      <span className="whitespace-nowrap font-extrabold leading-none tracking-[-0.03em]" style={{ fontSize: `min(${Math.round(size * 0.8)}px, 6vw)` }}>Forward</span>
    </span>
  );
}
