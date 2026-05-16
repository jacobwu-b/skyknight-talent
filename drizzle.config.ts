import { defineConfig } from "drizzle-kit";

// `generate` (schema diff) does not need a live DB; `migrate`/`push` do.
// We require DATABASE_URL only when a credential-using command runs.
const databaseUrl = process.env.DATABASE_URL ?? "postgres://unused";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
