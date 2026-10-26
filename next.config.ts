import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// Static security headers (docs/02-arkitektur.md § 7). No default-src/script-src yet: Next streams Suspense
// content with inline scripts, so locking scripts down needs a per-request nonce — decided with the public
// pages in M5 (docs/OPEN-QUESTIONS.md). Until then: no framing, no plugins, no foreign <base> or form targets.
const csp = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://login.microsoftonline.com https://accounts.google.com https://checkout.stripe.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The sandbox reads the versioned Nordlys world and skins from content/ at runtime (src/server/sandbox/world.ts).
  outputFileTracingIncludes: {
    "/api/sandbox/**": ["./content/sandbox-world/**", "./content/sandbox-skins/**", "./content/sandbox-connectors/catalog.json"],
    "/sandkasse/**": ["./content/sandbox-world/**", "./content/sandbox-skins/**", "./content/sandbox-connectors/catalog.json", "./content/sandbox-features/**"],
    // Opgavevisning: the module player opens the attempt-bound sandbox through a server action.
    "/modul/**": ["./content/sandbox-world/**", "./content/sandbox-skins/**", "./content/sandbox-connectors/catalog.json", "./content/sandbox-features/**"],
    // M7: the DPA text is shown and hashed at acceptance (src/server/orgs/dpa.ts).
    "/virksomhed/**": ["./content/legal/dpa.v1.md"],
    // M10: help-center articles are read from content/help at runtime (src/server/support/help.ts).
    "/api/support/**": ["./content/help/**"],
    "/hjaelp/**": ["./content/help/**"],
    "/hjaelp": ["./content/help/**"],
    // Certificate PDF, badge and link preview read raster colors from tokens.css (src/server/brand/raster-tokens.ts).
    "/api/certifikater/**": ["./src/styles/tokens.css"],
    "/certifikat/**": ["./src/styles/tokens.css"],
  },
  // M7: pdfkit reads its built-in font metrics (AFM files) from its package directory at runtime.
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
});
