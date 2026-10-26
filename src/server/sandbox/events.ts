import { z } from "zod";
import { PII_KINDS } from "@/lib/pii";

// SandboxEvent catalogue (docs/04-sandkasse.md § 9). Every payload is a strict object: unknown keys are rejected and
// there are no free-text fields — strings are ids, enums or short machine tokens. Free text lives ONLY in
// SandboxEvent.contentText. JSON Schema: content/schema/sandbox-event.schema.json (pnpm sandbox:schema).

export const SANDBOX_EVENT_TYPES = [
  "SESSION_STARTED", "SESSION_RESET", "UI_CLICKED", "UI_NAVIGATED", "SETTING_CHANGED",
  "CHAT_CONVERSATION_STARTED", "CHAT_MESSAGE_SENT", "CHAT_RESPONSE_RECEIVED", "CHAT_RESPONSE_REGENERATED",
  "CHAT_RESPONSE_COPIED", "CHAT_RESPONSE_RATED", "CHAT_FILE_ATTACHED", "PII_WARNING_SHOWN", "PII_BLOCKED",
  "MAIL_OPENED", "MAIL_DRAFT_SAVED", "MAIL_SENT", "CALENDAR_EVENT_OPENED", "CALENDAR_EVENT_CREATED",
  "FILE_OPENED", "FILE_CREATED", "CRM_RECORD_OPENED", "CRM_RECORD_UPDATED", "CRM_FILTER_APPLIED",
  "SHEET_OPENED", "SHEET_CELL_EDITED", "ASSISTANT_CREATED", "ASSISTANT_UPDATED", "ASSISTANT_KNOWLEDGE_ADDED",
  "ASSISTANT_USED", "CONNECTOR_CONNECT_STARTED", "CONNECTOR_PERMISSION_GRANTED", "CONNECTOR_PERMISSION_DENIED",
  "CONNECTOR_DISCONNECTED", "TOOL_CALL_EXECUTED", "AUTOMATION_CREATED", "AUTOMATION_UPDATED", "AUTOMATION_ENABLED",
  "AUTOMATION_DISABLED", "AUTOMATION_TEST_RUN", "AUTOMATION_RUN_SIMULATED", "AGENT_TASK_STARTED",
  "AGENT_STEP_APPROVED", "AGENT_STEP_REJECTED", "AGENT_TASK_COMPLETED",
] as const;
export type SandboxEventType = (typeof SANDBOX_EVENT_TYPES)[number];

export const ACTORS = ["USER", "MODEL", "AUTOMATION", "SYSTEM"] as const;
export type Actor = (typeof ACTORS)[number];

export const CONCEPTS = ["CHAT", "ASSISTANTS", "CONNECTORS", "AUTOMATIONS", "AGENTS", "MAIL", "CALENDAR", "FILES", "CRM", "SHEET", "SEARCH", "ARTIFACTS", "SKILLS", "PLUGINS"] as const;
export type Concept = (typeof CONCEPTS)[number];

export const SURFACES = ["chat", "prompt_task", "assistant_instructions", "automation_prompt", "mail_draft"] as const;
export type Surface = (typeof SURFACES)[number];

export const CONNECTOR_IDS = ["mail", "calendar", "files", "crm", "sheet"] as const;
export type ConnectorId = (typeof CONNECTOR_IDS)[number];

export const SCOPES = [
  "mail.read", "mail.draft", "mail.send", "calendar.read", "calendar.write", "files.read", "files.write",
  "crm.read", "crm.write", "sheet.read", "sheet.write",
] as const;
export type Scope = (typeof SCOPES)[number];

