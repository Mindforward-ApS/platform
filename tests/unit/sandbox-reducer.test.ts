import { describe, expect, it } from "vitest";
import { SANDBOX_EVENT_TYPES, type SandboxEventInput } from "@/server/sandbox/events";
import { applyEvent, initialState, normalizeState, replay } from "@/server/sandbox/reducer";
import { EXAMPLE_EVENTS as E } from "../fixtures/sandbox-events";

// A state where every referenced object exists, so each event has something to act on.
const SETUP: SandboxEventInput[] = [
  E.CHAT_CONVERSATION_STARTED,
  E.ASSISTANT_CREATED,
  E.AUTOMATION_CREATED,
  E.AGENT_TASK_STARTED,
  E.MAIL_DRAFT_SAVED,
  E.CONNECTOR_PERMISSION_GRANTED,
];
const base = () => replay(SETUP);

describe("applyEvent (docs/04 § 9)", () => {
  for (const type of SANDBOX_EVENT_TYPES) {
    it(`${type}: snapshot`, () => {
      const before = base();
      const frozen = JSON.stringify(before);
      const after = applyEvent(before, E[type]);
      expect(JSON.stringify(before)).toBe(frozen); // pure: input is not mutated
      expect(applyEvent(base(), E[type])).toEqual(after); // deterministic
      expect(after).toMatchSnapshot();
    });
  }

  it("state contains no free text (only ids, enums, numbers, booleans)", () => {
    const all = replay(SANDBOX_EVENT_TYPES.filter((t) => t !== "SESSION_RESET").map((t) => E[t]));
    const strings: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(all);
    for (const s of strings) expect(s).toMatch(/^[A-Za-z0-9_.:=()+-]{1,40}$/);
  });

  it("SESSION_RESET returns the seed state", () => {
    expect(applyEvent(base(), E.SESSION_RESET)).toEqual(initialState());
  });

  it("chat counters follow the active conversation only", () => {
    let s = replay([E.CHAT_CONVERSATION_STARTED, E.CHAT_MESSAGE_SENT, E.CHAT_RESPONSE_RECEIVED]);
    expect(s.chat.active).toEqual({ id: "conv-abcd1", attachments: ["f13"], messageCount: 2 });
    s = applyEvent(s, { ...E.CHAT_MESSAGE_SENT, payload: { ...E.CHAT_MESSAGE_SENT.payload, conversationId: "conv-other" } });
    expect(s.chat.active.messageCount).toBe(2);
  });

  it("sending a draft moves it from drafts to sent and counts external mail", () => {
    const s = replay([E.MAIL_DRAFT_SAVED, E.MAIL_SENT]);
    expect(s.mail).toEqual({ draftsCount: 0, sentCount: 1, externalSentCount: 1, draftIds: [] });
  });

  it("normalizeState fills missing keys from older snapshots", () => {
    expect(normalizeState(null)).toEqual(initialState());
    expect(normalizeState({ clock: { dayOffset: 3 } }).clock.dayOffset).toBe(3);
  });
});
