import { describe, expect, it } from "vitest";
import { findDesignViolations } from "../../scripts/check-tokens";

describe("findDesignViolations", () => {
  it("flags hex, rgb/hsl/oklch colors and font-family outside tokens.css", () => {
    const v = findDesignViolations("src/components/x.tsx", `<div style={{ color: "#ff0000" }} />\nconst f = "font-family: Inter";\nbg-[rgb(1,2,3)]`);
    expect(v.map((x) => x.kind)).toEqual(["color", "font", "color"]);
  });

  it("flags Tailwind palette colors like bg-red-500 and arbitrary hex", () => {
    const v = findDesignViolations("src/app/page.tsx", `<p className="bg-red-500 text-[#123456]" />`);
    expect(v).toHaveLength(2);
  });

  it("allows token-based utilities and CSS variables", () => {
    expect(findDesignViolations("src/app/page.tsx", `<p className="bg-surface text-fg" style={{ color: "var(--color-fg)" }} />`)).toEqual([]);
  });

  it("ignores tokens.css itself", () => {
    expect(findDesignViolations("src/styles/tokens.css", `--color-fg: #111111;`)).toEqual([]);
  });

  it("does not treat issue refs or ids like #1 or #main as colors", () => {
    expect(findDesignViolations("src/app/page.tsx", `// see #12\n<a href="#main" />`)).toEqual([]);
  });
});