export const TOOL_NAMES = [
  "mail_search", "mail_read", "mail_draft", "mail_send", "calendar_list", "calendar_create", "files_search",
  "files_read", "files_create", "crm_query", "crm_get", "crm_update", "sheet_read", "sheet_write",
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const CRM_FIELDS = ["segment", "status", "annualRevenueDkk", "nps", "lastContactDayOffset", "notes"] as const;
export type CrmField = (typeof CRM_FIELDS)[number];

export const STOP_REASONS = ["end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn", "refusal", "tool_rounds_exceeded", "error"] as const;

// ── primitives ────────────────────────────────────────────────────────────

/** Machine token: kebab-case, e.g. "new-chat", "attach". */
const token = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(40);
/** Seed ids: m01, c04, f15, k12, e01. */
const seedId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}\\d{2}$`));
/** Overlay ids created in the session: "<prefix>-<random>" (kebab, so they form valid target ids, docs/00 § 10a). */
export const overlayId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}-[a-z0-9]{4,24}$`));

export const mailIdSchema = seedId("m");
export const calendarIdSchema = z.union([seedId("c"), overlayId("cal")]);
export const fileIdSchema = z.union([seedId("f"), overlayId("file")]);
export const customerIdSchema = seedId("k");
export const employeeIdSchema = seedId("e");
export const conversationIdSchema = overlayId("conv");
export const draftIdSchema = overlayId("draft");
export const assistantIdSchema = overlayId("asst");
export const automationIdSchema = overlayId("auto");
export const agentTaskIdSchema = overlayId("agent");
/** Mail recipients: Nordlys employees or CRM customer contacts (external). */
const recipientId = z.union([employeeIdSchema, customerIdSchema]);
/** A1-style spreadsheet cell. */
export const cellSchema = z.string().regex(/^[A-H]([1-9]|1\d|20)$/);
const shortValue = z.union([z.number().finite(), z.string().regex(/^=?[A-Z0-9:(),.+\-*/ ]{0,40}$/)]);
const count = z.number().int().min(0).max(1_000_000);
const ids = <T extends z.ZodType>(schema: T, max = 30) => z.array(schema).max(max);
const scopeSchema = z.enum(SCOPES);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const dayOffset = z.number().int().min(-365).max(365);

/** CRM filter values (city/industry names from the seed world, e.g. "Hvide Sande"). */
const placeName = z.string().max(40).regex(/^\p{L}[\p{L} &.-]*$/u);
const crmValue = z.union([z.enum(["A", "B", "C", "NONE", "ACTIVE", "LEAD", "TRIAL", "CANCELED"]), z.number().finite()]);

const crmFilter = z.strictObject({
  segment: z.enum(["A", "B", "C"]).optional(),
  status: z.enum(["ACTIVE", "LEAD", "TRIAL", "CANCELED"]).optional(),
  city: placeName.optional(),
  industry: placeName.optional(),
  minRevenue: z.number().int().min(0).optional(),
});

export const triggerSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("SCHEDULE"),
    freq: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    weekday: z.number().int().min(1).max(7).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    time: hhmm,
  }),
  z.strictObject({
    type: z.literal("NEW_MAIL"),
    fromDomain: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/).max(60).optional(),
    fromCustomerId: customerIdSchema.optional(),
    hasSubjectFilter: z.boolean(),
  }),
  z.strictObject({ type: z.literal("NEW_CRM_CUSTOMER"), status: z.enum(["ACTIVE", "LEAD", "TRIAL", "CANCELED"]).optional() }),
  z.strictObject({ type: z.literal("CALENDAR_BEFORE_EVENT"), minutesBefore: z.number().int().min(15).max(1440), hasTitleFilter: z.boolean() }),
  z.strictObject({ type: z.literal("MANUAL") }),
]);
export type Trigger = z.infer<typeof triggerSchema>;

export const AUTOMATION_ACTION_TYPES = ["RUN_PROMPT", "NOTIFY_ME", "DRAFT_MAIL", "CREATE_FILE", "UPDATE_CRM_FIELD"] as const;

