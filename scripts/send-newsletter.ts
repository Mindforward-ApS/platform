import "dotenv/config";
import { readFileSync } from "node:fs";
import { serverEnv } from "../src/lib/env";
import { createPrismaClient } from "../src/server/db";
import { sendNewsletter } from "../src/server/email/newsletter";

// Usage: pnpm marketing:newsletter <draft.json> --approve [--now=<ISO, non-production only>]
// The draft (subject, heading, intro, items, url, approvedBy, approvedAt) is the text Marco approved.
// Every recipient passes the send-time consent gate, caps and quiet hours in sendMarketingEmail.
async function main() {
  const file = process.argv[2];
  const approved = process.argv.includes("--approve");
  const nowArg = process.argv.find((a) => a.startsWith("--now="))?.slice(6);
  if (!file || !approved) throw new Error("Usage: pnpm marketing:newsletter <draft.json> --approve");
  const env = serverEnv();
  if (nowArg && env.VERCEL_ENV === "production") throw new Error("--now is not allowed in production");
  const db = createPrismaClient(env.DATABASE_URL);
  const run = await sendNewsletter(db, JSON.parse(readFileSync(file, "utf8")), { now: nowArg ? new Date(nowArg) : undefined });
  console.log(JSON.stringify(run));
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
