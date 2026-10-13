import type { ConnectorId, CrmField, SandboxEventInput, Scope, Trigger } from "./events";
import { CONNECTOR_IDS } from "./events";

// Pure, deterministic reducer: applyEvent(state, event) → new state (docs/04-sandkasse.md § 2, state shape § 9).
// The state only holds numbers, booleans, ids and enums — never free text. It is the overlay on the seed world
// and the end-state snapshot that `{ "state": … }` predicates read.

export interface SandboxState {
  chat: { active: { id: string | null; assistantId?: string; attachments: string[]; messageCount: number }; conversations: number };
  connectors: Record<ConnectorId, { connected: boolean; scopes: Scope[] }>;
  assistants: Array<{ id: string; knowledgeFileIds: string[]; connectorIds: string[]; starterCount: number; instructionCharCount: number }>;
  automations: Array<{ id: string; enabled: boolean; trigger: Trigger; actionTypes: string[]; testRuns: number; simulatedRuns: number }>;
  mail: { draftsCount: number; sentCount: number; externalSentCount: number; draftIds: string[] };
  calendar: { createdEventIds: string[] };
  files: { createdFileIds: string[] };
  /** `values` holds enum/number field values after edits (notes excluded — they are free text). */
  crm: { updated: Record<string, CrmField[]>; values: Record<string, Partial<Record<CrmField, string | number>>> };
  sheet: { editedCells: string[]; values: Record<string, string | number> };
  agent: { tasks: Array<{ id: string; stepsRun: number; stepsRejected: number }> };
  clock: { dayOffset: number };
}

export function initialState(): SandboxState {
  return {
    chat: { active: { id: null, attachments: [], messageCount: 0 }, conversations: 0 },
    connectors: Object.fromEntries(CONNECTOR_IDS.map((c) => [c, { connected: false, scopes: [] }])) as unknown as SandboxState["connectors"],
    assistants: [],
    automations: [],
    mail: { draftsCount: 0, sentCount: 0, externalSentCount: 0, draftIds: [] },
    calendar: { createdEventIds: [] },
    files: { createdFileIds: [] },
    crm: { updated: {}, values: {} },
    sheet: { editedCells: [], values: {} },
    agent: { tasks: [] },
    clock: { dayOffset: 0 },
  };
}

const addUnique = <T>(list: T[], ...items: T[]): T[] => [...list, ...items.filter((i) => !list.includes(i))];

