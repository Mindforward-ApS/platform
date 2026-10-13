"use client";

import { useEffect } from "react";
import { COOKIE_CHOICE_EVENT, readCookieChoice, type CookieChoice } from "@/components/legal/cookie-banner";

// PostHog EU (docs/02 § 8, docs/10 § 3): rendered only when NEXT_PUBLIC_POSTHOG_KEY is set.
// Before analytics consent: persistence "memory" — no cookies, no localStorage, no sessionStorage; anonymous
// page views only. After "Accepter statistik": persistence localStorage+cookie. Withdrawal (Kun nødvendige):
// back to memory and stored PostHog data deleted. No session replay, no autocapture (prompt fields are never
// captured), no surveys/remote scripts, no feature-flag calls.

type PostHogClient = (typeof import("posthog-js"))["default"];

function persistenceFor(choice: CookieChoice | null) {
  return choice === "statistics" ? { persistence: "localStorage+cookie" as const, disable_persistence: false } : { persistence: "memory" as const, disable_persistence: true };
}

export function PostHogAnalytics({ apiKey, apiHost }: { apiKey: string; apiHost: string }) {
  useEffect(() => {
    let client: PostHogClient | undefined;
    let cancelled = false;
    const apply = (choice: CookieChoice | null) => client?.set_config(persistenceFor(choice));
    const onChoice = (e: Event) => apply((e as CustomEvent<CookieChoice>).detail);

    void import("posthog-js").then(({ default: posthog }) => {
      if (cancelled) return;
      posthog.init(apiKey, {
        api_host: apiHost,
        ...persistenceFor(readCookieChoice(document.cookie)),
        autocapture: false,
        capture_pageview: "history_change",
        capture_pageleave: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_exceptions: false,
        rageclick: false,
        disable_session_recording: true,
        disable_surveys: true,
        disable_product_tours: true,
        disable_conversations: true,
        disable_web_experiments: true,
        disable_external_dependency_loading: true,
        advanced_disable_flags: true,
        person_profiles: "identified_only",
        mask_all_text: true,
        mask_all_element_attributes: true,
      });
      client = posthog;
    });
    window.addEventListener(COOKIE_CHOICE_EVENT, onChoice);
    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CHOICE_EVENT, onChoice);
    };
  }, [apiKey, apiHost]);
  return null;
}
