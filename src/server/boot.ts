import { serverEnv } from "@/lib/env";

/** Fail fast: the server refuses to start with a missing/invalid env var and names it (M0 acceptance). */
export function assertEnvOrExit(): void {
  try {
    serverEnv();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