const assistantPayload = z.strictObject({
  assistantId: assistantIdSchema,
  instructionCharCount: count,
  knowledgeFileIds: ids(fileIdSchema, 15),
  connectorIds: ids(z.enum(CONNECTOR_IDS), 5),
  starterCount: z.number().int().min(0).max(10),
});
const automationPayload = z.strictObject({
  automationId: automationIdSchema,
  trigger: triggerSchema,
  actions: z.array(z.strictObject({ type: z.enum(AUTOMATION_ACTION_TYPES), connectorIds: ids(z.enum(CONNECTOR_IDS), 5) })).min(1).max(5),
  promptCharCount: count,
});
const automationRef = z.strictObject({ automationId: automationIdSchema });
const agentStep = z.strictObject({
  agentTaskId: agentTaskIdSchema,
  stepIndex: z.number().int().min(0).max(5),
  tool: z.enum(TOOL_NAMES),
  targetIds: ids(z.string().regex(/^[a-z0-9-]{2,40}$/), 10),
  externalTarget: z.boolean(),
});
const messageRef = z.strictObject({ conversationId: conversationIdSchema, messageSeq: z.number().int().min(1) });

// ── payload per event type ────────────────────────────────────────────────

export const payloadSchemas = {
  SESSION_STARTED: z.strictObject({
    trackKey: z.enum(["CHATGPT", "COPILOT", "CLAUDE", "GEMINI"]),
    skinKey: token,
    worldVersion: z.string().regex(/^\d+$/),
    moduleSlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80).optional(),
    sceneId: token.optional(),
  }),
  SESSION_RESET: z.strictObject({ reason: z.enum(["USER", "MODULE_START", "STEP_RETRY"]) }),
  UI_CLICKED: z.strictObject({ region: token, control: z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+){0,2}$/).max(60) }),
  UI_NAVIGATED: z.strictObject({ concept: z.enum(CONCEPTS), view: token }),
  SETTING_CHANGED: z.strictObject({ key: token, value: z.union([z.boolean(), token, z.number().finite()]) }),
  CHAT_CONVERSATION_STARTED: z.strictObject({ conversationId: conversationIdSchema, assistantId: assistantIdSchema.optional() }),
  CHAT_MESSAGE_SENT: z.strictObject({
    conversationId: conversationIdSchema,
    charCount: count,
    attachmentFileIds: ids(fileIdSchema, 10),
    assistantId: assistantIdSchema.optional(),
    piiWarningOverridden: z.boolean(),
  }),
  CHAT_RESPONSE_RECEIVED: z.strictObject({
    conversationId: conversationIdSchema,
    charCount: count,
    toolCallCount: z.number().int().min(0).max(100),
    stopReason: z.enum(STOP_REASONS),
  }),
  CHAT_RESPONSE_REGENERATED: messageRef,
  CHAT_RESPONSE_COPIED: messageRef,
  CHAT_RESPONSE_RATED: z.strictObject({ conversationId: conversationIdSchema, messageSeq: z.number().int().min(1), rating: z.enum(["UP", "DOWN"]) }),
  CHAT_FILE_ATTACHED: z.strictObject({ conversationId: conversationIdSchema, fileId: fileIdSchema }),
  PII_WARNING_SHOWN: z.strictObject({ surface: z.enum(SURFACES), kinds: z.array(z.enum(PII_KINDS)).min(1).max(6), overridden: z.boolean() }),
  PII_BLOCKED: z.strictObject({ surface: z.enum(SURFACES), kinds: z.array(z.enum(PII_KINDS)).min(1).max(6) }),
  MAIL_OPENED: z.strictObject({ mailId: mailIdSchema }),
  MAIL_DRAFT_SAVED: z.strictObject({
    draftId: draftIdSchema,
    replyToId: mailIdSchema.optional(),
    recipientIds: ids(recipientId, 20),
    externalRecipientCount: z.number().int().min(0).max(20),
    hasAttachment: z.boolean(),
    charCount: count,
  }),
  MAIL_SENT: z.strictObject({
    draftId: draftIdSchema,
    recipientIds: ids(recipientId, 20),
    externalRecipientCount: z.number().int().min(0).max(20),
    attachmentFileIds: ids(fileIdSchema, 10),
  }),
  CALENDAR_EVENT_OPENED: z.strictObject({ eventId: calendarIdSchema }),
  CALENDAR_EVENT_CREATED: z.strictObject({
    eventId: overlayId("cal"),
    dayOffset,
    time: hhmm,
    attendeeIds: ids(employeeIdSchema, 20),
    durationMin: z.number().int().min(5).max(24 * 60),
  }),
  FILE_OPENED: z.strictObject({ fileId: fileIdSchema }),
  FILE_CREATED: z.strictObject({ fileId: overlayId("file"), type: z.enum(["doc", "table"]), sourceFileIds: ids(fileIdSchema, 15) }),
  CRM_RECORD_OPENED: z.strictObject({ customerId: customerIdSchema }),
  CRM_RECORD_UPDATED: z
    .strictObject({
      customerId: customerIdSchema,
      field: z.enum(CRM_FIELDS),
      previous: crmValue.optional(),
      next: crmValue,
    })
    // Notes are free text: the text goes to contentText, the payload only carries its length.
    .refine((p) => p.field !== "notes" || typeof p.next === "number", "notes: next must be the character count"),
  CRM_FILTER_APPLIED: z.strictObject({
    filter: crmFilter,
    sort: z.enum(["name", "annualRevenueDkk", "lastContactDayOffset", "nps"]).optional(),
    resultCount: z.number().int().min(0).max(30),
  }),
  SHEET_OPENED: z.strictObject({ sheetId: z.literal("f15") }),
  SHEET_CELL_EDITED: z.strictObject({
    sheetId: z.literal("f15"),
    cell: cellSchema,
    previous: shortValue.optional(),
    next: shortValue,
    isFormula: z.boolean(),
  }),
  ASSISTANT_CREATED: assistantPayload,
  ASSISTANT_UPDATED: assistantPayload,
  ASSISTANT_KNOWLEDGE_ADDED: z.strictObject({ assistantId: assistantIdSchema, fileId: fileIdSchema }),
  ASSISTANT_USED: z.strictObject({ assistantId: assistantIdSchema, conversationId: conversationIdSchema }),
  // `via` = the catalog connector (content/sandbox-connectors/catalog.json, e.g. "gmail") that reaches this Nordlys
  // data; optional so older events and module assertions keep working. `approval` = scopes set to "Spørg først".
  CONNECTOR_CONNECT_STARTED: z.strictObject({ connectorId: z.enum(CONNECTOR_IDS), via: token.optional() }),
  CONNECTOR_PERMISSION_GRANTED: z.strictObject({ connectorId: z.enum(CONNECTOR_IDS), scopes: z.array(scopeSchema).min(1).max(3), via: token.optional(), approval: z.array(scopeSchema).max(3).optional() }),
  CONNECTOR_PERMISSION_DENIED: z.strictObject({ connectorId: z.enum(CONNECTOR_IDS), deniedScopes: z.array(scopeSchema).max(3), via: token.optional() }),
  CONNECTOR_DISCONNECTED: z.strictObject({ connectorId: z.enum(CONNECTOR_IDS), via: token.optional() }),
  TOOL_CALL_EXECUTED: z.strictObject({
    tool: z.enum(TOOL_NAMES),
    connectorId: z.enum(CONNECTOR_IDS),
    filtersUsed: z.array(z.string().regex(/^[a-zA-Z]+$/).max(30)).max(10),
    resultCount: z.number().int().min(0).max(100),
    requiredConfirmation: z.boolean(),
    confirmed: z.boolean().nullable(),
    viaAssistantId: assistantIdSchema.optional(),
    viaAutomationId: automationIdSchema.optional(),
  }),
  AUTOMATION_CREATED: automationPayload,
  AUTOMATION_UPDATED: automationPayload,
  AUTOMATION_ENABLED: automationRef,
  AUTOMATION_DISABLED: automationRef,
  AUTOMATION_TEST_RUN: z.strictObject({ automationId: automationIdSchema, success: z.boolean(), actionsRun: z.number().int().min(0).max(5) }),
  AUTOMATION_RUN_SIMULATED: z.strictObject({
    automationId: automationIdSchema,
    triggerType: z.enum(["SCHEDULE", "NEW_MAIL", "NEW_CRM_CUSTOMER", "CALENDAR_BEFORE_EVENT", "MANUAL"]),
    actionsRun: z.number().int().min(0).max(5),
    simulatedDayOffset: dayOffset,
  }),
  AGENT_TASK_STARTED: z.strictObject({ agentTaskId: agentTaskIdSchema, planStepCount: z.number().int().min(1).max(6) }),
  AGENT_STEP_APPROVED: agentStep,
  AGENT_STEP_REJECTED: agentStep,
  AGENT_TASK_COMPLETED: z.strictObject({ agentTaskId: agentTaskIdSchema, stepsRun: z.number().int().min(0).max(6), stepsRejected: z.number().int().min(0).max(6) }),
} satisfies Record<SandboxEventType, z.ZodType>;

