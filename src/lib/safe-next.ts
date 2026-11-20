// The only shape a post-login "next" target may have: an absolute path on our own site. Rejects "//x", "/\x",
// tabs/newlines and anything with a scheme — URL parsing turns those into another origin (open redirect).
const SAFE_NEXT = /^\/(?!\/)[\w\-/]*$/;

export function safeNextPath(raw: string | null | undefined): string | null {
  return typeof raw === "string" && raw.length <= 200 && SAFE_NEXT.test(raw) ? raw : null;
}
