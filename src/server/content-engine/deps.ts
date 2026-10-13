import "server-only";
import { db } from "@/server/db";
import { loadContentConfig } from "./config";
import { githubCreateIssue } from "./github";
import { gatewayContentModel } from "./model";
import type { PipelineDeps } from "./pipeline";

/** Production wiring: app DB, env config, AI gateway, GitHub REST. Tests build PipelineDeps with mocks instead. */
export function contentDeps(): PipelineDeps {
  const config = loadContentConfig();
  return { db: db(), config, callContentModel: gatewayContentModel(), createIssue: githubCreateIssue(config) };
}
