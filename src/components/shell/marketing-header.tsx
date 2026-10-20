import Link from "next/link";
import { SiteLogo } from "@/components/ui/brand";
import { SITE_URL } from "@/lib/config/site";
import { getMessages } from "@/lib/i18n";
import { NavLink } from "./nav-link";

/** Public top bar (niveautest, hjælp, legal pages): the website's floating white bar with the brain + "Forward"
 *  logo, which leads back to mindforward.dk. `tone` is kept for callers; there is no dark variant any more. */
export function MarketingHeader(_props: { tone?: "default" | "night" }) {
  const t = getMessages();
  const m = t.shell.marketing;
  return (
    <header className="sticky top-0 z-40 px-4 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-8 rounded-2xl bg-surface/95 px-4 shadow-[0_10px_30px_-20px_var(--color-site-shadow)] ring-1 ring-site-line backdrop-blur-md sm:h-[72px] sm:px-6">
        <a href={SITE_URL} className="rounded-lg" aria-label={`${t.brand} – ${m.website}`}>
          <SiteLogo />
        </a>
        <nav aria-label={t.shell.mainNav} className="hidden h-full items-center gap-6 md:flex">
          <NavLink href="/niveautest">{m.placement}</NavLink>
          <NavLink href="/hjaelp">{m.help}</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <Link href="/log-ind" className="hidden px-3 text-[14.5px] font-medium text-site-ink transition-colors hover:text-site-blue sm:block">
            {m.login}
          </Link>
          <Link href="/opret" className="rounded-xl bg-site-navy px-5 py-2.5 text-[15px] font-semibold whitespace-nowrap text-on-sidebar transition hover:bg-site-navy-hover sm:px-6 sm:py-3">
            {m.signup}
          </Link>
        </div>
      </div>
    </header>
  );
}
