import { useId } from "react";

// Øvemiljø icon (Marco 2026-11-15): two speech bubbles, you and the AI, with an AI sparkle in the front one. Drawn on
// Phosphor's 256 grid with its regular stroke so it sits with the other menu icons; "fill" is used for the active item.
const front = "M40 56h112a16 16 0 0 1 16 16v56a16 16 0 0 1-16 16H84l-28 24v-24H40a16 16 0 0 1-16-16V72a16 16 0 0 1 16-16z";
const back = "M200 112h16a16 16 0 0 1 16 16v56a16 16 0 0 1-16 16h-16v24l-28-24h-36a16 16 0 0 1-16-16v-12";
const spark = "M96 82c2 10 6 14 16 16-10 2-14 6-16 16-2-10-6-14-16-16 10-2 14-6 16-16z";

export function PracticeIcon({ size = 18, weight = "regular", className }: { size?: number; weight?: "regular" | "fill"; className?: string }) {
  const id = useId();
  if (weight === "fill") {
    return (
      <svg width={size} height={size} viewBox="0 0 256 256" aria-hidden className={className}>
        <mask id={id}><rect width="256" height="256" fill="#fff" /><path d={spark} fill="#000" stroke="#000" strokeWidth="6" strokeLinejoin="round" /></mask>
        <path d={back} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
        <path d={front} fill="currentColor" stroke="currentColor" strokeWidth="16" strokeLinejoin="round" mask={`url(#${id})`} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={front} />
      <path d={back} />
      <path d={spark} fill="currentColor" strokeWidth="6" />
    </svg>
  );
}
