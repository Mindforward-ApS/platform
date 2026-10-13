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

export interface SandboxProps {
  sessionId: string;
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

export type Intent = { event: { type: string; target?: string; payload: Record<string, unknown> }; contentText?: string; piiOverride?: boolean };
