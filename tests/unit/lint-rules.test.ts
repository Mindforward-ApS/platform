import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: process.cwd() });

async function ruleIds(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath });
  return (result?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId);
}

describe("eslint config", () => {
  it("fails on explicit any", async () => {
    expect(await ruleIds("export const x: any = 1;\n", "src/lib/sample.ts")).toContain("@typescript-eslint/no-explicit-any");
  }, 60_000);

  it("fails on @ts-ignore without a description", async () => {
    expect(await ruleIds("// @ts-ignore\nexport const y = 1;\n", "src/lib/sample.ts")).toContain("@typescript-eslint/ban-ts-comment");
  }, 60_000);

  it("forbids importing the Anthropic SDK outside src/server/ai", async () => {
    expect(await ruleIds('import Anthropic from "@anthropic-ai/sdk";\nexport { Anthropic };\n', "src/server/billing/x.ts")).toContain(
      "no-restricted-imports",
    );
  }, 60_000);
});
