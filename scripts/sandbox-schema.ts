import { writeFileSync } from "node:fs";
import { buildSandboxEventJsonSchema } from "../src/server/sandbox/event-json-schema";

// `pnpm sandbox:schema` — regenerates content/schema/sandbox-event.schema.json from the Zod event catalogue.
writeFileSync("content/schema/sandbox-event.schema.json", JSON.stringify(buildSandboxEventJsonSchema(), null, 2) + "\n");
console.log("sandbox:schema: content/schema/sandbox-event.schema.json skrevet");
