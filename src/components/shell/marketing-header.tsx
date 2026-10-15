import Link from "next/link";
import { Wordmark } from "@/components/ui/brand";
import { ButtonLink } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { NavLink } from "./nav-link";

/** Public top bar. `tone="night"` sits on the dark hero band of the landing page. */
export function MarketingHeader({ tone = "default" }: { tone?: "default" | "night" }) {
  const t = getMessages();
  const m = t.shell.marketing;
  const night = tone === "night";
  return (
    <header className={night ? "relative z-10 bg-night" : "sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md"}>
      <div className="mx-auto flex h-16 max-w-app items-center gap-8 px-4 sm:px-6">
        <Link href="/" className="rounded-sm" aria-label={t.brand}>
          <Wordmark size={19} tone={night ? "night" : "default"} />
        </Link>
        <nav aria-label={t.shell.mainNav} className="hidden h-16 items-center gap-6 md:flex">
          <NavLink href="/niveautest" tone={tone}>
            {m.placement}
          </NavLink>
          <NavLink href="/hjaelp" tone={tone}>
            {m.help}
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            href="/log-ind"
            className={`flex h-9 items-center whitespace-nowrap rounded-sm px-2 text-label sm:px-3 transition-colors ${night ? "text-on-night-muted hover:text-on-night" : "text-ink-muted hover:bg-sunken hover:text-ink"}`}
          >
            {m.login}
          </Link>
          <ButtonLink href="/opret" size="sm" trailingIcon="arrowRight" className={`max-sm:px-3 max-sm:[&_svg]:hidden ${night ? "bg-night-accent text-night! hover:bg-on-night" : ""}`}>
            {m.signup}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
