import Link from "next/link";
import { Wordmark } from "@/components/ui/brand";
import { getMessages } from "@/lib/i18n";
import { CookieSettingsButton } from "./cookie-banner";

/** Footer: legal links, cookie settings, vendor disclaimer (docs/10 § 4, § 8). `compact` inside the signed-in app. */
export function SiteFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  const t = getMessages().placement.footer;
  const links = [
    ["/niveautest", t.placement],
    ["/privatliv", t.privacy],
    ["/cookies", t.cookies],
    ["/handelsbetingelser", t.terms],
    ["/tilgaengelighed", t.accessibility],
  ] as const;
  const nav = (
    <nav aria-label={t.navLabel} className="flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-ink-muted">
      {links.map(([href, label]) => (
        <Link key={href} className="transition-colors hover:text-ink" href={href}>
          {label}
        </Link>
      ))}
      <CookieSettingsButton>{t.cookieSettings}</CookieSettingsButton>
    </nav>
  );
  if (variant === "compact") {
    return (
      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex max-w-app flex-col gap-3 px-4 py-6 sm:px-6">
          {nav}
          <p className="text-caption text-ink-subtle">{t.disclaimer}</p>
        </div>
      </footer>
    );
  }
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-app flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
          <div className="flex flex-col gap-3">
            <Wordmark size={18} />
            <p className="max-w-xs text-body-sm text-ink-muted">{getMessages().meta.description}</p>
          </div>
          {nav}
        </div>
        <p className="border-t border-line pt-6 text-caption text-ink-subtle">{t.disclaimer}</p>
      </div>
    </footer>
  );
}
