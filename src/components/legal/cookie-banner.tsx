"use client";

import { useEffect, useState } from "react";

// Cookie banner (docs/00 § 10a, docs/10 § 3): defaults to necessary-only; "Kun nødvendige" is exactly as prominent
// as "Accepter statistik". No analytics is loaded in M5 — the choice is only stored in a first-party cookie.
// Rendered in normal page flow (not as an overlay) so it never covers content or form buttons.

export const COOKIE_CHOICE = "greb_cookie_choice";
const OPEN_EVENT = "greb:cookie-settings";
/** M10: fired on every choice so analytics (PostHog) can switch persistence without a reload. */
export const COOKIE_CHOICE_EVENT = "greb:cookie-choice";
const MAX_AGE = 180 * 24 * 60 * 60;

export type CookieChoice = "necessary" | "statistics";

export function readCookieChoice(cookieHeader: string): CookieChoice | null {
  const value = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_CHOICE}=`))
    ?.slice(COOKIE_CHOICE.length + 1);
  return value === "v1.necessary" ? "necessary" : value === "v1.statistics" ? "statistics" : null;
}

interface Strings {
  label: string;
  title: string;
  body: string;
  necessaryOnly: string;
  acceptStatistics: string;
  readMore: string;
}

export function CookieBanner({ t }: { t: Strings }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Reading document.cookie must happen after hydration; the banner is client-only by design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(readCookieChoice(document.cookie) === null);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  function choose(choice: CookieChoice) {
    document.cookie = `${COOKIE_CHOICE}=v1.${choice}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setOpen(false);
    window.dispatchEvent(new CustomEvent<CookieChoice>(COOKIE_CHOICE_EVENT, { detail: choice }));
  }

  if (!open) return null;
  return (
    <section aria-label={t.label} className="border-b border-border bg-surface p-4" data-testid="cookie-banner">
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <h2 className="font-semibold">{t.title}</h2>
        <p className="text-sm">
          {t.body}{" "}
          <a className="underline" href="/cookies">
            {t.readMore}
          </a>
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Same element, same classes: neither choice is visually preferred. */}
          <button type="button" className="rounded-md border border-border bg-bg px-4 py-2" onClick={() => choose("necessary")}>
            {t.necessaryOnly}
          </button>
          <button type="button" className="rounded-md border border-border bg-bg px-4 py-2" onClick={() => choose("statistics")}>
            {t.acceptStatistics}
          </button>
        </div>
      </div>
    </section>
  );
}

export function CookieSettingsButton({ children }: { children: string }) {
  return (
    <button type="button" className="underline" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}
