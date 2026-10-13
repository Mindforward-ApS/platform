import { helloJob } from "./hello";
import { retentionPurgePromptTextJob } from "./retention-purge-prompt-text";

export { inngest } from "./client";
export const functions = [helloJob, retentionPurgePromptTextJob];
