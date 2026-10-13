import { z } from "zod";
import { CONCEPTS } from "./events";

// SkinConfig (docs/04-sandkasse.md § 3). A skin only chooses layout regions, which concepts are on and generic menu
// terms from a closed list. It never carries colours, fonts, icons, logos or vendor names — those come from Greb's
// own tokens. Pure module (no fs) so client components can share the types.

/** Closed list of generic menu terms (i18n keys in src/lib/i18n/da-sandbox.ts → terms). */
export const TERM_KEYS = [
  "chat", "newChat", "history", "assistants", "newAssistant", "connectors", "automations", "agents", "mail", "calendar",
  "files", "crm", "sheet", "attach", "tools", "settings", "notifications", "reset",
] as const;
export type TermKey = (typeof TERM_KEYS)[number];

/** Nav ids are the `control` part of UI_CLICKED targets ("nav.<id>"), shared across skins so one module fits several tracks. */
export const NAV_IDS = [
  "new-chat", "chat", "assistants", "connectors", "automations", "agents", "mail", "calendar", "files", "crm", "sheet", "settings", "notifications",
] as const;
export type NavId = (typeof NAV_IDS)[number];

export const SHELLS = ["SIDEBAR_CHAT", "APP_RAIL_SIDE_PANEL", "SIDEBAR_CHAT_WORKPANE"] as const;
export type Shell = (typeof SHELLS)[number];

export const REGIONS = ["nav", "history", "chat", "composer", "workspace", "sidePanel", "notifications"] as const;
export type Region = (typeof REGIONS)[number];

export const SKIN_KEYS = ["chatgpt", "copilot", "claude", "gemini"] as const;

export const skinConfigSchema = z
  .strictObject({
    key: z.enum(SKIN_KEYS),
    version: z.string().regex(/^\d+(\.\d+){0,2}$/),
    shell: z.enum(SHELLS),
    regions: z.array(z.enum(REGIONS)).min(2),
    nav: z.array(z.strictObject({ id: z.enum(NAV_IDS), labelKey: z.enum(TERM_KEYS), concept: z.enum(CONCEPTS) })).min(1),
    composer: z.strictObject({ attachFromFiles: z.boolean(), toolsMenu: z.array(z.enum(TERM_KEYS)), modelPicker: z.literal(false) }),
    concepts: z.strictObject({ assistants: z.boolean(), connectors: z.boolean(), automations: z.boolean(), agents: z.boolean() }),
    tokens: z.strictObject({ density: z.enum(["compact", "comfortable"]), accentSlot: z.enum(["a", "b"]) }),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.regions).size !== s.regions.length) ctx.addIssue({ code: "custom", message: "duplicate region" });
    if (new Set(s.nav.map((n) => n.id)).size !== s.nav.length) ctx.addIssue({ code: "custom", message: "duplicate nav id" });
    if (!s.regions.includes("nav")) ctx.addIssue({ code: "custom", message: "nav region is required" });
    if (!s.regions.includes("chat") && !s.regions.includes("sidePanel")) ctx.addIssue({ code: "custom", message: "a chat or sidePanel region is required" });
  });

export type SkinConfig = z.infer<typeof skinConfigSchema>;
