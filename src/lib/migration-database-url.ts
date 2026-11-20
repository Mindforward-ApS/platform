// Migrations need a direct (unpooled) Postgres connection. Neon's pooled host is the direct host with
// "-pooler" appended to the endpoint id, so when DATABASE_URL_UNPOOLED is not configured for an environment
// the direct URL can be derived from DATABASE_URL. Pure helper: used by prisma.config.ts.
type DatabaseEnv = Readonly<Record<string, string | undefined>>;

export function migrationDatabaseUrl(env: DatabaseEnv): string {
  const direct = env["DATABASE_URL_UNPOOLED"];
  if (direct) return direct;
  const pooled = env["DATABASE_URL"];
  if (!pooled) return "";

  const schemeEnd = pooled.indexOf("://");
  if (schemeEnd === -1) return pooled;
  const authorityStart = schemeEnd + 3;
  const rest = pooled.slice(authorityStart);
  const authorityLength = rest.search(/[/?#]/);
  const authority = authorityLength === -1 ? rest : rest.slice(0, authorityLength);
  const tail = authorityLength === -1 ? "" : rest.slice(authorityLength);

  const at = authority.lastIndexOf("@");
  const credentials = at === -1 ? "" : authority.slice(0, at + 1);
  const host = authority.slice(at + 1).replace(/^([^.:]+)-pooler\./, "$1.");

  return pooled.slice(0, authorityStart) + credentials + host + tail;
}
