import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { executives } from "./db/schema";

export type Executive = typeof executives.$inferSelect;

export type ExecutiveListItem = Pick<
  Executive,
  "id" | "name" | "email" | "currentRole" | "updatedAt"
>;

export async function listExecutives(
  page: number,
  pageSize: number,
): Promise<{ executives: ExecutiveListItem[]; total: number }> {
  const db = getDb();
  const offset = (page - 1) * pageSize;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: executives.id,
        name: executives.name,
        email: executives.email,
        currentRole: executives.currentRole,
        updatedAt: executives.updatedAt,
      })
      .from(executives)
      .orderBy(desc(executives.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(executives),
  ]);

  return { executives: rows, total };
}

export async function getExecutive(id: string): Promise<Executive | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(executives)
    .where(eq(executives.id, id))
    .limit(1);
  return row ?? null;
}
