import type { ConnectorId, CrmField, SandboxEventInput, Scope, Trigger } from "./events";
import { CONNECTOR_IDS } from "./events";

// Pure, deterministic reducer: applyEvent(state, event) → new state (docs/04-sandkasse.md § 2, state shape § 9).
// The state only holds numbers, booleans, ids and enums — never free text. It is the overlay on the seed world
// and the end-state snapshot that `{ "state": … }` predicates read.

export interface SandboxState {
  chat: { active: { id: string | null; assistantId?: string; attachments: string[]; messageCount: number }; conversations: number };
  /** Nordlys data reachable by the model. `via` = catalog connectors that granted it; empty = connected the old way. */
  connectors: Record<ConnectorId, { connected: boolean; scopes: Scope[]; via?: string[]; approval?: Scope[] }>;
  /** Catalog connectors the learner has connected (ids), and the ones switched off for the current chats. */
  catalog?: { linked: string[]; chatOff: string[] };
  /** Skills and plugins added under Tilpasning (catalog ids). Absent until the first one is added. */
  installed?: { skills: string[]; plugins: string[]; agents?: string[] };
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
    catalog: { linked: [], chatOff: [] },
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

    case "CONNECTOR_PERMISSION_GRANTED": {
      const p = event.payload;
      const prev = s.connectors[p.connectorId];
      if (!p.via) {
        s.connectors[p.connectorId] = { connected: true, scopes: [...new Set(p.scopes)] };
        return s;
      }
      // Several catalog connectors can reach the same Nordlys data (Gmail and Microsoft 365 → mail): union of grants.
      const via = addUnique(prev.via ?? [], p.via);
      s.connectors[p.connectorId] = {
        connected: true,
        scopes: [...new Set([...(prev.connected ? prev.scopes : []), ...p.scopes])],
        via,
        approval: [...new Set([...(prev.approval ?? []), ...(p.approval ?? [])])],
      };
      s.catalog = { linked: addUnique(s.catalog?.linked ?? [], p.via), chatOff: s.catalog?.chatOff ?? [] };
      return s;
    }
    case "CONNECTOR_DISCONNECTED": {
      const p = event.payload;
      const prev = s.connectors[p.connectorId];
      const via = (prev.via ?? []).filter((v) => v !== p.via);
      s.connectors[p.connectorId] = p.via && via.length > 0 ? { ...prev, via } : { connected: false, scopes: [] };
      if (p.via) s.catalog = { linked: (s.catalog?.linked ?? []).filter((v) => v !== p.via), chatOff: (s.catalog?.chatOff ?? []).filter((v) => v !== p.via) };
      return s;
    }

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

    case "SETTING_CHANGED": {
      // Catalog connectors without Nordlys data (e.g. Slack) are linked/unlinked here; "chat-connector-off/on" switches a
      // connected one off or on for the chats (the "+" menu). Value = the catalog id.
      const { key, value } = event.payload;
      if (typeof value !== "string") return s;
      const c = s.catalog ?? { linked: [], chatOff: [] };
      if (key === "connector-linked") s.catalog = { ...c, linked: addUnique(c.linked, value) };
      else if (key === "connector-unlinked") s.catalog = { linked: c.linked.filter((v) => v !== value), chatOff: c.chatOff.filter((v) => v !== value) };
      else if (key === "chat-connector-off") s.catalog = { ...c, chatOff: addUnique(c.chatOff, value) };
      else if (key === "chat-connector-on") s.catalog = { ...c, chatOff: c.chatOff.filter((v) => v !== value) };
      else if (/^(skill|plugin|agent)-(added|removed)$/.test(key)) {
        const i = s.installed ?? { skills: [], plugins: [] };
        const kind = key.startsWith("skill") ? "skills" : key.startsWith("plugin") ? "plugins" : "agents";
        const list = i[kind] ?? [];
        s.installed = { ...i, [kind]: key.endsWith("added") ? addUnique(list, value) : list.filter((v) => v !== value) };
      }
      return s;
    }

    // Observational events: recorded for assertions, no change to the overlay.
    case "SESSION_STARTED":
    case "UI_CLICKED":
    case "UI_NAVIGATED":
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
    catalog: { linked: r.catalog?.linked ?? [], chatOff: r.catalog?.chatOff ?? [] },
    ...(r.installed ? { installed: { ...r.installed, skills: r.installed.skills ?? [], plugins: r.installed.plugins ?? [] } } : {}),
    mail: { ...base.mail, ...r.mail },
    crm: { ...base.crm, ...r.crm },
    sheet: { ...base.sheet, ...r.sheet },
    clock: { ...base.clock, ...r.clock },
  };
}
