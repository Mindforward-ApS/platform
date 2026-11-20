import "server-only";
import type { ConnectorPlatformKey } from "./scoring";

// "Prøv den" behind one interface. Level 1 (built): DemoTestRunner — the model answers on fictional example data.
// Level 2 (later, not built): a real connection test (OAuth + one read-only call per provider) implements the same
// interface, so the panel UI does not change.

export interface ConnectorTestInput {
  userId: string;
  organizationId: string;
  platform: ConnectorPlatformKey;
  connectorName: string;
  /** Fictional records the connector "sees" (ConnectorDemo.data). */
  data: unknown;
  prompt: string;
}

export interface ConnectorTestRunner {
  readonly kind: "demo" | "live";
  /** Validates and reserves (budget/rate limits) before any byte is streamed; then streams the answer. */
  prepare(input: ConnectorTestInput): Promise<{ run(handlers: { onText?: (delta: string) => void }): Promise<{ text: string }> }>;
}

type PrepareStream = (raw: {
  feature: "CONNECTOR_DEMO";
  promptKey: "connector-demo";
  userId: string;
  organizationId: string;
  userText: string;
  dynamicContext: string;
  dynamicContextLabel: string;
  messages: { role: "user"; content: string }[];
}) => Promise<{ run(handlers: { onText?: (delta: string) => void }): Promise<{ text: string }> }>;

const PLATFORM_NAME: Record<ConnectorPlatformKey, string> = { CLAUDE: "Claude", CHATGPT: "ChatGPT", COPILOT: "Microsoft 365 Copilot" };

/** Level 1: live model answer on fictional data via the AI gateway (budget, rate limit, PII gate, logging). */
export function demoTestRunner(prepareStream: PrepareStream): ConnectorTestRunner {
  return {
    kind: "demo",
    prepare(input) {
      const context = [
        `CONNECTOR: ${input.connectorName}`,
        `PLATFORM BRUGEREN HAR VALGT: ${PLATFORM_NAME[input.platform]} (demoen kører IKKE i den)`,
        "EKSEMPELDATA (fiktive):",
        JSON.stringify(input.data, null, 1),
      ].join("\n");
      return prepareStream({
        feature: "CONNECTOR_DEMO",
        promptKey: "connector-demo",
        userId: input.userId,
        organizationId: input.organizationId,
        userText: input.prompt,
        dynamicContext: context.slice(0, 8000),
        dynamicContextLabel: "DEMODATA",
        messages: [{ role: "user", content: input.prompt }],
      });
    },
  };
}
