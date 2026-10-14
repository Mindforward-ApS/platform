"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cx } from "@/components/ui/primitives";

type Props = { href: string; exact?: boolean; variant?: "bar" | "side" | "sidebar"; tone?: "default" | "night"; children: ReactNode };

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
  if (variant === "sidebar") {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cx(
          "flex h-9 items-center gap-3 rounded-md px-2.5 text-label transition-colors duration-[120ms] [&[aria-current=page]_.nav-dot]:bg-on-accent [&[aria-current=page]_svg]:text-on-accent",
          active ? "bg-accent text-on-accent shadow-xs" : "text-ink-muted hover:bg-surface hover:text-ink",
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
