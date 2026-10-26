import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// CLAUDE.md: the authz helper is called in EVERY server action and route handler. This test parses
// src/app/**/actions.ts and src/app/**/route.ts and fails for any exported function that does not call one.

const AUTHZ_CALL = /\b(requireUser|requireMembership|requireOrgAdmin|requireActiveMembership|requirePlatformAdmin|requireGrebAdminUser)\(/;

/** Explicit, reviewed exceptions: endpoints that must work before login or authenticate themselves. */
const ALLOWLIST: Record<string, string[]> = {
  "src/app/api/auth/[...all]/route.ts": ["GET", "POST"], // Better Auth authenticates its own endpoints
  "src/app/api/health/route.ts": ["GET"], // liveness, no data
  "src/app/api/inngest/route.ts": ["GET", "POST", "PUT"], // signed by INNGEST_SIGNING_KEY in serve()
  "src/app/api/debug/sentry/route.ts": ["GET"], // throws only; disabled unless ENABLE_DEBUG_ROUTES (forbidden in prod)
  "src/app/api/dev/adgang/route.ts": ["GET"], // preview-only demo sign-in; 404 unless PREVIEW_AUTO_LOGIN (forbidden in prod)
  "src/app/(auth)/log-ind/actions.ts": ["requestMagicLink", "signInWithProvider"], // pre-login, rate-limited
  "src/app/api/webhooks/stripe/route.ts": ["POST"], // authenticated by the Stripe-Signature header (constructEvent on the raw body)
  "src/app/(billing)/fortryd-aftale/actions.ts": ["submitWithdrawalForm"], // § 20 a: must work without login; rate-limited per IP
  // M5 public lead magnet: no login by design; honeypot + min time + rate limits in src/server/placement/submit.ts
  "src/app/(shared)/niveautest/[track]/actions.ts": ["submitPlacementTest"],
  "src/app/(shared)/niveautest/resultat/actions.ts": ["giveMarketingConsent"], // voluntary consent, 5/h per IP + email
  "src/app/(marketing)/samtykke/bekraeft/actions.ts": ["confirmConsent"], // authenticated by the opt-in token
  "src/app/(marketing)/afmeld/actions.ts": ["unsubscribe"], // authenticated by the HMAC unsubscribe token
  "src/app/api/afmeld/route.ts": ["POST"], // RFC 8058 one-click, HMAC token
  // M8: Resend → us; authenticated by the Svix signature (RESEND_WEBHOOK_SECRET) verified on the raw body first
  "src/app/api/webhooks/resend/route.ts": ["POST"],
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry === "actions.ts" || entry === "route.ts") out.push(full);
  }
  return out;
}

function exportedFunctions(file: string): { name: string; body: string }[] {
  const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
  const found: { name: string; body: string }[] = [];
  const isExported = (n: ts.Node) => ts.canHaveModifiers(n) && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const stmt of source.statements) {
    if (ts.isFunctionDeclaration(stmt) && stmt.name && isExported(stmt)) found.push({ name: stmt.name.text, body: stmt.body?.getText() ?? "" });
    if (ts.isVariableStatement(stmt) && isExported(stmt)) {
      for (const decl of stmt.declarationList.declarations) {
        const names = ts.isIdentifier(decl.name) ? [decl.name.text] : ts.isObjectBindingPattern(decl.name) ? decl.name.elements.map((e) => e.name.getText()) : [];
        for (const name of names) found.push({ name, body: decl.initializer?.getText() ?? "" });
      }
    }
  }
  return found;
}

/** Helper functions defined in the same file that call an authz function count as authz calls. */
function localGuards(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/async function (\w+)\([^)]*\)\s*{[^]*?\n}/g)].filter((m) => AUTHZ_CALL.test(m[0])).map((m) => m[1] ?? "");
}

const files = walk("src/app").map((f) => relative(process.cwd(), f));

describe("authz scan", () => {
  it("finds the actions and routes", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  for (const file of files) {
    it(`${file}: every exported handler calls an authz helper`, () => {
      const guards = localGuards(file);
      const missing = exportedFunctions(file)
        .filter((f) => !(ALLOWLIST[file] ?? []).includes(f.name))
        .filter((f) => !AUTHZ_CALL.test(f.body) && !guards.some((g) => g && f.body.includes(`${g}(`)))
        .map((f) => f.name);
      expect(missing, `missing authz in ${file}`).toEqual([]);
    });
  }

  it("the scanner catches a handler without authz", () => {
    const fake = "export async function leak() { return db().user.findMany(); }";
    expect(AUTHZ_CALL.test(fake)).toBe(false);
  });
});
