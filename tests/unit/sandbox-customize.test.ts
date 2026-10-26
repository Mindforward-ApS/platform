import { describe, expect, it } from "vitest";
import { loadCustomizeCatalog } from "@/server/sandbox/customize-catalog";
import { applyEvent, initialState, normalizeState } from "@/server/sandbox/reducer";

// Tilpasning (workpane shell): skills and plugins from the catalog, added/removed in the session only.
const set = (key: string, value: string) => ({ type: "SETTING_CHANGED" as const, actor: "USER" as const, payload: { key, value } });

describe("customize catalog", () => {
  it("loads skills and plugins with unique ids and every section filled", () => {
    const c = loadCustomizeCatalog();
    for (const list of [c.skills, c.plugins]) {
      expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
      for (const section of ["forYou", "new", "popular"]) expect(list.some((i) => i.section === section)).toBe(true);
    }
  });
});

describe("skills and plugins in the session state", () => {
  it("adds and removes, and leaves the initial state without the key", () => {
    expect(initialState().installed).toBeUndefined();
    let s = applyEvent(initialState(), set("skill-added", "pdf"));
    s = applyEvent(s, set("skill-added", "pdf"));
    s = applyEvent(s, set("plugin-added", "sales"));
    expect(s.installed).toEqual({ skills: ["pdf"], plugins: ["sales"] });
    s = applyEvent(s, set("skill-removed", "pdf"));
    expect(s.installed).toEqual({ skills: [], plugins: ["sales"] });
    expect(normalizeState(JSON.parse(JSON.stringify(s))).installed).toEqual({ skills: [], plugins: ["sales"] });
    expect(normalizeState({}).installed).toBeUndefined();
  });

  it("ignores other setting keys", () => {
    expect(applyEvent(initialState(), set("effort", "max")).installed).toBeUndefined();
  });
});
