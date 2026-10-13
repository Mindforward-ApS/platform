import { consentExpireUnconfirmedJob } from "./consent-expire";
import { helloJob } from "./hello";

export { inngest } from "./client";
export const functions = [helloJob, consentExpireUnconfirmedJob];