export type PayloadOf<T extends SandboxEventType> = z.infer<(typeof payloadSchemas)[T]>;

/** Stable target id (docs/00 § 10a: kebab-case with dots), e.g. "nav.new-chat", "mail.m08". */
export const targetSchema = z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+){1,4}$/).max(80);
const stepIdSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(48);

function envelope<T extends SandboxEventType>(type: T) {
  return z.strictObject({
    type: z.literal(type),
    actor: z.enum(ACTORS),
    target: targetSchema.optional(),
    stepId: stepIdSchema.optional(),
    payload: payloadSchemas[type],
  });
}

const envelopes = SANDBOX_EVENT_TYPES.map((t) => envelope(t)) as unknown as [ReturnType<typeof envelope<SandboxEventType>>, ...ReturnType<typeof envelope<SandboxEventType>>[]];

/** An event before the server assigns seq/ts (input to the reducer and to appendEvents). */
export const sandboxEventInputSchema = z.discriminatedUnion("type", envelopes);

export type SandboxEventInput = {
  [T in SandboxEventType]: { type: T; actor: Actor; target?: string; stepId?: string; payload: PayloadOf<T> };
}[SandboxEventType];

/** Stored envelope as seen by the reducer, assertions and the UI. */
export type SandboxEventRecord = SandboxEventInput & { seq: number; ts: string };

