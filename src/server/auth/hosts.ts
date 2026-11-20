// Hosts Better Auth will build URLs for (baseURL) and accept requests from (trustedOrigins).
// Only our own Vercel project — never a blanket "*.vercel.app".
export const VERCEL_PREVIEW_HOST_PATTERN = "greb-*-esthergruppen.vercel.app";

export function allowedHosts(appUrl: string, productionUrl?: string): string[] {
  const hosts = new Set([new URL(appUrl).host, VERCEL_PREVIEW_HOST_PATTERN]);
  if (productionUrl) hosts.add(new URL(productionUrl).host);
  return [...hosts];
}

export function trustedOrigins(appUrl: string, productionUrl?: string): string[] {
  return allowedHosts(appUrl, productionUrl).map((h) => `${new URL(appUrl).protocol === "http:" && h === new URL(appUrl).host ? "http" : "https"}://${h}`);
}
