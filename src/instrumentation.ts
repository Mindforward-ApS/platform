import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnvOrExit } = await import("./server/boot");
    assertEnvOrExit();
    await import("./sentry.server.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
