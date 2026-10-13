import * as Sentry from "@sentry/nextjs";
import { clientEnv } from "@/lib/env.client";

Sentry.init({
  dsn: clientEnv.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(clientEnv.NEXT_PUBLIC_SENTRY_DSN),
  tracesSampleRate: 0.1,
  // No user info, cookies, headers, bodies or query params in Sentry (docs/02-arkitektur.md § 8).
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  beforeSend(event) {
    delete event.user;
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
