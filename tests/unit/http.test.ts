import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpTimeoutError, httpRequest, isIdempotent, parseRetryAfter } from "@/server/http";

const silentLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
const noSleep = vi.fn(async () => {});

function res(status: number, headers: Record<string, string> = {}) {
  return new Response(status === 204 ? null : "x", { status, headers });
}

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("isIdempotent", () => {
  it("treats safe/idempotent methods as idempotent", () => {
    for (const m of ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]) expect(isIdempotent(m)).toBe(true);
  });
  it("treats POST and PATCH as non-idempotent unless an idempotency key is given", () => {
    expect(isIdempotent("POST")).toBe(false);
    expect(isIdempotent("PATCH")).toBe(false);
    expect(isIdempotent("POST", "key-1")).toBe(true);
  });
});

describe("parseRetryAfter", () => {
  it("parses seconds and http dates", () => {
    expect(parseRetryAfter("2", 0)).toBe(2000);
    expect(parseRetryAfter(new Date(10_000).toUTCString(), 4_000)).toBe(6000);
    expect(parseRetryAfter("garbage", 0)).toBeUndefined();
    expect(parseRetryAfter(null, 0)).toBeUndefined();
  });
});

describe("httpRequest", () => {
  it("aborts when the timeout elapses", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const p = httpRequest("https://api.example.com/x", {
      service: "test",
      method: "POST",
      timeoutMs: 1000,
      fetchImpl,
      logger: silentLogger,
      sleep: noSleep,
    });
    const assertion = expect(p).rejects.toBeInstanceOf(HttpTimeoutError);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const signal = fetchImpl.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(true);
  });

  it("retries idempotent requests on 5xx and returns the eventual success", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(res(503)).mockResolvedValueOnce(res(502)).mockResolvedValueOnce(res(200));
    const r = await httpRequest("https://api.example.com/x", {
      service: "test",
      fetchImpl,
      logger: silentLogger,
      sleep: noSleep,
    });
    expect(r.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(noSleep).toHaveBeenCalledTimes(2);
  });

  it("never retries a non-idempotent POST", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(503));
    const r = await httpRequest("https://api.example.com/x", {
      service: "test",
      method: "POST",
      fetchImpl,
      logger: silentLogger,
      sleep: noSleep,
    });
    expect(r.status).toBe(503);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("retries a POST that carries an idempotency key and sends the header", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(res(500)).mockResolvedValueOnce(res(201));
    const r = await httpRequest("https://api.example.com/x", {
      service: "test",
      method: "POST",
      idempotencyKey: "order:1",
      fetchImpl,
      logger: silentLogger,
      sleep: noSleep,
    });
    expect(r.status).toBe(201);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Idempotency-Key")).toBe("order:1");
  });

  it("does not retry 4xx other than 408/429", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(404));
    await httpRequest("https://api.example.com/x", { service: "t", fetchImpl, logger: silentLogger, sleep: noSleep });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("honours Retry-After on 429", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(res(429, { "retry-after": "3" })).mockResolvedValueOnce(res(200));
    await httpRequest("https://api.example.com/x", { service: "t", fetchImpl, logger: silentLogger, sleep: noSleep });
    expect(noSleep).toHaveBeenCalledWith(3000);
  });

  it("gives up after the configured number of retries", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(500));
    const r = await httpRequest("https://api.example.com/x", {
      service: "t",
      retries: 2,
      fetchImpl,
      logger: silentLogger,
      sleep: noSleep,
    });
    expect(r.status).toBe(500);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("retries idempotent requests after a network error", async () => {
    const fetchImpl = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(res(200));
    const r = await httpRequest("https://api.example.com/x", { service: "t", fetchImpl, logger: silentLogger, sleep: noSleep });
    expect(r.status).toBe(200);
  });

  it("does not log query strings (they may contain tokens)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(res(200));
    await httpRequest("https://api.example.com/x?token=secret", { service: "t", fetchImpl, logger: silentLogger, sleep: noSleep });
    const logged = JSON.stringify(silentLogger.info.mock.calls);
    expect(logged).not.toContain("secret");
    expect(logged).toContain("api.example.com/x");
  });
});
