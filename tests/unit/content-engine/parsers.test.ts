import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contentHash, isDateHeading, normalizeText, parseDate } from "@/server/content-engine/normalize";
import { parseSource } from "@/server/content-engine/parsers";
import { sourceConfig } from "@/server/content-engine/sources";

const fixture = (name: string) => readFileSync(`tests/fixtures/release-notes/${name}`, "utf8");
const cfg = (key: string) => {
  const c = sourceConfig(key);
  if (!c) throw new Error(key);
  return c;
};

describe("normalize", () => {
  it("parses common release-note date formats", () => {
    expect(parseDate("October 2, 2026")).toBe("2026-10-02");
    expect(parseDate("Oct 9th, 2026")).toBe("2026-10-09");
    expect(parseDate("9 October 2026")).toBe("2026-10-09");
    expect(parseDate("2026-10-09")).toBe("2026-10-09");
    expect(parseDate("October 2026")).toBe("2026-10-01");
    expect(parseDate("November CY2026")).toBe("2026-11-01");
    expect(parseDate("Sharing projects")).toBeNull();
  });

  it("recognises pure date headings only", () => {
    expect(isDateHeading("October 2, 2026")).toBe(true);
    expect(isDateHeading("September 2026")).toBe(true);
    expect(isDateHeading("Projects launch October 2026")).toBe(false);
  });

  it("removes tracking parameters, relative timestamps and whitespace noise", () => {
    expect(normalizeText("See  https://x.example/a?utm_source=n&id=1 \n\n\n Updated 5 minutes ago  ok")).toBe("See https://x.example/a?id=1\n\nok");
  });
});

describe("HTML parser (Intercom article)", () => {
  const entries = parseSource("HTML", fixture("chatgpt-rn.html"), cfg("openai-chatgpt-rn").parser, cfg("openai-chatgpt-rn").url);

  it("returns one entry per item heading with the date from the date heading", () => {
    expect(entries.map((e) => [e.title, e.date])).toEqual([
      ["Sharing projects in ChatGPT Business", "2026-10-02"],
      ["Voice mode fixes", "2026-10-02"],
      ["Scheduled tasks for Plus and Pro", "2026-09-18"],
    ]);
  });

  it("uses the heading id as stable key and deep link, and drops nav, cookie banner, scripts and footer", () => {
    const first = entries[0]!;
    expect(first.entryKey).toBe("id-h_projects-sharing");
    expect(first.url).toBe("https://help.openai.com/en/articles/6825453-chatgpt-release-notes#h_projects-sharing");
    const all = entries.map((e) => e.text).join("\n");
    expect(all).not.toMatch(/cookies|intercomSettings|Privacy|Help Center/);
    expect(first.text).toContain("Workspace members on ChatGPT Business and Enterprise can now share a project");
  });

  it("is stable against noise: whitespace, tracking params and 'updated x ago' do not change the hash", () => {
    const v2 = parseSource("HTML", fixture("chatgpt-rn-v2.html"), cfg("openai-chatgpt-rn").parser, cfg("openai-chatgpt-rn").url);
    const v2Old = v2.filter((e) => e.entryKey !== "id-h_custom-gpts-retirement");
    expect(contentHash(v2Old)).toBe(contentHash(entries));
    expect(v2.find((e) => e.entryKey === "id-h_custom-gpts-retirement")?.text).toContain("Starting December 11, 2026, custom GPTs will no longer be available");
  });
});

describe("Markdown parser (Microsoft Learn)", () => {
  const c = cfg("ms-learn-copilot-rn");
  const entries = parseSource("MARKDOWN", fixture("ms-learn-copilot-rn.md"), c.parser, c.url);

  it("skips front matter and comments and dates items by their month heading", () => {
    expect(entries.map((e) => [e.title, e.date])).toEqual([
      ["Notebooks in Copilot Chat", "2026-10-01"],
      ["Agent Builder improvements", "2026-10-01"],
      ["Copilot in Outlook summarizes threads in more languages", "2026-09-01"],
    ]);
    expect(entries.map((e) => e.text).join("\n")).not.toMatch(/ms\.date|updated monthly|screenshot|utm_/);
  });

  it("keeps link text, strips markup, and links to the human page", () => {
    expect(entries[1]!.text).toContain("with a new picker");
    expect(entries[0]!.text).toContain("- Rolling out to all users over the coming weeks.");
    expect(entries[0]!.url).toBe("https://learn.microsoft.com/en-us/copilot/microsoft-365/release-notes#notebooks-in-copilot-chat");
  });
});

describe("JSON parser (M365 roadmap)", () => {
  const c = cfg("ms-m365-roadmap");
  const entries = parseSource("JSON", fixture("m365-roadmap.json"), c.parser, c.url);

  it("keeps only Copilot products and uses the roadmap id as key", () => {
    expect(entries.map((e) => e.entryKey)).toEqual(["m365-498123", "m365-498310"]);
    expect(entries[0]!.date).toBe("2026-10-06");
    expect(entries[0]!.text).toContain("Agent Mode in Excel lets Copilot plan");
    expect(entries[0]!.text).toContain("Status: In development");
    expect(entries[0]!.url).toBe("https://www.microsoft.com/microsoft-365/roadmap?id=498123");
  });

  it("rejects a response that is not the expected shape", () => {
    expect(() => parseSource("JSON", '{"unexpected":true}', c.parser, c.url)).toThrow();
  });
});

describe("Atom parser (Workspace updates)", () => {
  const c = cfg("workspace-gemini-feed");
  it("reads id, title, updated and decoded HTML content", () => {
    const [e] = parseSource("ATOM", fixture("workspace-gemini.atom"), c.parser, c.url);
    expect(e).toMatchObject({ title: "Gems become Skills in the Gemini app", date: "2026-10-07", url: "https://workspaceupdates.googleblog.com/2026/10/gems-skills.html" });
    expect(e!.text).toBe("Gems are now called Skills in the Gemini app.\nAvailable to Business and Enterprise customers.");
  });
});

describe("structure change", () => {
  it("gives 0 entries (caller raises an alarm) when the page has no matching headings", () => {
    const c = cfg("openai-chatgpt-rn");
    expect(parseSource("HTML", "<html><body><article><p>Moved!</p></article></body></html>", c.parser, c.url)).toEqual([]);
  });
});
