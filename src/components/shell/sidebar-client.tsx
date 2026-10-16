"use client";

import { usePathname } from "next/navigation";
import { Suspense, useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";

// Small client islands of the v3 app frame: collapse the sidebar, expand a nav item, breadcrumb from the pathname.

const STORAGE_KEY = "mf-sidebar-collapsed";

function frame(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-app-frame]");
}

let memory: boolean | null = null; // fallback when storage is blocked
function readCollapsed(): boolean {
  if (memory !== null) return memory;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false; // storage blocked: start expanded
  }
}
const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Round button on the sidebar edge: icon-only rail ⇄ full sidebar. Remembered per browser (a convenience only). */
export function CollapseButton({ collapseLabel, expandLabel }: { collapseLabel: string; expandLabel: string }) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  useEffect(() => {
    if (collapsed) frame()?.setAttribute("data-collapsed", "");
    else frame()?.removeAttribute("data-collapsed");
  }, [collapsed]);
  const toggle = () => {
    memory = !collapsed;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "0" : "1");
    } catch {
      // ignore: the in-memory value still applies on this page
    }
    listeners.forEach((fn) => fn());
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={!collapsed}
      aria-label={collapsed ? expandLabel : collapseLabel}
      title={collapsed ? expandLabel : collapseLabel}
      className="absolute top-8 -right-4 z-20 grid size-8 place-items-center rounded-full border-4 border-sidebar bg-on-sidebar text-sidebar transition-transform duration-[120ms] hover:scale-105"
    >
      <Icon name="chevronRight" size={14} weight="bold" className={collapsed ? "" : "rotate-180"} />
    </button>
  );
}

/** A nav item with indented sub-items under it, open by default; the chevron toggles them. */
export function ExpandableNav({ link, label, toggleLabel, children }: { link: ReactNode; label: string; toggleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <div className="flex flex-col gap-0.5">
      <div className="relative">
        {link}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={toggleLabel.replace("{label}", label)}
          className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-on-sidebar-subtle transition-colors hover:bg-sidebar-hover hover:text-on-sidebar in-data-collapsed:hidden"
        >
          <Icon name="chevronDown" size={16} className={cx("transition-transform duration-[120ms]", !open && "-rotate-90")} />
        </button>
      </div>
      <div id={id} hidden={!open} className="flex flex-col gap-0.5 in-data-collapsed:hidden">
        {children}
      </div>
    </div>
  );
}

export interface Crumb {
  href: string;
  label: string;
  group?: string;
  exact?: boolean;
  /** Extra path prefixes that belong to this item (e.g. /modul/* under Moduler). */
  also?: string[];
}

function matches(c: Crumb, pathname: string): boolean {
  if (pathname === c.href) return true;
  const prefixes = [...(c.exact ? [] : [c.href]), ...(c.also ?? [])];
  return prefixes.some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

function CrumbTrail({ items, label }: { items: Crumb[]; label: string }) {
  const pathname = usePathname();
  // The longest matching prefix wins (/virksomhed/medarbejdere over /virksomhed).
  const hit = items.filter((c) => matches(c, pathname)).sort((a, b) => b.href.length - a.href.length)[0];
  if (!hit) return <span />;
  return (
    <nav aria-label={label} className="min-w-0">
      <ol className="flex items-center gap-2.5 text-body-sm text-ink-muted">
        {hit.group && (
          <li className="flex items-center gap-2.5">
            {hit.group}
            <Icon name="chevronRight" size={12} className="text-ink-subtle" />
          </li>
        )}
        <li aria-current="page" className="truncate font-medium text-ink">
          {hit.label}
        </li>
      </ol>
    </nav>
  );
}

/** Breadcrumb top-left in the panel: "Group › Page", derived from the sidebar items. */
export function Breadcrumb(props: { items: Crumb[]; label: string }) {
  return (
    <Suspense fallback={<span />}>
      <CrumbTrail {...props} />
    </Suspense>
  );
}
