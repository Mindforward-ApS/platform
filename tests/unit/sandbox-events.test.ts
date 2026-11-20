import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSandboxEventJsonSchema } from "@/server/sandbox/event-json-schema";
import { SANDBOX_EVENT_TYPES, defaultTarget, sandboxEventInputSchema } from "@/server/sandbox/events";
import { EXAMPLE_EVENTS } from "../fixtures/sandbox-events";

describe("SandboxEvent catalogue (docs/04 § 9)", () => {
  it("matches the Prisma SandboxEventType enum exactly", () => {
    const prismaTypes = readFileSync("prisma/schema.prisma", "utf8")
      .match(/enum SandboxEventType \{([^}]*)\}/)?.[1]
      ?.split("\n")
      .map((l) => l.trim().split(/\s/)[0])
      .filter((t): t is string => Boolean(t && /^[A-Z_]+$/.test(t)));
    expect([...SANDBOX_EVENT_TYPES].sort()).toEqual([...(prismaTypes ?? [])].sort());
  });

  for (const type of SANDBOX_EVENT_TYPES) {
    it(`${type}: the example is valid`, () => {
      expect(sandboxEventInputSchema.safeParse(EXAMPLE_EVENTS[type]).success).toBe(true);
    });
    it(`${type}: rejects an unknown payload key (no free-text smuggling)`, () => {
      const bad = { ...EXAMPLE_EVENTS[type], payload: { ...EXAMPLE_EVENTS[type].payload, text: "Hej Hanne, beklager forsinkelsen" } };
      expect(sandboxEventInputSchema.safeParse(bad).success).toBe(false);
    });
  }

  it("rejects unknown envelope keys and unknown types", () => {
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.MAIL_OPENED, contentText: "x" }).success).toBe(false);
    expect(sandboxEventInputSchema.safeParse({ type: "MAIL_DELETED", actor: "USER", payload: {} }).success).toBe(false);
  });

  it("rejects free text in id/token fields", () => {
    const sentence = "Skriv et svar til Hanne om forsinkelserne";
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.UI_CLICKED, payload: { region: "nav", control: sentence } }).success).toBe(false);
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.SETTING_CHANGED, payload: { key: "tone", value: sentence } }).success).toBe(false);
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.MAIL_OPENED, payload: { mailId: sentence } }).success).toBe(false);
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.SHEET_CELL_EDITED, payload: { ...EXAMPLE_EVENTS.SHEET_CELL_EDITED.payload, next: sentence } }).success).toBe(false);
  });

  it("CRM notes carry only a length, never the note", () => {
    const base = EXAMPLE_EVENTS.CRM_RECORD_UPDATED;
    expect(sandboxEventInputSchema.safeParse({ ...base, payload: { customerId: "k05", field: "notes", next: 120 } }).success).toBe(true);
    expect(sandboxEventInputSchema.safeParse({ ...base, payload: { customerId: "k05", field: "notes", next: "LEAD" } }).success).toBe(false);
  });

  it("targets are kebab-case with dots (docs/00 § 10a)", () => {
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.UI_CLICKED, target: "nav.newChat" }).success).toBe(false);
    expect(sandboxEventInputSchema.safeParse({ ...EXAMPLE_EVENTS.MAIL_OPENED, target: "mail:m08" }).success).toBe(false);
    expect(defaultTarget(EXAMPLE_EVENTS.UI_CLICKED)).toBe("nav.new-chat");
    expect(defaultTarget(EXAMPLE_EVENTS.MAIL_OPENED)).toBe("mail.m08");
    expect(defaultTarget(EXAMPLE_EVENTS.FILE_OPENED)).toBe("file.f13");
    expect(defaultTarget(EXAMPLE_EVENTS.CRM_RECORD_OPENED)).toBe("crm.k12");
    expect(defaultTarget(EXAMPLE_EVENTS.CALENDAR_EVENT_OPENED)).toBe("cal.c04");
  });

  it("content/schema/sandbox-event.schema.json is generated from the Zod schemas (run pnpm sandbox:schema)", () => {
    const committed = JSON.parse(readFileSync("content/schema/sandbox-event.schema.json", "utf8")) as unknown;
    expect(committed).toEqual(buildSandboxEventJsonSchema());
  });
});
