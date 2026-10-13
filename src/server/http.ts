import { logger as defaultLogger, type Logger } from "./observability/logger";

// The only way to call external HTTP services (CLAUDE.md: timeout, retry with backoff for idempotent calls, structured logging).

export class HttpTimeoutError extends Error {
  constructor(public readonly url: string, public readonly timeoutMs: number) {
    super(`Request timed out after ${timeoutMs} ms`);
    this.name = "HttpTimeoutError";
  }
}

export interface HttpRequestOptions {
  /** Short name of the external service, used in logs (e.g. "stripe", "release-notes"). */
  service: string;
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  timeoutMs?: number;
  /** Max retries after the first attempt (idempotent requests only). */
  retries?: number;
  /** Makes a POST/PATCH retryable; sent as the Idempotency-Key header. */
  idempotencyKey?: string;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
}

const IDEMPOTENT_METHODS = new Set(["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]);
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 8_000;

export function isIdempotent(method: string, idempotencyKey?: string): boolean {
  return IDEMPOTENT_METHODS.has(method.toUpperCase()) || Boolean(idempotencyKey);
}

/** Retry-After as milliseconds (seconds or HTTP-date), or undefined if absent/invalid. */
export function parseRetryAfter(header: string | null, now = Date.now()): number | undefined {
  if (!header) return undefined;
  if (/^\d+$/.test(header.trim())) return Number(header.trim()) * 1000;
  const date = Date.parse(header);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

function backoff(attempt: number): number {
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}

function logTarget(url: string): string {
  try {
    const u = new URL(url);
    return u.host + u.pathname;
  } catch {
    return "invalid-url";
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function httpRequest(url: string, opts: HttpRequestOptions): Promise<Response> {
  const method = (opts.method ?? "GET").toUpperCase();
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const canRetry = isIdempotent(method, opts.idempotencyKey);
  const maxRetries = canRetry ? (opts.retries ?? 2) : 0;
  const doFetch = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;
  const log = opts.logger ?? defaultLogger;
  const target = logTarget(url);

  const headers = new Headers(opts.headers);
  if (opts.idempotencyKey) headers.set("Idempotency-Key", opts.idempotencyKey);

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new HttpTimeoutError(url, timeoutMs)), timeoutMs);
    const started = Date.now();
    let response: Response | undefined;
    let error: unknown;
    try {
      response = await doFetch(url, { method, headers, body: opts.body, signal: controller.signal });
    } catch (err) {
      error = controller.signal.aborted ? new HttpTimeoutError(url, timeoutMs) : err;
    } finally {
      clearTimeout(timer);
    }
    const durationMs = Date.now() - started;
    const fields = { service: opts.service, method, target, attempt, durationMs };

    const retryable = response ? RETRYABLE_STATUS.has(response.status) : true;
    if (response && !retryable) {
      log.info("http.response", { ...fields, status: response.status });
      return response;
    }
    if (attempt >= maxRetries) {
      if (response) {
        log.warn("http.response", { ...fields, status: response.status, gaveUp: canRetry });
        return response;
      }
      log.warn("http.error", { ...fields, err: error });
      throw error;
    }
    const delay = (response && parseRetryAfter(response.headers.get("retry-after"))) ?? backoff(attempt);
    log.warn("http.retry", { ...fields, status: response?.status, err: error, delayMs: delay });
    await response?.body?.cancel().catch(() => {});
    await sleep(delay);
  }
}
