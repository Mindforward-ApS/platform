import { Inngest } from "inngest";

// Inngest v4 defaults to cloud mode; local dev sets INNGEST_DEV=1 (Inngest Dev Server).
export const inngest = new Inngest({ id: "greb" });
