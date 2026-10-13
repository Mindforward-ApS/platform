import * as Sentry from "@sentry/nextjs";
import { serverEnv } from "@/lib/env";

const env = serverEnv();

Sentry.init({
  dsn: env.SENTRY_DSN,
  enabled: Boolean(env.SENTRY_DSN),
  environment: env.SENTRY_ENVIRONMENT ?? env.VERCEL_ENV ?? env.NODE_ENV,
  tracesSampleRate: 0.1,
  // No user info, cookies, headers, bodies or query params in Sentry (docs/02-arkitektur.md § 8).
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
  beforeSend(event) {
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.query_string;
    }
    delete event.user;
    return event;
  },
});