export function parseSandboxEvent(input: unknown): SandboxEventInput {
  return sandboxEventInputSchema.parse(input) as SandboxEventInput;
}

/** Target derived from the payload when the client does not send one (keeps the namespace consistent). */
export function defaultTarget(event: SandboxEventInput): string | undefined {
  switch (event.type) {
    case "UI_CLICKED":
      return `${event.payload.region}.${event.payload.control}`;
    case "MAIL_OPENED":
      return `mail.${event.payload.mailId}`;
    case "FILE_OPENED":
    case "CHAT_FILE_ATTACHED":
      return `file.${event.payload.fileId}`;
    case "CRM_RECORD_OPENED":
    case "CRM_RECORD_UPDATED":
      return `crm.${event.payload.customerId}`;
    case "CALENDAR_EVENT_OPENED":
      return `cal.${event.payload.eventId}`;
    case "SHEET_CELL_EDITED":
      return `sheet.${event.payload.cell.toLowerCase()}`;
    case "ASSISTANT_CREATED":
    case "ASSISTANT_UPDATED":
    case "ASSISTANT_USED":
      return `asst.${event.payload.assistantId}`;
    case "AUTOMATION_CREATED":
    case "AUTOMATION_UPDATED":
    case "AUTOMATION_ENABLED":
    case "AUTOMATION_DISABLED":
    case "AUTOMATION_TEST_RUN":
      return `auto.${event.payload.automationId}`;
    case "CONNECTOR_CONNECT_STARTED":
      return `connectors.${event.payload.connectorId}.connect`;
    default:
      return undefined;
  }
}
