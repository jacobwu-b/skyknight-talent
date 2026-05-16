import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "./db";
import { executives, executiveInteractions, users } from "./db/schema";

export type Executive = typeof executives.$inferSelect;

export type ExecutiveListItem = Pick<
  Executive,
  "id" | "name" | "email" | "currentRole" | "updatedAt"
>;

export type CreateExecutiveInput = {
  name: string;
  email: string;
  phone?: string | null;
  linkedinUrl?: string | null;
  currentRole?: string | null;
  notes?: string | null;
  tags?: string[];
};

export type CreateExecutiveResult =
  | { ok: true; id: string }
  | { ok: false; error: "duplicate_email"; existingId: string };

export type UpdateExecutiveResult =
  | { ok: true }
  | { ok: false; error: "not_found" | "duplicate_email"; existingId?: string };

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

export async function createExecutive(
  input: CreateExecutiveInput,
): Promise<CreateExecutiveResult> {
  const db = getDb();
  try {
    const [row] = await db
      .insert(executives)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        linkedinUrl: input.linkedinUrl ?? null,
        currentRole: input.currentRole ?? null,
        notes: input.notes ?? null,
        tags: input.tags ?? [],
      })
      .returning({ id: executives.id });
    return { ok: true, id: row.id };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const [existing] = await db
        .select({ id: executives.id })
        .from(executives)
        .where(eq(executives.email, input.email))
        .limit(1);
      return { ok: false, error: "duplicate_email", existingId: existing.id };
    }
    throw err;
  }
}

export async function updateExecutive(
  id: string,
  input: Partial<CreateExecutiveInput>,
): Promise<UpdateExecutiveResult> {
  const db = getDb();
  try {
    const rows = await db
      .update(executives)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.email !== undefined && { email: input.email }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.linkedinUrl !== undefined && {
          linkedinUrl: input.linkedinUrl,
        }),
        ...(input.currentRole !== undefined && {
          currentRole: input.currentRole,
        }),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.tags !== undefined && { tags: input.tags }),
        updatedAt: new Date(),
      })
      .where(eq(executives.id, id))
      .returning({ id: executives.id });

    if (rows.length === 0) return { ok: false, error: "not_found" };
    return { ok: true };
  } catch (err) {
    if (isDuplicateKeyError(err) && input.email) {
      const [existing] = await db
        .select({ id: executives.id })
        .from(executives)
        .where(eq(executives.email, input.email))
        .limit(1);
      return {
        ok: false,
        error: "duplicate_email",
        existingId: existing?.id,
      };
    }
    throw err;
  }
}

export async function searchExecutives(
  query: string,
): Promise<ExecutiveListItem[]> {
  const q = query.trim();
  if (!q) return [];
  const db = getDb();

  const like = `%${q}%`;
  return db
    .select({
      id: executives.id,
      name: executives.name,
      email: executives.email,
      currentRole: executives.currentRole,
      updatedAt: executives.updatedAt,
    })
    .from(executives)
    .where(
      or(
        ilike(executives.name, like),
        ilike(executives.currentRole, like),
        sql`EXISTS (SELECT 1 FROM unnest(${executives.tags}) t WHERE t ILIKE ${like})`,
      ),
    )
    .orderBy(desc(executives.updatedAt))
    .limit(50);
}

export type InteractionRow = {
  id: string;
  direction: "inbound" | "outbound";
  occurredAt: Date;
  subject: string | null;
  bodyExcerpt: string | null;
  senderId: string | null;
  senderName: string | null;
};

export async function listInteractionsForExecutive(
  executiveId: string,
  limit: number,
): Promise<{ interactions: InteractionRow[]; hasMore: boolean }> {
  const db = getDb();
  const rows = await db
    .select({
      id: executiveInteractions.id,
      direction: executiveInteractions.direction,
      occurredAt: executiveInteractions.occurredAt,
      subject: executiveInteractions.subject,
      bodyExcerpt: executiveInteractions.bodyExcerpt,
      senderId: executiveInteractions.senderId,
      senderName: users.name,
    })
    .from(executiveInteractions)
    .leftJoin(users, eq(executiveInteractions.senderId, users.id))
    .where(eq(executiveInteractions.executiveId, executiveId))
    .orderBy(desc(executiveInteractions.occurredAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  return { interactions: rows.slice(0, limit), hasMore };
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}
