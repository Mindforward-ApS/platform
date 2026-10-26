import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyEvent, initialState } from "@/server/sandbox/reducer";
import { loadSkin, UnknownSkinError } from "@/server/sandbox/skin";
import { availableTools, buildSheetCells, executeTool, ToolInputError } from "@/server/sandbox/tools";
import { copenhagenDate, loadWorld, resolveDay, worldSummary } from "@/server/sandbox/world";
import { TRACKS } from "@/server/content/seed";

describe("skins (docs/04 § 3)", () => {
  it("every active track's skinKey has a valid skin file; the skin is chosen by data", () => {
    for (const t of TRACKS.filter((x) => x.isActive)) expect(loadSkin(t.skinKey).key).toBe(t.skinKey);
    const byTrack = (key: string) => loadSkin(TRACKS.find((t) => t.key === key)!.skinKey);
    expect(byTrack("CHATGPT").shell).toBe("SIDEBAR_CHAT");
    expect(byTrack("COPILOT").shell).toBe("APP_RAIL_SIDE_PANEL");
    expect(byTrack("CLAUDE").shell).toBe("SIDEBAR_CHAT_WORKPANE");
  });

  it("never offers a model picker and uses the same nav ids across skins", () => {
    const files = readdirSync("content/sandbox-skins").map((f) => f.replace(/\.json$/, ""));
    const skins = files.map(loadSkin);
    for (const s of skins) expect(s.composer.modelPicker).toBe(false);
    const ids = skins.map((s) => s.nav.map((n) => n.id).sort());
    // Same vocabulary (NAV_IDS), different order/regions; the workpane skin mirrors its tool's own sidebar.
    expect(new Set(ids.map((x) => x.join())).size).toBeLessThanOrEqual(3);
    expect(loadSkin("claude").nav.map((n) => n.id)).toEqual(["new-chat", "search", "assistants", "artifacts", "automations", "customize", "mail", "calendar", "files", "crm", "sheet"]);
  });

  it("rejects unknown or path-like skin keys", () => {
    expect(() => loadSkin("gemini")).toThrow(UnknownSkinError);
    expect(() => loadSkin("../sandbox-world/company")).toThrow(UnknownSkinError);
  });
});

describe("world (docs/04 § 4)", () => {
  it("loads and validates the seed with file bodies", () => {
    const w = loadWorld();
    expect(w.mail).toHaveLength(25);
    expect(Object.keys(w.fileBodies)).toHaveLength(14);
    expect(worldSummary(w)).toContain("Nordlys Logistik ApS");
  });

  it("anchors relative days in Europe/Copenhagen, also across DST", () => {
    // 23:30 UTC on 25 Oct 2026 is already 26 Oct in Copenhagen (CET after the DST switch).
    const anchor = new Date("2026-10-25T23:30:00Z");
    expect(copenhagenDate(anchor)).toBe("2026-10-26");
    expect(resolveDay(anchor, 0)).toBe("2026-10-26");
    expect(resolveDay(anchor, 21)).toBe("2026-11-16");
    expect(resolveDay(anchor, -3)).toBe("2026-10-23");
  });
});

describe("model tools run against session state only (docs/04 § 6)", () => {
  const world = loadWorld();
  const anchor = new Date("2026-10-13T08:00:00Z");
  const granted = (connectorId: "mail" | "crm" | "sheet" | "files" | "calendar", scope: string) =>
    applyEvent(initialState(), { type: "CONNECTOR_PERMISSION_GRANTED", actor: "USER", payload: { connectorId, scopes: [scope as "mail.read"] } });

  it("offers no tools until a connector is granted, and only for the granted scope", () => {
    expect(availableTools(initialState())).toEqual([]);
    expect(availableTools(granted("mail", "mail.read")).map((t) => t.name)).toEqual(["mail_search", "mail_read"]);
    expect(() => executeTool("crm_query", {}, { world, state: granted("mail", "mail.read"), anchor })).toThrow(ToolInputError);
  });

  it("mail_search returns at most 10 hits with short excerpts and reports filter names only", () => {
    const r = executeTool("mail_search", { query: "", from: "Sara" }, { world, state: granted("mail", "mail.read"), anchor });
    expect(r.filtersUsed).toEqual(["query", "from"]);
    const hits = r.result as { id: string; excerpt: string }[];
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.length).toBeLessThanOrEqual(10);
    for (const h of hits) expect(h.excerpt.length).toBeLessThanOrEqual(201);
  });

  it("crm_query filters and sorts; sheet_read returns A1 cells incl. the fuel formula bug", () => {
    const crm = executeTool("crm_query", { filter: { segment: "A" }, sort: "annualRevenueDkk", limit: 3 }, { world, state: granted("crm", "crm.read"), anchor });
    expect((crm.result as { id: string }[]).map((k) => k.id)[0]).toBe("k16");
    expect(crm.filtersUsed).toEqual(["filterSegment", "sort", "limit"]);
    const sheet = executeTool("sheet_read", { range: "F8" }, { world, state: granted("sheet", "sheet.read"), anchor });
    expect((sheet.result as Record<string, { formula?: string }>).F8!.formula).toMatch(/SUM\(B8:D8\)/);
  });

  it("rejects invalid tool arguments", () => {
    expect(() => executeTool("mail_read", { id: "https://example.com" }, { world, state: granted("mail", "mail.read"), anchor })).toThrow(ToolInputError);
  });

  it("sheet edits from the session overlay are visible to tools", () => {
    const state = applyEvent(granted("sheet", "sheet.read"), { type: "SHEET_CELL_EDITED", actor: "USER", payload: { sheetId: "f15", cell: "F8", next: "=SUM(B8:E8)", isFormula: true } });
    expect(buildSheetCells(world, state).F8!.formula).toBe("=SUM(B8:E8)");
  });
});
