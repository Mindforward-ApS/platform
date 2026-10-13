import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { excerpt, HELP_DIR, HelpIndex, loadArticles, parseArticle, renderPriceTokens, tokenize } from "@/server/support/help";

const articles = loadArticles();
const index = new HelpIndex(articles);

describe("help center articles (docs/08 § 5)", () => {
  it("ships at least 12 valid Danish articles with the required topics", () => {
    expect(articles.length).toBeGreaterThanOrEqual(12);
    const slugs = articles.map((a) => a.slug);
    for (const s of ["log-ind", "invitationer", "opsig-abonnement", "fortryd-aftale", "niveautest", "point-og-bestaaet", "sandkassen", "admin-rapport-og-privatliv", "certifikat", "kontakt"]) {
      expect(slugs).toContain(s);
    }
  });

  it("never contains a price as text (prices come from config via {{price:…}})", () => {
    for (const f of readdirSync(HELP_DIR)) {
      const raw = readFileSync(join(HELP_DIR, f), "utf8");
      expect(/\d[\d.,]*\s?(kr|dkk)\b/i.test(raw), f).toBe(false);
    }
    expect(renderPriceTokens("Pris: {{price:B2C_MONTHLY}}")).toMatch(/kr/);
    expect(() => renderPriceTokens("{{price:NOPE}}")).toThrow(/unknown price token/);
  });

  it("contains no banned AI Act claims or vendor-affiliation claims", () => {
    for (const a of articles) {
      const text = `${a.title}\n${a.body}`.toLowerCase();
      for (const banned of ["certificering", "lovkrav", "bøde", "påkrævet niveau", "officielt kursus", "samarbejder med openai"]) {
        expect(text.includes(banned), `${a.slug}: ${banned}`).toBe(false);
      }
    }
  });

  it("parses frontmatter and rejects invalid files", () => {
    const a = parseArticle("---\ntitle: Test artikel\nslug: test-artikel\naudience: [B2C]\nupdatedAt: 2026-10-13\nrelated: []\n---\nHej **verden**.");
    expect(a).toMatchObject({ slug: "test-artikel", audience: ["B2C"], body: "Hej **verden**." });
    expect(() => parseArticle("no frontmatter")).toThrow(/frontmatter/);
    expect(() => parseArticle("---\ntitle: X\nslug: Bad Slug\naudience: [B2C]\nupdatedAt: 2026-10-13\n---\nx")).toThrow();
  });

  it("finds the right article for common questions (title/keyword/stem match)", () => {
    expect(index.search("Hvordan opsiger jeg?")[0]?.slug).toBe("opsig-abonnement");
    expect(index.search("Kan min chef se hvad jeg skriver i opgaverne?")[0]?.slug).toBe("admin-rapport-og-privatliv");
    expect(index.search("fortrydelsesret penge tilbage")[0]?.slug).toBe("fortryd-aftale");
    expect(index.search("Er det ChatGPT der svarer i sandkassen?")[0]?.slug).toBe("sandkassen");
    expect(index.search("Mit kort er udløbet")[0]?.slug).toBe("betaling-fejlede");
    expect(index.search("Jeg har kun Copilot Chat, hvilke moduler?")[0]?.slug).toBe("copilot-chat-eller-licens");
    expect(index.search("hvordan inviterer jeg en kollega")[0]?.slug).toBe("invitationer");
  });

  it("returns at most 5 hits with excerpts and nothing for empty queries", () => {
    const hits = index.search("modul point certifikat sandkasse niveautest abonnement");
    expect(hits.length).toBeLessThanOrEqual(5);
    expect(hits[0]?.excerpt.length).toBeGreaterThan(10);
    expect(index.search("   ")).toEqual([]);
    expect(index.search("og i at")).toEqual([]);
  });

  it("tokenizes Danish letters and shortens excerpts on a word boundary", () => {
    expect(tokenize("Prøveperiode for Øvemodel")).toEqual(["prøveperiode", "øvemodel"]);
    const e = excerpt("ord ".repeat(100), 40);
    expect(e.length).toBeLessThanOrEqual(42);
    expect(e.endsWith("…")).toBe(true);
  });
});
