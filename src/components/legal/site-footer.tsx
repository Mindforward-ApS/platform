import { getMessages } from "@/lib/i18n";
import { CookieSettingsButton } from "./cookie-banner";

/** Footer on public pages: legal links, cookie settings, vendor disclaimer (docs/10 § 4, § 8). */
export function SiteFooter() {
  const t = getMessages().placement.footer;
  const links = [
    ["/niveautest", t.placement],
    ["/privatliv", t.privacy],
    ["/cookies", t.cookies],
    ["/handelsbetingelser", t.terms],
    ["/tilgaengelighed", t.accessibility],
  ] as const;
  return (
    <footer className="mt-auto border-t border-border p-6 text-sm text-muted">
      <nav aria-label={t.navLabel} className="mx-auto flex max-w-3xl flex-wrap gap-4">
        {links.map(([href, label]) => (
          <a key={href} className="underline" href={href}>
            {label}
          </a>
        ))}
        <CookieSettingsButton>{t.cookieSettings}</CookieSettingsButton>
      </nav>
      <p className="mx-auto mt-3 max-w-3xl">{t.disclaimer}</p>
    </footer>
  );
}
