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
  paperclip: <path d="M12.75 7.25 7.9 12.1a2.9 2.9 0 0 1-4.1-4.1l5.05-5.05a1.95 1.95 0 0 1 2.75 2.75L6.6 10.7a.95.95 0 0 1-1.35-1.35L9.75 4.9" />,
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
};

/** Concepts that belong to the practice model (vs. Nordlys' simulated work systems) — only used to group the nav. */
export const MODEL_CONCEPTS: Concept[] = ["CHAT", "ASSISTANTS", "CONNECTORS", "AUTOMATIONS", "AGENTS"];
