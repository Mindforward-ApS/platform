import "dotenv/config";
import { createPrismaClient } from "../src/server/db";
import { seedAll } from "../src/server/content/seed";

// `pnpm db:seed` — idempotent: tracks, plans (from src/lib/config/plans.ts) and modules (content/modules).
// Nordlys Logistik is NOT stored in the DB; it is bundled from content/sandbox-world (docs/02 § 11).
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const db = createPrismaClient(url);
  const summary = await seedAll(db);
  console.log(`db:seed: ${JSON.stringify(summary)}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
