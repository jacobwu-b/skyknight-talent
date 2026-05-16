import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { searches } from "./db/schema";

export type Search = typeof searches.$inferSelect;

export type SearchListItem = Pick<
  Search,
  "id" | "portfolioCompany" | "roleTitle" | "hiringManager" | "status" | "createdAt"
>;

export type CreateSearchInput = {
  portfolioCompany: string;
  roleTitle: string;
  hiringManager: string;
};

export type UpdateSearchInput = {
  roleTitle?: string;
  hiringManager?: string;
  status?: "open" | "paused" | "filled";
};

export type CreateSearchResult = { ok: true; id: string };

export type UpdateSearchResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_transition" };

const VALID_TRANSITIONS: Record<string, Set<string>> = {
  open: new Set(["paused", "filled"]),
  paused: new Set(["open", "filled"]),
  filled: new Set(),
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.has(to) ?? false;
}

export async function listSearches(): Promise<SearchListItem[]> {
  const db = getDb();
  return db
    .select({
      id: searches.id,
      portfolioCompany: searches.portfolioCompany,
      roleTitle: searches.roleTitle,
      hiringManager: searches.hiringManager,
      status: searches.status,
      createdAt: searches.createdAt,
    })
    .from(searches)
    .orderBy(asc(searches.portfolioCompany), desc(searches.createdAt));
}

export async function getSearch(id: string): Promise<Search | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(searches)
    .where(eq(searches.id, id))
    .limit(1);
  return row ?? null;
}

export async function createSearch(
  input: CreateSearchInput,
): Promise<CreateSearchResult> {
  const db = getDb();
  const [row] = await db
    .insert(searches)
    .values({
      portfolioCompany: input.portfolioCompany,
      roleTitle: input.roleTitle,
      hiringManager: input.hiringManager,
    })
    .returning({ id: searches.id });
  return { ok: true, id: row.id };
}

export async function updateSearch(
  id: string,
  input: UpdateSearchInput,
): Promise<UpdateSearchResult> {
  const db = getDb();

  if (input.status !== undefined) {
    const [current] = await db
      .select({ status: searches.status })
      .from(searches)
      .where(eq(searches.id, id))
      .limit(1);

    if (!current) return { ok: false, error: "not_found" };

    if (!isValidTransition(current.status, input.status)) {
      return { ok: false, error: "invalid_transition" };
    }
  }

  const rows = await db
    .update(searches)
    .set({
      ...(input.roleTitle !== undefined && { roleTitle: input.roleTitle }),
      ...(input.hiringManager !== undefined && { hiringManager: input.hiringManager }),
      ...(input.status !== undefined && { status: input.status }),
      updatedAt: new Date(),
    })
    .where(eq(searches.id, id))
    .returning({ id: searches.id });

  if (rows.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}
