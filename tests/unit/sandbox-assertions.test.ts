import { describe, expect, it } from "vitest";
import { evaluateCondition, evaluatePredicate, getPath, MAX_EVENTS, validatePredicate, type PredicateEvent } from "@/server/sandbox/assertions";
import { replay } from "@/server/sandbox/reducer";
import { EXAMPLE_EVENTS as E } from "../fixtures/sandbox-events";

const ev = (seq: number, type: string, payload: unknown = {}, target?: string): PredicateEvent => ({ seq, type, payload, target, actor: "USER" });

const events: PredicateEvent[] = [
  ev(1, "SESSION_STARTED", { trackKey: "CHATGPT" }),
  ev(2, "UI_CLICKED", { region: "nav", control: "new-chat" }, "nav.new-chat"),
  ev(3, "CHAT_CONVERSATION_STARTED", { conversationId: "conv-abcd1" }),
  ev(4, "CHAT_FILE_ATTACHED", { conversationId: "conv-abcd1", fileId: "f13" }, "file.f13"),
  ev(5, "MAIL_OPENED", { mailId: "m08" }, "mail.m08"),
  ev(6, "MAIL_OPENED", { mailId: "m02" }, "mail.m02"),
];
const state = replay([E.CHAT_CONVERSATION_STARTED, { ...E.CHAT_FILE_ATTACHED, payload: { conversationId: "conv-abcd1", fileId: "f13" } }]);

