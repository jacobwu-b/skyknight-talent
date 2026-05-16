import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { env } from "../src/lib/env";

type JournalEntry = { idx: number; tag: string };
type Journal = { entries: JournalEntry[] };

async function main() {
  const migrationsDir = path.resolve("./db/migrations");
  const journal = JSON.parse(
    await readFile(path.join(migrationsDir, "meta/_journal.json"), "utf8"),
  ) as Journal;

  const client = postgres(env.DATABASE_URL, { max: 1 });

  // Drizzle records applied migrations in drizzle.__drizzle_migrations.
  // Find the latest applied entry and run its sibling .down.sql.
  const applied = await client<{ hash: string; created_at: string }[]>`
    SELECT hash, created_at FROM drizzle.__drizzle_migrations
    ORDER BY created_at DESC LIMIT 1
  `.catch(() => [] as { hash: string; created_at: string }[]);

  if (applied.length === 0) {
    console.log("no migrations to roll back");
    await client.end();
    return;
  }

  const latest = journal.entries.sort((a, b) => b.idx - a.idx)[0];
  if (!latest) throw new Error("journal has no entries");

  const downPath = path.join(migrationsDir, `${latest.tag}.down.sql`);
  const downSql = await readFile(downPath, "utf8");

  await client.begin(async (tx) => {
    for (const stmt of downSql.split("--> statement-breakpoint")) {
      const s = stmt.trim();
      if (s.length === 0) continue;
      await tx.unsafe(s);
    }
    await tx`DELETE FROM drizzle.__drizzle_migrations WHERE hash = ${applied[0].hash}`;
  });

  await client.end();
  console.log(`rolled back ${latest.tag}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
