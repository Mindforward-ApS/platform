"use client";

import { useState, type ReactNode } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { NavList, type NavItem } from "./sidebar-nav";

// Phone/tablet: the sidebar becomes a full-height drawer from the left.
export function MobileNav({
  items,
  logo,
  promo,
  labels,
}: {
  items: NavItem[];
  logo: ReactNode;
  promo: ReactNode;
  labels: { open: string; close: string; nav: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button aria-label={labels.open} onClick={() => setOpen(true)} className="app-btn app-btn-light !h-9 !w-9 !p-0">
        <ListIcon size={18} />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-pf-black/40" onClick={() => setOpen(false)} />
          <aside
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) setOpen(false);
            }}
            className="app-side absolute inset-y-0 left-0 flex w-64 flex-col overflow-y-auto p-3"
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-6">
              {logo}
              <button aria-label={labels.close} onClick={() => setOpen(false)} className="text-pf-white/70">
                <XIcon size={18} />
              </button>
            </div>
            <NavList items={items} label={labels.nav} />
            <div className="mt-auto pt-4">{promo}</div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
