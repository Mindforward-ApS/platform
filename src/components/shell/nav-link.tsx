"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cx } from "@/components/ui/primitives";

type Props = { href: string; exact?: boolean; variant?: "bar" | "side" | "sidebar" | "rail" | "railSub"; tone?: "default" | "night"; children: ReactNode };

/** Top-bar / sidebar link that marks itself as the current page. `exact` for index routes like /virksomhed.
 *  The pathname is runtime data, so the active state streams in; the prerendered fallback is the same link, inactive. */
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <ActiveNavLink {...props} />
    </Suspense>
  );
}

function ActiveNavLink(props: Props) {
  const pathname = usePathname();
  const active = props.exact ? pathname === props.href : pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkView {...props} active={active} />;
}

function NavLinkView({ href, variant = "bar", tone = "default", children, active }: Props & { active: boolean }) {
  if (variant === "rail") {
    // v3 dark sidebar: icon in a circle; the active item is a lighter pill with a white circle.
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "group/nav flex h-11 items-center gap-3 rounded-[10px] px-2 text-[0.9375rem] font-medium transition-colors duration-[120ms] in-data-collapsed:justify-center in-data-collapsed:px-0",
          // :3500 look: the active item is a filled coral pill.
          active ? "bg-sidebar-active text-on-sidebar shadow-[0_6px_14px_-6px_var(--color-sidebar-active)]" : "text-on-sidebar-muted hover:bg-sidebar-hover hover:text-on-sidebar",
        )}
      >
        {children}
      </Link>
    );
  }
  if (variant === "railSub") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex h-9 items-center rounded-[10px] pr-2.5 pl-[3.4rem] text-body-sm font-medium transition-colors duration-[120ms]",
          active ? "text-on-sidebar" : "text-on-sidebar-subtle hover:bg-sidebar-hover hover:text-on-sidebar",
        )}
      >
        {children}
      </Link>
    );
  }
  if (variant === "sidebar") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex h-11 items-center gap-3 rounded-[10px] px-2 text-label transition-[background-color,box-shadow,color] duration-[120ms]",
          active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-muted hover:bg-surface/70 hover:text-ink",
        )}
      >
        {children}
      </Link>
    );
  }
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
