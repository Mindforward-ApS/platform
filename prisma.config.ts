import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: datasource URL lives here. Migrations use the direct (unpooled) Neon connection.
// `prisma generate` does not need a database, so a missing URL is allowed outside migrate commands.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
});
