// evaluatePredicate (docs/05-moduler-og-scoring.md § 3): safe JSON predicates over sandbox events + end state.
// No eval, no regex, no functions. Input is treated as untrusted: unknown nodes/ops evaluate to false, and the
// structural limits (50 nodes, depth 8, path depth 6, 5000 events) are enforced here as well as at publish time.

export const MAX_NODES = 50;
export const MAX_DEPTH = 8;
export const MAX_PATH_DEPTH = 6;
export const MAX_EVENTS = 5000;
export const MAX_COMBINATOR_CHILDREN = 10;

const SEGMENT = /^[A-Za-z0-9_]+$/;
const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);
const OPS = new Set(["eq", "neq", "in", "contains", "startsWith", "exists", "gte", "lte", "lengthGte"]);

export interface PredicateEvent {
  seq: number;
  type: string;
  target?: string | null;
  actor?: string;
  payload: unknown;
}

export interface PredicateResult {
  pass: boolean;
  matchedSeqs: number[];
  /** Set when evaluation was refused (limits exceeded / invalid predicate); pass is then false. */
  error?: string;
}

type Json = unknown;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const FAIL: PredicateResult = { pass: false, matchedSeqs: [] };

// ── validation ────────────────────────────────────────────────────────────

export function validatePath(path: unknown): string | null {
  if (typeof path !== "string" || path.length === 0) return "path must be a non-empty string";
  const segments = path.split(".");
  if (segments.length > MAX_PATH_DEPTH) return `path deeper than ${MAX_PATH_DEPTH}`;
  for (const s of segments) {
    if (FORBIDDEN_SEGMENTS.has(s)) return `forbidden path segment ${s}`;
    if (!SEGMENT.test(s)) return `invalid path segment ${JSON.stringify(s)}`;
  }
  return null;
}

function validateCondition(c: unknown, errors: string[]) {
  if (!isObj(c)) return errors.push("condition must be an object");
  const keys = Object.keys(c);
  if (keys.some((k) => !["path", "op", "value"].includes(k))) errors.push("unknown condition key");
  const pathError = validatePath(c.path);
  if (pathError) errors.push(pathError);
  if (typeof c.op !== "string" || !OPS.has(c.op)) return errors.push(`unknown op ${String(c.op)}`);
  if (c.op !== "exists" && !Object.hasOwn(c, "value")) errors.push(`${c.op} needs a value`);
  if (c.op === "in" && !Array.isArray(c.value)) errors.push("in needs an array value");
  if ((c.op === "gte" || c.op === "lte" || c.op === "lengthGte") && typeof c.value !== "number") errors.push(`${c.op} needs a number`);
  if (c.op === "startsWith" && typeof c.value !== "string") errors.push("startsWith needs a string");
}

function validateMatcher(m: unknown, errors: string[]) {
  if (!isObj(m)) return errors.push("event matcher must be an object");
  if (Object.keys(m).some((k) => !["type", "target", "where"].includes(k))) errors.push("unknown matcher key");
  if (typeof m.type !== "string") errors.push("matcher needs a type");
  if (m.target !== undefined && typeof m.target !== "string") errors.push("target must be a string");
  if (m.where !== undefined) {
    if (!Array.isArray(m.where)) errors.push("where must be an array");
    else m.where.forEach((c) => validateCondition(c, errors));
  }
}

/** Structural validation; returns a list of errors (empty = valid). */
export function validatePredicate(pred: unknown): string[] {
  const errors: string[] = [];
  let nodes = 0;
  const visit = (p: unknown, depth: number) => {
    nodes++;
    if (nodes > MAX_NODES) return void errors.push(`more than ${MAX_NODES} nodes`);
    if (depth > MAX_DEPTH) return void errors.push(`deeper than ${MAX_DEPTH}`);
    if (!isObj(p)) return void errors.push("node must be an object");
    const keys = Object.keys(p);
    if (keys.length !== 1) return void errors.push("node must have exactly one key");
    const key = keys[0] as string;
    const v = p[key];
    switch (key) {
      case "all":
      case "any":
        if (!Array.isArray(v) || v.length === 0 || v.length > MAX_COMBINATOR_CHILDREN) return void errors.push(`${key} needs 1–${MAX_COMBINATOR_CHILDREN} children`);
        v.forEach((c) => visit(c, depth + 1));
        return;
      case "not":
        return visit(v, depth + 1);
      case "event":
        return void validateMatcher(v, errors);
      case "count":
        if (!isObj(v)) return void errors.push("count must be an object");
        validateMatcher(v.event, errors);
        if (!["eq", "gte", "lte"].includes(String(v.op))) errors.push("count op must be eq|gte|lte");
        if (typeof v.value !== "number" || !Number.isInteger(v.value) || v.value < 0) errors.push("count value must be an integer ≥ 0");
        return;
      case "sequence":
        if (!Array.isArray(v) || v.length === 0 || v.length > MAX_COMBINATOR_CHILDREN) return void errors.push("sequence needs 1–10 matchers");
        v.forEach((m) => validateMatcher(m, errors));
        return;
      case "state":
        return void validateCondition(v, errors);
      default:
        errors.push(`unknown node ${key}`);
    }
  };
  visit(pred, 1);
  return errors;
}

// ── evaluation ────────────────────────────────────────────────────────────

