import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { daSandbox } from "@/lib/i18n/da-sandbox";

// docs/04 § 3 + § 13 / docs/10 § 4: no vendor names, logos or colours in sandbox components and skins (only the
// fixed disclaimer), and the sandbox only talks to its own API (+ Anthropic server-side, mocked in tests).

const VENDORS = /chatgpt|openai|copilot|microsoft|claude|anthropic|gemini|google/i;
const DISCLAIMER = "Øvemiljø. Ikke tilknyttet eller godkendt af OpenAI, Microsoft, Anthropic eller Google.";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

describe("trademark / asset scan", () => {
  const components = walk("src/components/sandbox");

  it("finds the sandbox component files", () => {
    expect(components.length).toBeGreaterThan(3);
  });

  for (const file of components) {
    it(`${file}: no vendor names`, () => {
      expect(readFileSync(file, "utf8").replaceAll(DISCLAIMER, "")).not.toMatch(VENDORS);
    });
  }

  for (const file of walk("content/sandbox-skins")) {
    it(`${file}: only layout data — no vendor names, colours, fonts, logos or URLs`, () => {
      const key = basename(file, ".json");
      // The file's own skin key (= Track.skinKey identifier) is the only allowed occurrence.
      const text = readFileSync(file, "utf8").replace(`"key": "${key}"`, "");
      expect(text).not.toMatch(VENDORS);
      expect(text).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|font|logo|icon|https?:|\.svg|\.png/i);
    });
  }

  it("the sandbox strings mention vendors only in the disclaimer", () => {
    const strings = JSON.stringify(daSandbox).replaceAll(DISCLAIMER, "");
    expect(strings).not.toMatch(VENDORS);
    expect(daSandbox.disclaimer).toBe(DISCLAIMER);
    expect(daSandbox.modelLabel).toBe("Øvemodel");
  });

  it("the disclaimer bar is rendered by the shell and cannot be closed", () => {
    const app = readFileSync("src/components/sandbox/sandbox-app.tsx", "utf8");
    expect(app).toMatch(/<DisclaimerBar \/>/);
    const bar = app.slice(app.indexOf("export function DisclaimerBar"), app.indexOf("export function SandboxApp"));
    expect(bar).not.toMatch(/onClick|button|useState/);
  });

  it("every model answer is labelled Øvemodel", () => {
    expect(readFileSync("src/components/sandbox/chat-panel.tsx", "utf8")).toMatch(/turn\.role === "assistant" \? t\.modelLabel/);
  });
});

describe("network allowlist (docs/04 § 1)", () => {
  const clientFiles = [...walk("src/components/sandbox"), "src/app/(learner)/sandkasse/[track]/page.tsx"];

  it("client code only fetches its own /api/sandbox endpoints", () => {
    for (const file of clientFiles) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/https?:\/\//);
      expect(src, file).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|new Image\(/);
      for (const m of src.matchAll(/fetch\(([^,)]+)/g)) expect(m[1], file).toMatch(/^(actionsUrl|chatUrl)\(/);
    }
    const api = readFileSync("src/components/sandbox/api.ts", "utf8");
    expect(api).toMatch(/`\/api\/sandbox\/\$\{encodeURIComponent\(sessionId\)\}\/actions`/);
    expect(api).toMatch(/`\/api\/sandbox\/\$\{encodeURIComponent\(sessionId\)\}\/chat`/);
  });

  it("server sandbox code makes no network calls; only src/server/ai/client.ts talks to Anthropic", () => {
    for (const file of walk("src/server/sandbox")) {
      const src = readFileSync(file, "utf8");
      expect(src, file).not.toMatch(/\bfetch\(|httpRequest\(|https?:\/\/|from "node:(http|https|net)"|@anthropic-ai\/sdk/);
    }
    const sdkImporters = walk("src").filter((f) => /from "@anthropic-ai\/sdk"/.test(readFileSync(f, "utf8")));
    expect(sdkImporters.sort()).toEqual(["src/server/ai/client.ts", "src/server/ai/gateway.ts"]);
    expect(readFileSync("src/server/ai/gateway.ts", "utf8")).toMatch(/import type Anthropic from "@anthropic-ai\/sdk"/); // types only
  });

  it("with AI_MOCK the gateway and tools perform no network request at all", async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new Error("network disabled in tests")));
    vi.stubGlobal("fetch", fetchSpy);
    const { mockProvider } = await import("@/server/ai/client");
    const { executeTool } = await import("@/server/sandbox/tools");
    const { loadWorld } = await import("@/server/sandbox/world");
    const { applyEvent, initialState } = await import("@/server/sandbox/reducer");
    const state = applyEvent(initialState(), { type: "CONNECTOR_PERMISSION_GRANTED", actor: "USER", payload: { connectorId: "mail", scopes: ["mail.read"] } });
    executeTool("mail_search", { query: "faktura" }, { world: loadWorld(), state, anchor: new Date() });
    const ac = new AbortController();
    await mockProvider().send({ model: "claude-haiku-4-5", max_tokens: 10, messages: [{ role: "user", content: "Hej" }] }, { signal: ac.signal });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
