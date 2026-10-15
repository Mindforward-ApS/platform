import type { SkinConfig } from "@/server/sandbox/skin-schema";
import type { SandboxState } from "@/server/sandbox/reducer";

// Serializable props the sandbox page hands to the client shell (seed world projected for this session).

export interface MailItem {
  id: string;
  fromName: string;
  fromEmail: string;
  to: string[];
  subject: string;
  dateLabel: string;
  time: string;
  body: string;
  attachments: string[];
}
export interface CalendarItem {
  id: string;
  dayOffset: number;
  dateLabel: string;
  start: string;
  end: string;
  title: string;
  attendees: string[];
  note?: string;
}
export interface FileItem {
  id: string;
  name: string;
  kind: "doc" | "table" | "sheet";
  summary: string;
  body?: string;
  confidential: boolean;
}
export interface CustomerItem {
  id: string;
  name: string;
  industry: string;
  city: string;
  segment: "A" | "B" | "C" | null;
  status: "ACTIVE" | "LEAD" | "TRIAL" | "CANCELED";
  annualRevenueDkk: number;
  contact: string;
  nps: number | null;
}
export interface SheetCellView {
  value: string | number;
  formula?: string;
  note?: string;
}
export interface ChatTurnView {
  seq: number;
  role: "user" | "assistant";
  text: string;
}

/** A link in the track switcher. Label and href are passed in from Track data, never hardcoded here. */
export interface TrackLink {
  href: string;
  label: string;
  current: boolean;
}

export type PracticeKind = "office" | "files" | "chat" | "projects" | "crm" | "shop" | "payments" | "design" | "accounting" | "jobs" | "automation";

/** The learner's industry connectors under neutral names (src/server/connectors/practice.ts). null = no work profile yet. */
export interface PracticeView {
  industry: string;
  canDemo: boolean;
  items: { kind: PracticeKind; useCase: string | null; demo: { id: string; title: string; prompt: string; data: Record<string, Record<string, string | number | boolean>[]> } | null }[];
}

export interface SandboxProps {
  sessionId: string;
  /** Opgavevisning: the module step this sandbox is opened for. Every event is tagged with it (validated server-side). */
  stepId?: string;
  /** "page" = full-height free play (/sandkasse); "task" = embedded next to a task in the module player. */
  variant?: "page" | "task";
  practice?: PracticeView | null;
  tracks?: TrackLink[];
  skin: SkinConfig;
  initialState: SandboxState;
  conversationId: string | null;
  turns: ChatTurnView[];
  world: {
    mail: MailItem[];
    calendar: CalendarItem[];
    files: FileItem[];
    crm: CustomerItem[];
    sheet: Record<string, SheetCellView>;
  };
}

export type Intent = { event: { type: string; target?: string; stepId?: string; payload: Record<string, unknown> }; contentText?: string; piiOverride?: boolean };
