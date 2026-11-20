import { BrainIcon } from "@phosphor-icons/react/dist/ssr";

// Mindforward logo (approved platform :3500): duotone brain with a soft heartbeat + "Forward" wordmark, white text.
export function MindforwardLogo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={`flex items-center gap-1.5 text-pf-white ${className}`}>
      <BrainIcon weight="duotone" size={size} className="brain-pulse shrink-0 text-[var(--pf-oklch-0-7-0-17-40)]" aria-hidden />
      <span className="leading-none font-extrabold tracking-[-0.03em] whitespace-nowrap" style={{ fontSize: `min(${Math.round(size * 0.8)}px, 6vw)` }}>
        Forward
      </span>
    </span>
  );
}
