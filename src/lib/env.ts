import "server-only";
import { parseServerEnv, type ServerEnv } from "./env.schema";

let cached: ServerEnv | undefined;

/** Validated server environment. Throws EnvValidationError naming every bad variable. */
export function serverEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}
