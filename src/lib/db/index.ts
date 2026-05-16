import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../env";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let cachedClient: ReturnType<typeof postgres> | undefined;
let cachedDb: Database | undefined;

export function getDb(): Database {
  if (!cachedDb) {
    cachedClient = postgres(env.DATABASE_URL, { prepare: false });
    cachedDb = drizzle(cachedClient, { schema });
  }
  return cachedDb;
}

export { schema };
