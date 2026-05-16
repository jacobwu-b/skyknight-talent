import { asc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { executives, pipelineEntries, users } from "./db/schema";

// Comp fields — present only in partner-role responses (spec 0005 / ADR-0003).
export type CompFields = {
  baseSalaryCents: number | null;
  targetBonusCents: number | null;
  equityBps: number | null;
};

export const PIPELINE_STAGES = [
  "identified",
  "contacted",
  "screening",
  "partner_interview",
  "client_interview",
  "offer",
  "placed",
  "passed",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  identified: "Identified",
  contacted: "Contacted",
  screening: "Screening",
  partner_interview: "Partner Interview",
  client_interview: "Client Interview",
  offer: "Offer",
  placed: "Placed",
  passed: "Passed",
};

export type PipelineEntryRow = {
  id: string;
  stage: PipelineStage;
  executiveId: string;
  executiveName: string;
  executiveCurrentRole: string | null;
  ownerId: string;
  ownerName: string;
  ownerRole: "partner" | "associate";
  createdAt: Date;
  updatedAt: Date;
};

// Extends PipelineEntryRow with comp fields — only returned when requestingRole is "partner".
export type PartnerPipelineEntryRow = PipelineEntryRow & CompFields;

export type UpdatePipelineEntryCompInput = Partial<CompFields>;

export type OwnerOption = {
  id: string;
  name: string;
  role: "partner" | "associate";
};

export type ExecutiveOption = {
  id: string;
  name: string;
  currentRole: string | null;
};

export type CreatePipelineEntryInput = {
  executiveId: string;
  searchId: string;
  ownerId: string;
};

export type CreatePipelineEntryResult =
  | { ok: true; id: string }
  | { ok: false; error: "duplicate_open" };

export type UpdatePipelineEntryResult =
  | { ok: true }
  | { ok: false; error: "not_found" };

export async function listAllExecutives(): Promise<ExecutiveOption[]> {
  const db = getDb();
  return db
    .select({
      id: executives.id,
      name: executives.name,
      currentRole: executives.currentRole,
    })
    .from(executives)
    .orderBy(asc(executives.name));
}

export async function listUsersForOwnerSelect(): Promise<OwnerOption[]> {
  const db = getDb();
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .orderBy(asc(users.name));
}

export async function listPipelineEntriesForSearch(
  searchId: string,
  requestingRole: "partner" | "associate",
): Promise<PartnerPipelineEntryRow[] | PipelineEntryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: pipelineEntries.id,
      stage: pipelineEntries.stage,
      executiveId: pipelineEntries.executiveId,
      executiveName: executives.name,
      executiveCurrentRole: executives.currentRole,
      ownerId: pipelineEntries.ownerId,
      ownerName: users.name,
      ownerRole: users.role,
      createdAt: pipelineEntries.createdAt,
      updatedAt: pipelineEntries.updatedAt,
      baseSalaryCents: pipelineEntries.baseSalaryCents,
      targetBonusCents: pipelineEntries.targetBonusCents,
      equityBps: pipelineEntries.equityBps,
    })
    .from(pipelineEntries)
    .innerJoin(executives, eq(pipelineEntries.executiveId, executives.id))
    .innerJoin(users, eq(pipelineEntries.ownerId, users.id))
    .where(eq(pipelineEntries.searchId, searchId))
    .orderBy(asc(pipelineEntries.stage), asc(pipelineEntries.createdAt));

  if (requestingRole === "partner") {
    return rows as PartnerPipelineEntryRow[];
  }
  return rows.map(redactComp);
}

// Omits comp keys entirely — does not null them (spec 0005).
function redactComp(row: PartnerPipelineEntryRow): PipelineEntryRow {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { baseSalaryCents, targetBonusCents, equityBps, ...rest } = row;
  return rest;
}

export async function createPipelineEntry(
  input: CreatePipelineEntryInput,
): Promise<CreatePipelineEntryResult> {
  const db = getDb();
  try {
    const [row] = await db
      .insert(pipelineEntries)
      .values({
        executiveId: input.executiveId,
        searchId: input.searchId,
        ownerId: input.ownerId,
        stage: "identified",
      })
      .returning({ id: pipelineEntries.id });
    return { ok: true, id: row.id };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return { ok: false, error: "duplicate_open" };
    }
    throw err;
  }
}

export async function updatePipelineEntryStage(
  id: string,
  stage: PipelineStage,
): Promise<UpdatePipelineEntryResult> {
  const db = getDb();
  const rows = await db
    .update(pipelineEntries)
    .set({ stage, updatedAt: new Date() })
    .where(eq(pipelineEntries.id, id))
    .returning({ id: pipelineEntries.id });
  if (rows.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

export async function updatePipelineEntryOwner(
  id: string,
  ownerId: string,
): Promise<UpdatePipelineEntryResult> {
  const db = getDb();
  const rows = await db
    .update(pipelineEntries)
    .set({ ownerId, updatedAt: new Date() })
    .where(eq(pipelineEntries.id, id))
    .returning({ id: pipelineEntries.id });
  if (rows.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

export async function updatePipelineEntryComp(
  id: string,
  comp: UpdatePipelineEntryCompInput,
): Promise<UpdatePipelineEntryResult> {
  const db = getDb();
  const rows = await db
    .update(pipelineEntries)
    .set({ ...comp, updatedAt: new Date() })
    .where(eq(pipelineEntries.id, id))
    .returning({ id: pipelineEntries.id });
  if (rows.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

export type GroupedPipelineEntries = {
  stage: PipelineStage;
  label: string;
  entries: PipelineEntryRow[];
}[];

export function groupPipelineEntriesByStage(
  entries: PipelineEntryRow[],
): GroupedPipelineEntries {
  const byStage = new Map<PipelineStage, PipelineEntryRow[]>();
  for (const entry of entries) {
    const group = byStage.get(entry.stage);
    if (group) {
      group.push(entry);
    } else {
      byStage.set(entry.stage, [entry]);
    }
  }
  return PIPELINE_STAGES.filter((s) => byStage.has(s)).map((s) => ({
    stage: s,
    label: PIPELINE_STAGE_LABELS[s],
    entries: byStage.get(s)!,
  }));
}

function isDuplicateKeyError(err: unknown): boolean {
  const hasCode23505 = (e: unknown): boolean =>
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "23505";
  // Drizzle wraps the postgres error in `cause`
  return hasCode23505(err) || hasCode23505((err as { cause?: unknown })?.cause);
}

export { sql };
