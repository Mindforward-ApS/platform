"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/primitives";

/** Top-bar / sidebar link that marks itself as the current page. `exact` for index routes like /virksomhed. */
export function NavLink({ href, exact = false, variant = "bar", tone = "default", children }: { href: string; exact?: boolean; variant?: "bar" | "side"; tone?: "default" | "night"; children: ReactNode }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  if (variant === "side") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex h-9 items-center gap-2.5 rounded-sm px-3 text-label transition-colors duration-[120ms]",
          active ? "bg-surface text-ink shadow-xs ring-1 ring-line" : "text-ink-muted hover:bg-sunken hover:text-ink",
        )}
      >
        {children}
      </Link>
    );
  }
  const night = tone === "night";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative flex h-16 shrink-0 items-center gap-2 px-1 text-label transition-colors duration-[120ms]",
        night ? "text-on-night-muted hover:text-on-night" : "text-ink-muted hover:text-ink",
        active && (night ? "text-on-night" : "text-ink"),
        active && "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent",
      )}
    >
      {children}
    </Link>
  );
}