export function applyEvent(prev: SandboxState, event: SandboxEventInput): SandboxState {
  const s = structuredClone(prev);
  switch (event.type) {
    case "SESSION_RESET":
      return initialState();

    case "CHAT_CONVERSATION_STARTED":
      s.chat.active = { id: event.payload.conversationId, attachments: [], messageCount: 0 };
      if (event.payload.assistantId) s.chat.active.assistantId = event.payload.assistantId;
      s.chat.conversations += 1;
      return s;
    case "CHAT_MESSAGE_SENT":
      if (s.chat.active.id === event.payload.conversationId) {
        s.chat.active.messageCount += 1;
        s.chat.active.attachments = addUnique(s.chat.active.attachments, ...event.payload.attachmentFileIds);
      }
      return s;
    case "CHAT_RESPONSE_RECEIVED":
      if (s.chat.active.id === event.payload.conversationId) s.chat.active.messageCount += 1;
      return s;
    case "CHAT_FILE_ATTACHED":
      if (s.chat.active.id === event.payload.conversationId) s.chat.active.attachments = addUnique(s.chat.active.attachments, event.payload.fileId);
      return s;

    case "MAIL_DRAFT_SAVED":
      s.mail.draftIds = addUnique(s.mail.draftIds, event.payload.draftId);
      s.mail.draftsCount = s.mail.draftIds.length;
      return s;
    case "MAIL_SENT":
      s.mail.draftIds = s.mail.draftIds.filter((d) => d !== event.payload.draftId);
      s.mail.draftsCount = s.mail.draftIds.length;
      s.mail.sentCount += 1;
      if (event.payload.externalRecipientCount > 0) s.mail.externalSentCount += 1;
      return s;

    case "CALENDAR_EVENT_CREATED":
      s.calendar.createdEventIds = addUnique(s.calendar.createdEventIds, event.payload.eventId);
      return s;
    case "FILE_CREATED":
      s.files.createdFileIds = addUnique(s.files.createdFileIds, event.payload.fileId);
      return s;

    case "CRM_RECORD_UPDATED": {
      const { customerId, field, next } = event.payload;
      s.crm.updated[customerId] = addUnique(s.crm.updated[customerId] ?? [], field);
      if (field !== "notes") s.crm.values[customerId] = { ...s.crm.values[customerId], [field]: next };
      return s;
    }
    case "SHEET_CELL_EDITED":
      s.sheet.editedCells = addUnique(s.sheet.editedCells, event.payload.cell);
      s.sheet.values[event.payload.cell] = event.payload.next;
      return s;

    case "ASSISTANT_CREATED":
    case "ASSISTANT_UPDATED": {
      const p = event.payload;
      const next = { id: p.assistantId, knowledgeFileIds: [...p.knowledgeFileIds], connectorIds: [...p.connectorIds], starterCount: p.starterCount, instructionCharCount: p.instructionCharCount };
      const i = s.assistants.findIndex((a) => a.id === p.assistantId);
      if (i >= 0) s.assistants[i] = next;
      else s.assistants.push(next);
      return s;
    }
    case "ASSISTANT_KNOWLEDGE_ADDED": {
      const a = s.assistants.find((x) => x.id === event.payload.assistantId);
      if (a) a.knowledgeFileIds = addUnique(a.knowledgeFileIds, event.payload.fileId);
      return s;
    }

    case "CONNECTOR_PERMISSION_GRANTED":
      s.connectors[event.payload.connectorId] = { connected: true, scopes: [...new Set(event.payload.scopes)] };
      return s;
    case "CONNECTOR_DISCONNECTED":
      s.connectors[event.payload.connectorId] = { connected: false, scopes: [] };
      return s;

    case "AUTOMATION_CREATED":
    case "AUTOMATION_UPDATED": {
      const p = event.payload;
      const i = s.automations.findIndex((a) => a.id === p.automationId);
      const base = i >= 0 ? s.automations[i] : undefined;
      const next = { id: p.automationId, enabled: base?.enabled ?? false, trigger: p.trigger, actionTypes: p.actions.map((a) => a.type), testRuns: base?.testRuns ?? 0, simulatedRuns: base?.simulatedRuns ?? 0 };
      if (i >= 0) s.automations[i] = next;
      else s.automations.push(next);
      return s;
    }
    case "AUTOMATION_ENABLED":
    case "AUTOMATION_DISABLED": {
      const a = s.automations.find((x) => x.id === event.payload.automationId);
      if (a) a.enabled = event.type === "AUTOMATION_ENABLED";
      return s;
    }
    case "AUTOMATION_TEST_RUN": {
      const a = s.automations.find((x) => x.id === event.payload.automationId);
      if (a) a.testRuns += 1;
      return s;
    }
    case "AUTOMATION_RUN_SIMULATED": {
      const a = s.automations.find((x) => x.id === event.payload.automationId);
      if (a) a.simulatedRuns += 1;
      s.clock.dayOffset = Math.max(s.clock.dayOffset, event.payload.simulatedDayOffset);
      return s;
    }

    case "AGENT_TASK_STARTED":
      if (!s.agent.tasks.some((t) => t.id === event.payload.agentTaskId)) s.agent.tasks.push({ id: event.payload.agentTaskId, stepsRun: 0, stepsRejected: 0 });
      return s;
    case "AGENT_STEP_APPROVED":
    case "AGENT_STEP_REJECTED": {
      const t = s.agent.tasks.find((x) => x.id === event.payload.agentTaskId);
      if (t && event.type === "AGENT_STEP_APPROVED") t.stepsRun += 1;
      if (t && event.type === "AGENT_STEP_REJECTED") t.stepsRejected += 1;
      return s;
    }
    case "AGENT_TASK_COMPLETED": {
      const t = s.agent.tasks.find((x) => x.id === event.payload.agentTaskId);
      if (t) Object.assign(t, { stepsRun: event.payload.stepsRun, stepsRejected: event.payload.stepsRejected });
      return s;
    }

    // Observational events: recorded for assertions, no change to the overlay.
    case "SESSION_STARTED":
    case "UI_CLICKED":
    case "UI_NAVIGATED":
    case "SETTING_CHANGED":
    case "CHAT_RESPONSE_REGENERATED":
    case "CHAT_RESPONSE_COPIED":
    case "CHAT_RESPONSE_RATED":
    case "PII_WARNING_SHOWN":
    case "PII_BLOCKED":
    case "MAIL_OPENED":
    case "CALENDAR_EVENT_OPENED":
    case "FILE_OPENED":
    case "CRM_RECORD_OPENED":
    case "CRM_FILTER_APPLIED":
    case "SHEET_OPENED":
    case "ASSISTANT_USED":
    case "CONNECTOR_CONNECT_STARTED":
    case "CONNECTOR_PERMISSION_DENIED":
    case "TOOL_CALL_EXECUTED":
      return s;
  }
}

export function replay(events: SandboxEventInput[], from: SandboxState = initialState()): SandboxState {
  return events.reduce(applyEvent, from);
}

/** Loose runtime guard for state read back from the DB (older sessions may miss newer keys). */
export function normalizeState(raw: unknown): SandboxState {
  const base = initialState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<SandboxState>;
  return {
    ...base,
    ...r,
    chat: { ...base.chat, ...r.chat, active: { ...base.chat.active, ...r.chat?.active } },
    connectors: { ...base.connectors, ...r.connectors },
    mail: { ...base.mail, ...r.mail },
    crm: { ...base.crm, ...r.crm },
    sheet: { ...base.sheet, ...r.sheet },
    clock: { ...base.clock, ...r.clock },
  };
}
