import "dotenv/config";
import { createPrismaClient } from "../../src/server/db";
import { seedCourses } from "../../src/server/courses/seed";

// `pnpm db:seed:forloeb` — idempotent: ChatGPT, Claude and Copilot courses from content/forloeb/forloeb.json.
// Run by hand against the database you mean (DATABASE_URL). Deliberately NOT part of `pnpm db:seed`, which the
// Vercel preview build runs automatically.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const db = createPrismaClient(url);
  const summary = await seedCourses(db);
  console.log(`db:seed:forloeb: ${JSON.stringify(summary)}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
