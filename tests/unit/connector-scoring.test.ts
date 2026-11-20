import { describe, expect, it } from "vitest";
import { scoreConnectors, type ScoringConnector } from "@/server/connectors/scoring";

const tasks = [
  { taskId: "bogforing", weight: 5 },
  { taskId: "mail", weight: 3 },
  { taskId: "tilbud", weight: 2 },
];
const verified = (status: "OFFICIAL" | "THIRD_PARTY") => ({ status, sourceUrl: "https://example.test/src", lastVerifiedAt: new Date("2026-10-15") });

const connectors: ScoringConnector[] = [
  { id: "outlook", name: "Microsoft 365", taskIds: ["mail"], systemIds: ["m365"], availability: { CLAUDE: verified("OFFICIAL"), COPILOT: verified("OFFICIAL") } },
  { id: "economic", name: "e-conomic", taskIds: ["bogforing", "tilbud"], systemIds: ["economic"], availability: { CLAUDE: verified("THIRD_PARTY"), CHATGPT: { status: "UNVERIFIED", sourceUrl: null, lastVerifiedAt: null } } },
  { id: "drive", name: "Google Drive", taskIds: ["tilbud"], systemIds: ["gws"], availability: { CLAUDE: verified("OFFICIAL"), CHATGPT: verified("OFFICIAL") } },
  { id: "noproof", name: "Uden kilde", taskIds: ["bogforing"], systemIds: [], availability: { CLAUDE: { status: "OFFICIAL", sourceUrl: null, lastVerifiedAt: null } } },
];

describe("connector scoring", () => {
  it("scores = sum(task weight × covers) + bonus per selected system, official before third party", () => {
    const r = scoreConnectors({ tasks, connectors, selectedSystemIds: ["economic"], platform: "CLAUDE" });
    expect(r.recommended.map((c) => [c.id, c.score, c.status])).toEqual([
      ["outlook", 3, "OFFICIAL"],
      ["drive", 2, "OFFICIAL"],
      ["economic", 5 + 2 + 3, "THIRD_PARTY"],
    ]);
    expect(r.recommended[2]?.coveredTaskIds).toEqual(["bogforing", "tilbud"]);
  });

  it("never recommends a connector without a source URL and verification date, even if marked official", () => {
    const r = scoreConnectors({ tasks, connectors, selectedSystemIds: [], platform: "CLAUDE" });
    expect(r.recommended.find((c) => c.id === "noproof")).toBeUndefined();
    expect(r.unavailable.find((c) => c.id === "noproof")).toBeDefined();
  });

  it("puts connectors without verified availability on the chosen platform under 'not available yet'", () => {
    const r = scoreConnectors({ tasks, connectors, selectedSystemIds: [], platform: "CHATGPT" });
    expect(r.recommended.map((c) => c.id)).toEqual(["drive"]);
    expect(r.unavailable.map((c) => c.id)).toEqual(["economic", "noproof", "outlook"]);
  });

  it("leaves out connectors that cover none of the industry's tasks and none of the chosen systems", () => {
    const r = scoreConnectors({ tasks: [{ taskId: "mail", weight: 1 }], connectors, selectedSystemIds: [], platform: "CLAUDE" });
    expect(r.recommended.map((c) => c.id)).toEqual(["outlook"]);
    expect(r.unavailable).toEqual([]);
  });
});
