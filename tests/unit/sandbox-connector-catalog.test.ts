import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { SandboxEventInput } from "@/server/sandbox/events";
import { initialState, replay } from "@/server/sandbox/reducer";
import { availableTools } from "@/server/sandbox/tools";

// Connector catalog in the sandbox (Marco 26 Oct 2026: "brug de rigtige connector-navne"): several catalog connectors
// can reach the same Nordlys data, disconnecting one keeps the others, and each can be switched off per chat.

const ev = (type: string, payload: Record<string, unknown>) => ({ type, actor: "USER", payload }) as unknown as SandboxEventInput;
const grant = (connectorId: string, via: string, scopes: string[], approval: string[] = []) => ev("CONNECTOR_PERMISSION_GRANTED", { connectorId, via, scopes, approval });
const names = (state: ReturnType<typeof initialState>) => availableTools(state).map((t) => t.name).sort();

describe("catalog connectors in the sandbox state", () => {
  it("unions grants from several connectors and tracks which connector granted what", () => {
    const s = replay([grant("mail", "gmail", ["mail.read"]), grant("mail", "microsoft-365", ["mail.read", "mail.draft"], ["mail.draft"])]);
    expect(s.connectors.mail).toMatchObject({ connected: true, via: ["gmail", "microsoft-365"] });
    expect([...s.connectors.mail.scopes].sort()).toEqual(["mail.draft", "mail.read"]);
    expect(s.connectors.mail.approval).toEqual(["mail.draft"]);
    expect(s.catalog?.linked).toEqual(["gmail", "microsoft-365"]);
  });

  it("disconnecting one connector keeps the data if another still reaches it", () => {
    const s = replay([grant("mail", "gmail", ["mail.read"]), grant("mail", "microsoft-365", ["mail.read"]), ev("CONNECTOR_DISCONNECTED", { connectorId: "mail", via: "gmail" })]);
    expect(s.connectors.mail).toMatchObject({ connected: true, via: ["microsoft-365"] });
    const t = replay([ev("CONNECTOR_DISCONNECTED", { connectorId: "mail", via: "microsoft-365" })], s);
    expect(t.connectors.mail).toEqual({ connected: false, scopes: [] });
  });

  it("old events without `via` still connect and disconnect as before", () => {
    const s = replay([ev("CONNECTOR_PERMISSION_GRANTED", { connectorId: "files", scopes: ["files.read"] })]);
    expect(s.connectors.files).toEqual({ connected: true, scopes: ["files.read"] });
    expect(replay([ev("CONNECTOR_DISCONNECTED", { connectorId: "files" })], s).connectors.files).toEqual({ connected: false, scopes: [] });
  });

  it("links connectors without Nordlys data, and the per-chat switch removes the model's tools", () => {
    const s = replay([ev("SETTING_CHANGED", { key: "connector-linked", value: "slack" }), grant("mail", "gmail", ["mail.read"])]);
    expect(s.catalog?.linked).toEqual(["slack", "gmail"]);
    expect(names(s)).toEqual(["mail_read", "mail_search"]);
    const off = replay([ev("SETTING_CHANGED", { key: "chat-connector-off", value: "gmail" })], s);
    expect(names(off)).toEqual([]);
    expect(names(replay([ev("SETTING_CHANGED", { key: "chat-connector-on", value: "gmail" })], off))).toEqual(["mail_read", "mail_search"]);
    expect(replay([ev("SETTING_CHANGED", { key: "connector-unlinked", value: "slack" })], s).catalog?.linked).toEqual(["gmail"]);
  });
});

describe("content/sandbox-connectors/catalog.json", () => {
  const file = JSON.parse(readFileSync("content/sandbox-connectors/catalog.json", "utf8")) as { connectors: { id: string; name: string; data: string[] }[] };
  it("holds names as text only: no logos, colours, fonts or URLs", () => {
    expect(JSON.stringify(file)).not.toMatch(/https?:|\.svg|\.png|#[0-9a-f]{6}\b|rgb\(|logo|font/i);
  });
  it("has the well-known connectors with Nordlys data mapped", () => {
    const by = new Map(file.connectors.map((c) => [c.name, c.data]));
    expect(by.get("Gmail")).toEqual(["mail"]);
    expect(by.get("Google Drive")).toEqual(["files"]);
    expect(by.get("Microsoft 365")).toEqual(["mail", "calendar", "files"]);
    expect(by.get("Slack")).toEqual([]);
    expect(file.connectors.length).toBeGreaterThan(800);
  });
});
