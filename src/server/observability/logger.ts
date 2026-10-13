export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Never log PII or secrets (docs/02-arkitektur.md § 7).
const REDACT_KEYS = new Set(
  ["email", "name", "prompttext", "contenttext", "aifeedback", "token", "authorization", "cookie", "password", "secret", "apikey"].map(
    (k) => k.toLowerCase(),
  ),
);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, code: (value as { code?: unknown }).code };
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export function createLogger(opts: { write?: (line: string) => void; minLevel?: LogLevel; base?: LogFields } = {}): Logger {
  const write = opts.write ?? ((line: string) => process.stdout.write(line + "\n"));
  const min = LEVELS[opts.minLevel ?? "info"];
  const emit = (level: LogLevel, msg: string, fields?: LogFields) => {
    if (LEVELS[level] < min) return;
    const payload = redact({ ...opts.base, ...fields }) as LogFields;
    write(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...payload }));
  };
  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
  };
}

const envLevel = process.env.LOG_LEVEL;
export const logger: Logger = createLogger({
  minLevel: envLevel === "debug" || envLevel === "warn" || envLevel === "error" ? envLevel : "info",
});