describe("evaluatePredicate (docs/05 § 3)", () => {
  describe("ops", () => {
    const root = { s: "nordlys-fragt", n: 5, arr: ["f13", "f02"], obj: { a: 1 }, nul: null };
    it.each([
      ["eq", { path: "s", op: "eq", value: "nordlys-fragt" }, true],
      ["eq (deep)", { path: "obj", op: "eq", value: { a: 1 } }, true],
      ["eq false", { path: "n", op: "eq", value: 6 }, false],
      ["neq", { path: "n", op: "neq", value: 6 }, true],
      ["neq false", { path: "n", op: "neq", value: 5 }, false],
      ["in", { path: "n", op: "in", value: [1, 5] }, true],
      ["in false", { path: "n", op: "in", value: [1, 2] }, false],
      ["contains string", { path: "s", op: "contains", value: "fragt" }, true],
      ["contains is case-sensitive", { path: "s", op: "contains", value: "Fragt" }, false],
      ["contains array", { path: "arr", op: "contains", value: "f02" }, true],
      ["contains array false", { path: "arr", op: "contains", value: "f99" }, false],
      ["startsWith", { path: "s", op: "startsWith", value: "nord" }, true],
      ["startsWith false", { path: "s", op: "startsWith", value: "fragt" }, false],
      ["exists", { path: "obj.a", op: "exists" }, true],
      ["exists null", { path: "nul", op: "exists" }, true],
      ["exists missing", { path: "obj.b", op: "exists" }, false],
      ["gte", { path: "n", op: "gte", value: 5 }, true],
      ["gte false", { path: "n", op: "gte", value: 6 }, false],
      ["gte on string is false", { path: "s", op: "gte", value: 1 }, false],
      ["lte", { path: "n", op: "lte", value: 5 }, true],
      ["lte false", { path: "n", op: "lte", value: 4 }, false],
      ["lengthGte string", { path: "s", op: "lengthGte", value: 13 }, true],
      ["lengthGte array", { path: "arr", op: "lengthGte", value: 2 }, true],
      ["lengthGte false", { path: "arr", op: "lengthGte", value: 3 }, false],
      ["array index", { path: "arr.1", op: "eq", value: "f02" }, true],
      ["unknown op", { path: "n", op: "regex", value: ".*" }, false],
    ])("%s", (_name, cond, expected) => {
      expect(evaluateCondition(root, cond)).toBe(expected);
    });
  });

  describe("combinators", () => {
    const opened = (mailId: string) => ({ event: { type: "MAIL_OPENED", where: [{ path: "payload.mailId", op: "eq", value: mailId }] } });
    it("event + target", () => {
      expect(evaluatePredicate({ event: { type: "UI_CLICKED", target: "nav.new-chat" } }, events, state)).toEqual({ pass: true, matchedSeqs: [2] });
      expect(evaluatePredicate({ event: { type: "UI_CLICKED", target: "nav.history" } }, events, state).pass).toBe(false);
    });
    it("all / any / not", () => {
      expect(evaluatePredicate({ all: [opened("m08"), opened("m02")] }, events, state)).toEqual({ pass: true, matchedSeqs: [5, 6] });
      expect(evaluatePredicate({ all: [opened("m08"), opened("m24")] }, events, state).pass).toBe(false);
      expect(evaluatePredicate({ any: [opened("m24"), opened("m02")] }, events, state)).toEqual({ pass: true, matchedSeqs: [6] });
      expect(evaluatePredicate({ any: [opened("m24"), opened("m12")] }, events, state).pass).toBe(false);
      expect(evaluatePredicate({ not: opened("m24") }, events, state)).toEqual({ pass: true, matchedSeqs: [] });
      expect(evaluatePredicate({ not: opened("m08") }, events, state).pass).toBe(false);
    });
    it("count eq / gte / lte", () => {
      const m = { type: "MAIL_OPENED" };
      expect(evaluatePredicate({ count: { event: m, op: "eq", value: 2 } }, events, state)).toEqual({ pass: true, matchedSeqs: [5, 6] });
      expect(evaluatePredicate({ count: { event: m, op: "gte", value: 3 } }, events, state).pass).toBe(false);
      expect(evaluatePredicate({ count: { event: m, op: "lte", value: 2 } }, events, state).pass).toBe(true);
      expect(evaluatePredicate({ count: { event: { type: "MAIL_SENT" }, op: "eq", value: 0 } }, events, state).pass).toBe(true);
    });
    it("sequence respects seq order but not adjacency", () => {
      expect(evaluatePredicate({ sequence: [{ type: "UI_CLICKED", target: "nav.new-chat" }, { type: "MAIL_OPENED" }] }, events, state)).toEqual({ pass: true, matchedSeqs: [2, 5] });
      expect(evaluatePredicate({ sequence: [{ type: "MAIL_OPENED" }, { type: "UI_CLICKED" }] }, events, state).pass).toBe(false);
      // events arrive unsorted → evaluator sorts by seq
      expect(evaluatePredicate({ sequence: [{ type: "UI_CLICKED" }, { type: "MAIL_OPENED" }] }, [...events].reverse(), state).pass).toBe(true);
    });
    it("state condition on the reducer snapshot", () => {
      expect(evaluatePredicate({ state: { path: "chat.active.attachments", op: "lengthGte", value: 1 } }, events, state).pass).toBe(true);
      expect(evaluatePredicate({ state: { path: "mail.sentCount", op: "gte", value: 1 } }, events, state).pass).toBe(false);
    });
    it("the docs/05 example passes (new chat → attach file)", () => {
      const pred = {
        all: [
          { sequence: [{ type: "UI_CLICKED", target: "nav.new-chat" }, { type: "CHAT_FILE_ATTACHED", where: [{ path: "payload.fileId", op: "eq", value: "f13" }] }] },
          { state: { path: "chat.active.attachments", op: "lengthGte", value: 1 } },
        ],
      };
      expect(evaluatePredicate(pred, events, state)).toEqual({ pass: true, matchedSeqs: [2, 4] });
    });
  });

  describe("safety", () => {
    it.each(["__proto__", "prototype", "constructor", "payload.__proto__.polluted", "payload.constructor.name"])("rejects path %s", (path) => {
      expect(evaluatePredicate({ state: { path, op: "exists" } }, events, {}).pass).toBe(false);
      expect(validatePredicate({ state: { path, op: "exists" } }).join()).toMatch(/forbidden/);
    });
    it("never walks the prototype chain (Object.hasOwn)", () => {
      expect(getPath({}, "toString")).not.toBe(Object.prototype.toString);
      expect(evaluateCondition({}, { path: "toString", op: "exists" })).toBe(false);
      expect(evaluateCondition({ a: {} }, { path: "a.hasOwnProperty", op: "exists" })).toBe(false);
      const polluted = JSON.parse('{"__proto__": {"x": 1}}') as unknown;
      expect(evaluateCondition(polluted, { path: "x", op: "exists" })).toBe(false);
    });
    it("rejects malformed path segments and paths deeper than 6", () => {
      expect(validatePredicate({ state: { path: "a[0]", op: "exists" } })).not.toEqual([]);
      expect(validatePredicate({ state: { path: "a..b", op: "exists" } })).not.toEqual([]);
      expect(validatePredicate({ state: { path: "a.b.c.d.e.f.g", op: "exists" } })).not.toEqual([]);
      expect(validatePredicate({ state: { path: "a.b.c.d.e.f", op: "exists" } })).toEqual([]);
    });
    it("unknown nodes, ops and keys evaluate to false", () => {
      expect(evaluatePredicate({ regex: ".*" }, events, state).pass).toBe(false);
      expect(evaluatePredicate({ event: { type: "MAIL_OPENED", where: [{ path: "payload.mailId", op: "matches", value: "m.*" }] } }, events, state).pass).toBe(false);
      expect(evaluatePredicate({ event: { type: "MAIL_OPENED" }, extra: 1 }, events, state).pass).toBe(false);
      expect(evaluatePredicate({ event: { type: "MAIL_OPENED", fn: "x" } }, events, state).pass).toBe(false);
      expect(evaluatePredicate(null, events, state).pass).toBe(false);
    });
    it("enforces max 50 nodes", () => {
      const leaf = { event: { type: "MAIL_OPENED" } };
      const wide = { all: Array.from({ length: 10 }, () => ({ all: Array.from({ length: 5 }, () => leaf) })) }; // 61 nodes
      const r = evaluatePredicate(wide, events, state);
      expect(r.pass).toBe(false);
      expect(r.error).toMatch(/50 nodes/);
      const ok = { all: Array.from({ length: 7 }, () => ({ all: Array.from({ length: 6 }, () => leaf) })) }; // 50 nodes
      expect(evaluatePredicate(ok, events, state).pass).toBe(true);
    });
    it("enforces max depth 8", () => {
      let deep: unknown = { event: { type: "MAIL_OPENED" } };
      for (let i = 0; i < 7; i++) deep = { not: { not: deep } };
      expect(evaluatePredicate(deep, events, state).error).toMatch(/deeper than 8/);
      let ok: unknown = { event: { type: "MAIL_OPENED" } };
      for (let i = 0; i < 7; i++) ok = { all: [ok] };
      expect(evaluatePredicate(ok, events, state).pass).toBe(true);
    });
    it(`enforces max ${MAX_EVENTS} events`, () => {
      const many = Array.from({ length: MAX_EVENTS + 1 }, (_, i) => ev(i + 1, "MAIL_OPENED", { mailId: "m01" }));
      const r = evaluatePredicate({ event: { type: "MAIL_OPENED" } }, many, state);
      expect(r).toMatchObject({ pass: false, error: expect.stringMatching(/5000/) });
      expect(evaluatePredicate({ event: { type: "MAIL_OPENED" } }, many.slice(0, MAX_EVENTS), state).pass).toBe(true);
    });
  });

  describe("empty event list", () => {
    it("event/sequence fail, count eq 0 and not pass, state still works", () => {
      expect(evaluatePredicate({ event: { type: "MAIL_OPENED" } }, [], state).pass).toBe(false);
      expect(evaluatePredicate({ sequence: [{ type: "MAIL_OPENED" }] }, [], state).pass).toBe(false);
      expect(evaluatePredicate({ count: { event: { type: "MAIL_OPENED" }, op: "eq", value: 0 } }, [], state)).toEqual({ pass: true, matchedSeqs: [] });
      expect(evaluatePredicate({ not: { event: { type: "MAIL_OPENED" } } }, [], state).pass).toBe(true);
      expect(evaluatePredicate({ state: { path: "chat.conversations", op: "eq", value: 1 } }, [], state).pass).toBe(true);
    });
  });
});
