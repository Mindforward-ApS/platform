import "dotenv/config";
import { defineConfig } from "prisma/config";
import { migrationDatabaseUrl } from "./src/lib/migration-database-url";

// Prisma 7: datasource URL lives here. Migrations use the direct (unpooled) Neon connection.
// Without DATABASE_URL_UNPOOLED the direct URL is derived from DATABASE_URL (src/lib/migration-database-url.ts).
// `prisma generate` does not need a database, so a missing URL is allowed outside migrate commands.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    url: migrationDatabaseUrl(process.env),
  },
});
