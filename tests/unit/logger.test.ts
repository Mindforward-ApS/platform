import { describe, expect, it, vi } from "vitest";
import { createLogger, redact } from "@/server/observability/logger";

describe("redact", () => {
  it("removes PII and secrets at any depth", () => {
    const out = redact({
      email: "a@b.dk",
      nested: { promptText: "hemmelig", authorization: "Bearer x", ok: 1 },
      list: [{ token: "t", keep: "y" }],
    });
    expect(out).toEqual({
      email: "[redacted]",
      nested: { promptText: "[redacted]", authorization: "[redacted]", ok: 1 },
      list: [{ token: "[redacted]", keep: "y" }],
    });
  });
});

describe("createLogger", () => {
  it("writes one JSON line with level, msg and ts", () => {
    const write = vi.fn();
    const log = createLogger({ write, minLevel: "debug" });
    log.info("hello", { feature: "x", email: "a@b.dk" });
    const line = JSON.parse(String(write.mock.calls[0]?.[0]));
    expect(line).toMatchObject({ level: "info", msg: "hello", feature: "x", email: "[redacted]" });
    expect(typeof line.ts).toBe("string");
  });

  it("serializes errors without leaking messages as top-level fields", () => {
    const write = vi.fn();
    const log = createLogger({ write, minLevel: "debug" });
    log.error("boom", { err: new Error("bad") });
    const line = JSON.parse(String(write.mock.calls[0]?.[0]));
    expect(line.err).toMatchObject({ name: "Error", message: "bad" });
  });

  it("drops levels below minLevel", () => {
    const write = vi.fn();
    createLogger({ write, minLevel: "warn" }).info("skip");
    expect(write).not.toHaveBeenCalled();
  });
});
