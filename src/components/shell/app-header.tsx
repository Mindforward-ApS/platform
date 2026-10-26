import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "@/app/(learner)/konto/actions";
import { SiteLogo } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icons";
import { cx } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { NavLink } from "./nav-link";

export interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

export function learnerNav(): NavItem[] {
  const t = getMessages().shell.learner;
  return [
    { href: "/moduler", label: t.modules },
    { href: "/plan", label: t.plan },
    { href: "/sandkasse/chatgpt", label: t.sandbox },
    { href: "/certifikater", label: t.certificates },
  ];
}

/** Signed-in top bar: wordmark, main nav, help, account and sign-out. Sticky, on surface with a hairline. */
export function AppHeader({ items = learnerNav(), home = "/moduler", badge }: { items?: NavItem[]; home?: string; badge?: ReactNode }) {
  const t = getMessages();
  return (
    <>
      <a href="#indhold" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md">
        {t.shell.skipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-16 max-w-app items-center gap-8 px-4 sm:px-6">
          <Link href={home} className="flex items-center gap-3 rounded-sm" aria-label={t.logoLabel}>
            <SiteLogo />
            {badge}
          </Link>
          <nav aria-label={t.shell.mainNav} className="hidden h-16 items-center gap-6 md:flex">
            {items.map((i) => (
              <NavLink key={i.href} href={i.href} exact={i.exact}>
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link href="/hjaelp" className="hidden h-9 items-center gap-2 rounded-sm px-3 text-label text-ink-muted transition-colors hover:bg-sunken hover:text-ink sm:flex">
              <Icon name="help" />
              {t.shell.learner.help}
            </Link>
            <Link href="/konto" className="flex h-9 items-center gap-2 rounded-sm px-3 text-label text-ink-muted transition-colors hover:bg-sunken hover:text-ink">
              <Icon name="user" />
              <span className="hidden sm:inline">{t.shell.learner.account}</span>
            </Link>
            <form action={signOut}>
              <button type="submit" className="flex h-9 items-center gap-2 rounded-sm px-3 text-label text-ink-muted transition-colors hover:bg-sunken hover:text-ink" aria-label={t.auth.logout}>
                <Icon name="logout" />
                <span className="hidden lg:inline">{t.auth.logout}</span>
              </button>
            </form>
          </div>
        </div>
        {/* Phones: the nav scrolls sideways under the bar instead of hiding behind a menu. */}
        <nav aria-label={t.shell.mainNav} className="flex h-11 items-center gap-5 overflow-x-auto border-t border-line px-4 md:hidden [&>a]:h-11">
          {items.map((i) => (
            <NavLink key={i.href} href={i.href} exact={i.exact}>
              {i.label}
            </NavLink>
          ))}
        </nav>
      </header>
    </>
  );
}

/** Minimal bar for auth and checkout flows: wordmark only, nothing to wander off to. */
export function FocusHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className={cx("mx-auto flex h-16 max-w-app items-center justify-between gap-4 px-4 sm:px-6")}>
        <Link href="/" className="rounded-sm" aria-label={getMessages().logoLabel}>
          <SiteLogo />
        </Link>
        {right}
      </div>
    </header>
  );
}
