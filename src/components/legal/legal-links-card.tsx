import Link from "next/link";
import { Icon } from "@/components/ui/icons";
import { Card } from "@/components/ui/primitives";
import { getMessages } from "@/lib/i18n";
import { CookieSettingsButton } from "./cookie-banner";

// Signed-in app pages have no legal footer (Marco 16 Oct 2026); the legal pages and cookie settings live here on
// /konto instead, so consent stays as easy to withdraw as to give (docs/10 § 4).
export function LegalLinksCard() {
  const f = getMessages().placement.footer;
  const links = [
    ["/privatliv", f.privacy],
    ["/handelsbetingelser", f.terms],
    ["/cookies", f.cookies],
    ["/tilgaengelighed", f.accessibility],
    ["/underdatabehandlere", f.subprocessors],
  ] as const;
  const row = "group flex w-full items-center gap-4 px-6 py-3.5 text-label text-ink transition-colors hover:bg-sunken focus-visible:-outline-offset-2 sm:px-7";
  return (
    <Card title={getMessages().account.legalTitle} padded={false} data-testid="legal-links">
      <nav aria-label={getMessages().account.legalTitle}>
        <ul className="divide-y divide-line">
          {links.map(([href, label]) => (
            <li key={href}>
              <Link href={href} className={row}>
                <span className="flex-1">{label}</span>
                <Icon name="chevronRight" className="text-ink-subtle transition-transform duration-[120ms] group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
          <li className={row}>
            <span className="flex-1">
              <CookieSettingsButton>{f.cookieSettings}</CookieSettingsButton>
            </span>
            <Icon name="settings" className="text-ink-subtle" />
          </li>
        </ul>
      </nav>
    </Card>
  );
}
