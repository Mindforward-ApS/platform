import { serve } from "inngest/next";
import { functions, inngest } from "@/server/jobs";

// Requests are verified with INNGEST_SIGNING_KEY by serve() (docs/02-arkitektur.md § 7).
export const { GET, POST, PUT } = serve({ client: inngest, functions });
