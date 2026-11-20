import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import moduleJsonSchema from "../../../content/schema/module.schema.json";

// The same JSON Schema check as scripts/content-validate.ts (content/schema/module.schema.json, Ajv 2020 + formats),
// with the schema bundled via import so it works in serverless functions.

const addFormats = (addFormatsModule as unknown as { default?: typeof addFormatsModule }).default ?? addFormatsModule;
let validate: ReturnType<Ajv2020["compile"]> | undefined;

export function validateModuleJsonSchema(data: unknown): string[] {
  if (!validate) {
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    (addFormats as unknown as (a: Ajv2020) => void)(ajv);
    validate = ajv.compile(moduleJsonSchema as object);
  }
  return validate(data) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || "/"} ${e.message ?? ""}`);
}
