import { Icon, type IconName } from "@/components/ui/icons";
import type { Concept } from "@/server/sandbox/events";

// A few extra line icons the shared kit does not have yet (same 16px grid, 1.75 stroke, currentColor).
// Mindforward's own drawings — never vendor icons.

const LOCAL = {
  calendar: (
    <>
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="1.5" />
      <path d="M2.25 6.5h11.5M5.5 1.75v2.5M10.5 1.75v2.5" />
    </>
  ),
  table: (
    <>
      <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.5" />
      <path d="M2.25 6.25h11.5M2.25 9.75h11.5M6.5 6.25v7" />
    </>
  ),
  building: (
    <>
      <path d="M3 13.75V3.25l5-1.5v12M8 5.75h5v8" />
      <path d="M1.75 13.75h12.5M5.5 5.5v.01M5.5 8v.01M5.5 10.5v.01M10.5 8.5v.01M10.5 11v.01" />
    </>
  ),
  plug: <path d="M5.75 1.75v3M10.25 1.75v3M3.75 4.75h8.5v2.5a4.25 4.25 0 0 1-8.5 0ZM8 11.5v2.75" />,
  agent: (
    <>
      <rect x="3" y="5" width="10" height="7.75" rx="2" />
      <path d="M8 2.25V5M6 8.5v.5M10 8.5v.5M1.5 8.25v2M14.5 8.25v2" />
    </>
  ),
  assistant: (
    <>
      <circle cx="8" cy="5.75" r="2.75" />
      <path d="M3 14c.5-2.4 2.5-3.75 5-3.75S12.5 11.6 13 14M12.25 1.75v2.5M11 3h2.5" />
    </>
  ),
  refresh: <path d="M13.25 4.75v2.5h-2.5M2.75 11.25v-2.5h2.5M12.8 7A5 5 0 0 0 3.6 5.4M3.2 9a5 5 0 0 0 9.2 1.6" />,
  arrowUp: <path d="M8 13.25V2.75M3.75 7 8 2.75 12.25 7" />,
  sliders: <path d="M2.25 4.5h7M12.25 4.5h1.5M2.25 11.5h1.5M6.75 11.5h7M9.25 3v3M5.25 10v3" />,
  compose: <path d="M7.25 2.75H4a1.25 1.25 0 0 0-1.25 1.25v8A1.25 1.25 0 0 0 4 13.25h8A1.25 1.25 0 0 0 13.25 12V8.75M11.6 2.4a1.4 1.4 0 0 1 2 2L8.25 9.75 5.75 10.25l.5-2.5Z" />,
  apps: <path d="M3 3h.01M8 3h.01M13 3h.01M3 8h.01M8 8h.01M13 8h.01M3 13h.01M8 13h.01M13 13h.01" />,
  paperclip: <path d="M12.75 7.25 7.9 12.1a2.9 2.9 0 0 1-4.1-4.1l5.05-5.05a1.95 1.95 0 0 1 2.75 2.75L6.6 10.7a.95.95 0 0 1-1.35-1.35L9.75 4.9" />,
  folder: <path d="M2.25 4.25c0-.7.55-1.25 1.25-1.25h2.6l1.4 1.5h5c.7 0 1.25.55 1.25 1.25v6.25c0 .7-.55 1.25-1.25 1.25h-9c-.7 0-1.25-.55-1.25-1.25Z" />,
  artifact: (
    <>
      <rect x="4.75" y="4.75" width="9" height="9" rx="1.5" />
      <path d="M11.25 2.25H3.5c-.7 0-1.25.55-1.25 1.25v7.75" />
    </>
  ),
  bag: (
    <>
      <rect x="2.25" y="4.75" width="11.5" height="9" rx="1.5" />
      <path d="M5.75 4.75v-1.5c0-.55.45-1 1-1h2.5c.55 0 1 .45 1 1v1.5M2.25 8.5h11.5" />
    </>
  ),
  dots: <path d="M3.5 8h.01M8 8h.01M12.5 8h.01" />,
  mic: (
    <>
      <rect x="5.75" y="1.75" width="4.5" height="7.5" rx="2.25" />
      <path d="M3.25 7.5a4.75 4.75 0 0 0 9.5 0M8 12.25v2" />
    </>
  ),
  wave: <path d="M2.25 7v2M5 5v6M8 3v10M11 5v6M13.75 7v2" />,
  sidebar: (
    <>
      <rect x="2.25" y="2.75" width="11.5" height="10.5" rx="1.5" />
      <path d="M6.25 2.75v10.5" />
    </>
  ),
  filter: <path d="M2.25 4h11.5M4.5 8h7M6.75 12h2.5" />,
  sort: <path d="M5 13.25V2.75M2.75 5 5 2.75 7.25 5M11 2.75v10.5M8.75 11 11 13.25 13.25 11" />,
  globe: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M2.25 8h11.5M8 2.25c1.6 1.6 2.4 3.5 2.4 5.75S9.6 12.15 8 13.75C6.4 12.15 5.6 10.25 5.6 8S6.4 3.85 8 2.25Z" />
    </>
  ),
  notebook: (
    <>
      <rect x="3.25" y="1.75" width="9.5" height="12.5" rx="1.5" />
      <path d="M1.75 4.5h3M1.75 8h3M1.75 11.5h3M7 5h3.5" />
    </>
  ),
  shield: <path d="M8 1.75 2.75 3.75v4c0 3.1 2.2 5.3 5.25 6.5 3.05-1.2 5.25-3.4 5.25-6.5v-4Z M5.75 8l1.6 1.6 3-3.1" />,
  gear: (
    <>
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1.75v1.5M8 12.75v1.5M14.25 8h-1.5M3.25 8h-1.5M12.4 3.6l-1.05 1.05M4.65 11.35 3.6 12.4M12.4 12.4l-1.05-1.05M4.65 4.65 3.6 3.6" />
    </>
  ),
  star: <path d="m8 2.25 1.75 3.6 3.95.55-2.85 2.75.7 3.9L8 11.2l-3.55 1.85.7-3.9L2.3 6.4l3.95-.55Z" />,
  list: <path d="M5.75 4h8M5.75 8h8M5.75 12h8M2.25 4h.01M2.25 8h.01M2.25 12h.01" />,
  memory: (
    <>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 4.75V8l2.25 1.5" />
    </>
  ),
} as const;

export type LocalIconName = keyof typeof LOCAL;

export function SbIcon({ name, size = 16, className = "" }: { name: LocalIconName | IconName; size?: number; className?: string }) {
  if (!(name in LOCAL)) return <Icon name={name as IconName} size={size} className={className} />;
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {LOCAL[name as LocalIconName]}
    </svg>
  );
}

export const CONCEPT_ICON: Record<Concept, LocalIconName | IconName> = {
  CHAT: "chat",
  ASSISTANTS: "assistant",
  CONNECTORS: "plug",
  AUTOMATIONS: "clock",
  AGENTS: "agent",
  MAIL: "mail",
  CALENDAR: "calendar",
  FILES: "file",
  CRM: "building",
  SHEET: "table",
  SEARCH: "search",
  ARTIFACTS: "artifact",
  SKILLS: "bag",
  PLUGINS: "bag",
  NOTEBOOKS: "notebook",
};

/** Concepts that belong to the practice model (vs. Nordlys' simulated work systems) — only used to group the nav. */
export const MODEL_CONCEPTS: Concept[] = ["CHAT", "ASSISTANTS", "CONNECTORS", "AUTOMATIONS", "AGENTS"];
