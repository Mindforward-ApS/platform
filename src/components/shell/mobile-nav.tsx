"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

/** Phone menu: the server-rendered sidebar slides in as a drawer. Closes on any link click, Escape or the backdrop. */
export function MobileNav({ bar, openLabel, closeLabel, children }: { bar: ReactNode; openLabel: string; closeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur-md">
        {bar}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-label={openLabel}
          className="grid size-9 place-items-center rounded-md text-ink-muted hover:bg-sunken hover:text-ink"
        >
          <Icon name="menu" size={18} />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={openLabel}>
          <button type="button" aria-label={closeLabel} className="absolute inset-0 bg-night/40" onClick={() => setOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 flex w-[min(300px,86vw)] flex-col overflow-y-auto bg-bg shadow-lg"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={closeLabel}
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-md text-ink-muted hover:bg-sunken hover:text-ink"
            >
              <Icon name="x" size={18} />
            </button>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
