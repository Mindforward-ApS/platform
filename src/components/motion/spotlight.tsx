"use client";

import { useEffect } from "react";

/** One pointer listener for every [data-spot] card (website spotlight). Renders nothing. */
export function Spotlight() {
  useEffect(() => {
    if (!matchMedia("(hover: hover)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-spot]");
      if (!(el instanceof HTMLElement)) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    addEventListener("pointermove", onMove, { passive: true });
    return () => removeEventListener("pointermove", onMove);
  }, []);
  return null;
}
