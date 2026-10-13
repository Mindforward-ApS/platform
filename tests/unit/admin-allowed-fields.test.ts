import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { ADMIN_FORBIDDEN_KEYS, assertAdminSafe, findForbiddenKeys } from "@/server/admin/allowed-fields";

// Roadmap M7: no admin query/endpoint/export contains prompt text. The source scan below fails if anyone
// writes a forbidden field name in the admin query module, the report builder or the org data export.

const ADMIN_SOURCES = ["src/server/admin/queries.ts", "src/server/reports/report.ts"];

describe("allowed-fields scanner", () => {
  it("finds forbidden keys at any depth", () => {
    const value = { rows: [{ name: "A", modules: [{ slug: "x", promptText: "secret" }] }], meta: { answers: [] } };
    expect(findForbiddenKeys(value)).toEqual(["$.rows[0].modules[0].promptText", "$.meta.answers"]);
  });

  it("accepts clean data, dates and nulls", () => {
    expect(findForbiddenKeys({ a: new Date(), b: null, c: [1, "x", { bestScorePct: 90 }] })).toEqual([]);
  });

  it("assertAdminSafe throws on forbidden data", () => {
    expect(() => assertAdminSafe({ aiFeedback: "x" })).toThrow(/aiFeedback/);
  });

  for (const file of ADMIN_SOURCES) {
    it(`${file} never names a forbidden field (selects only allow-listed fields)`, () => {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
      const identifiers = new Set<string>();
      const visit = (node: ts.Node) => {
        if (ts.isIdentifier(node) || ts.isStringLiteral(node)) identifiers.add(node.text);
        ts.forEachChild(node, visit);
      };
      visit(source);
      const used = ADMIN_FORBIDDEN_KEYS.filter((k) => identifiers.has(k));
      expect(used, `forbidden fields referenced in ${file}`).toEqual([]);
    });

    it(`${file} has no Prisma include (includes pull every column)`, () => {
      expect(readFileSync(file, "utf8")).not.toMatch(/\binclude\s*:/);
    });
  }
});