const MISSING = Symbol("missing");

/** Own-property lookup per segment; never walks the prototype chain. */
export function getPath(root: unknown, path: string): unknown {
  if (validatePath(path)) return MISSING;
  let cur: unknown = root;
  for (const seg of path.split(".")) {
    if (Array.isArray(cur)) {
      if (!/^\d+$/.test(seg)) return MISSING;
      const i = Number(seg);
      if (i >= cur.length) return MISSING;
      cur = cur[i];
    } else if (isObj(cur)) {
      if (!Object.hasOwn(cur, seg)) return MISSING;
      cur = cur[seg];
    } else {
      return MISSING;
    }
  }
  return cur;
}

function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && deepEqual(a[k], b[k]));
  }
  return false;
}

export function evaluateCondition(root: unknown, cond: unknown): boolean {
  if (!isObj(cond) || typeof cond.path !== "string" || typeof cond.op !== "string") return false;
  const actual = getPath(root, cond.path);
  const value = cond.value;
  if (cond.op === "exists") return actual !== MISSING && actual !== undefined;
  if (actual === MISSING) return cond.op === "neq";
  switch (cond.op) {
    case "eq":
      return deepEqual(actual, value);
    case "neq":
      return !deepEqual(actual, value);
    case "in":
      return Array.isArray(value) && value.some((v) => deepEqual(actual, v));
    case "contains":
      if (typeof actual === "string") return typeof value === "string" && actual.includes(value);
      if (Array.isArray(actual)) return actual.some((v) => deepEqual(v, value));
      return false;
    case "startsWith":
      return typeof actual === "string" && typeof value === "string" && actual.startsWith(value);
    case "gte":
      return typeof actual === "number" && typeof value === "number" && actual >= value;
    case "lte":
      return typeof actual === "number" && typeof value === "number" && actual <= value;
    case "lengthGte":
      return (typeof actual === "string" || Array.isArray(actual)) && typeof value === "number" && actual.length >= value;
    default:
      return false;
  }
}

function matches(event: PredicateEvent, matcher: unknown): boolean {
  if (!isObj(matcher) || typeof matcher.type !== "string") return false;
  if (event.type !== matcher.type) return false;
  if (matcher.target !== undefined && event.target !== matcher.target) return false;
  if (matcher.where === undefined) return true;
  if (!Array.isArray(matcher.where)) return false;
  const view = { seq: event.seq, type: event.type, target: event.target ?? undefined, actor: event.actor, payload: event.payload };
  return matcher.where.every((c) => evaluateCondition(view, c));
}

function evalNode(p: unknown, events: PredicateEvent[], state: unknown): PredicateResult {
  if (!isObj(p)) return FAIL;
  const keys = Object.keys(p);
  if (keys.length !== 1) return FAIL;
  const key = keys[0] as string;
  const v = p[key];
  switch (key) {
    case "all": {
      if (!Array.isArray(v) || v.length === 0) return FAIL;
      const seqs: number[] = [];
      for (const child of v) {
        const r = evalNode(child, events, state);
        if (!r.pass) return FAIL;
        seqs.push(...r.matchedSeqs);
      }
      return { pass: true, matchedSeqs: [...new Set(seqs)].sort((a, b) => a - b) };
    }
    case "any": {
      if (!Array.isArray(v) || v.length === 0) return FAIL;
      for (const child of v) {
        const r = evalNode(child, events, state);
        if (r.pass) return r;
      }
      return FAIL;
    }
    case "not": {
      const r = evalNode(v, events, state);
      return { pass: !r.pass, matchedSeqs: [] };
    }
    case "event": {
      const hit = events.find((e) => matches(e, v));
      return hit ? { pass: true, matchedSeqs: [hit.seq] } : FAIL;
    }
    case "count": {
      if (!isObj(v) || typeof v.value !== "number") return FAIL;
      const hits = events.filter((e) => matches(e, v.event));
      const n = hits.length;
      const pass = v.op === "eq" ? n === v.value : v.op === "gte" ? n >= v.value : v.op === "lte" ? n <= v.value : false;
      return pass ? { pass, matchedSeqs: hits.map((e) => e.seq) } : FAIL;
    }
    case "sequence": {
      if (!Array.isArray(v) || v.length === 0) return FAIL;
      const seqs: number[] = [];
      let i = 0;
      for (const e of events) {
        if (i < v.length && matches(e, v[i])) {
          seqs.push(e.seq);
          i++;
        }
      }
      return i === v.length ? { pass: true, matchedSeqs: seqs } : FAIL;
    }
    case "state":
      return evaluateCondition(state, v) ? { pass: true, matchedSeqs: [] } : FAIL;
    default:
      return FAIL;
  }
}

/**
 * Evaluates a CLICK_TASK predicate. `events` must already be filtered to the step window (after step start and the
 * latest SESSION_RESET); they are sorted by seq here. Invalid predicates and oversized inputs return pass=false.
 */
export function evaluatePredicate(pred: unknown, events: readonly PredicateEvent[], state: unknown): PredicateResult {
  if (events.length > MAX_EVENTS) return { ...FAIL, error: `more than ${MAX_EVENTS} events` };
  const errors = validatePredicate(pred);
  if (errors.length > 0) return { ...FAIL, error: errors[0] };
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  return evalNode(pred, sorted, state);
}
