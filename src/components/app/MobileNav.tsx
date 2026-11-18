"use client";

import { useState } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { MindforwardLogo } from "@/components/ui/MindforwardLogo";
import { Item, PromoCard, useMenu } from "./Sidebar";

// Phone/tablet: the sidebar becomes a full-height drawer from the left.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const menu = useMenu();
  return (
    <div className="lg:hidden">
      <button aria-label="Åbn menu" onClick={() => setOpen(true)} className="app-btn app-btn-light !h-9 !w-9 !p-0"><ListIcon size={18} /></button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }} className="app-side absolute inset-y-0 left-0 flex w-64 flex-col p-3">
            <div className="flex items-center justify-between px-3 pb-6 pt-3">
              <MindforwardLogo size={24} />
              <button aria-label="Luk menu" onClick={() => setOpen(false)} className="text-white/70"><XIcon size={18} /></button>
            </div>
            <nav className="flex flex-col gap-1">{menu.map((i) => <Item key={i.href} {...i} />)}</nav>
            <div className="mt-auto pt-4"><PromoCard /></div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
