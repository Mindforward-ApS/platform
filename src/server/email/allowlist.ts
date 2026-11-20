/** Non-production safety net (docs/02-arkitektur.md § 9): only allowlisted addresses or @domains get mail. */
export function isAllowedRecipient(email: string, allowlistCsv: string | undefined): boolean {
  const address = email.trim().toLowerCase();
  const domain = address.slice(address.lastIndexOf("@"));
  const entries = (allowlistCsv ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return entries.some((entry) => (entry.startsWith("@") ? domain === entry : address === entry));
}
