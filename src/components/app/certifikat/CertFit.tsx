"use client";
// Scales the A4 certificate (297 × 210 mm = 1123 × 794 px) to the width of its box.
import { useEffect, useRef, useState } from "react";

const W = 1122.5;

export function CertFit({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setS(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className={`relative aspect-[297/210] w-full overflow-hidden ${className}`}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${s})` }}>{children}</div>
    </div>
  );
}
