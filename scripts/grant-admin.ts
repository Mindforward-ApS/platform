import "dotenv/config";
import { createPrismaClient } from "../src/server/db";

// Usage: pnpm admin:grant <email>   — grants PLATFORM role GREB_ADMIN (Marco). 2FA is enforced on next /admin visit.
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error("Usage: pnpm admin:grant <email>");
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const db = createPrismaClient(url);
  const user = await db.user.update({ where: { email }, data: { platformRole: "GREB_ADMIN" } });
  await db.auditLog.create({
    data: { action: "PLATFORM_ROLE_GRANTED", actorType: "SYSTEM", targetType: "user", targetId: user.id, metadata: { role: "GREB_ADMIN", via: "script" } },
  });
  console.log(`GREB_ADMIN granted to ${email}`);
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
