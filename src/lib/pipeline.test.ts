import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import {
  listAllExecutives,
  listUsersForOwnerSelect,
  listPipelineEntriesForSearch,
  createPipelineEntry,
  updatePipelineEntryStage,
  updatePipelineEntryOwner,
  groupPipelineEntriesByStage,
  PIPELINE_STAGES,
} from "./pipeline";
import type { PipelineEntryRow } from "./pipeline";
import { getDb } from "./db";

const mockGetDb = vi.mocked(getDb);

function makeSelectChain(resolveValue: unknown) {
  const p = Promise.resolve(resolveValue);
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => p),
    limit: vi.fn(() => p),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

function makeInsertChain(resolveValue: unknown, rejectError?: unknown) {
  const p = rejectError
    ? Promise.reject(rejectError)
    : Promise.resolve(resolveValue);
  const chain: Record<string, unknown> = {
    insert: vi.fn(() => chain),
    values: vi.fn(() => chain),
    returning: vi.fn(() => p),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

function makeUpdateChain(resolveValue: unknown) {
  const p = Promise.resolve(resolveValue);
  const chain: Record<string, unknown> = {
    update: vi.fn(() => chain),
    set: vi.fn(() => chain),
    where: vi.fn(() => chain),
    returning: vi.fn(() => p),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

const EXEC_ID = "00000000-0000-4000-8000-000000000001";
const SEARCH_ID = "00000000-0000-4000-8000-000000000002";
const OWNER_ID = "00000000-0000-4000-8000-000000000003";
const ENTRY_ID = "00000000-0000-4000-8000-000000000004";
const OTHER_OWNER_ID = "00000000-0000-4000-8000-000000000005";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listAllExecutives", () => {
  it("returns executives ordered by name", async () => {
    const rows = [
      { id: EXEC_ID, name: "Alice Chen", currentRole: "CFO" },
      { id: "00000000-0000-4000-8000-000000000009", name: "Bob Lee", currentRole: null },
    ];
    const chain = makeSelectChain(rows);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listAllExecutives();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice Chen");
    expect(chain.orderBy).toHaveBeenCalled();
  });

  it("returns empty array when no executives exist", async () => {
    const chain = makeSelectChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listAllExecutives();

    expect(result).toEqual([]);
  });
});

describe("listUsersForOwnerSelect", () => {
  it("returns all users ordered by name", async () => {
    const rows = [
      { id: OWNER_ID, name: "Jane Partner", role: "partner" as const },
      { id: OTHER_OWNER_ID, name: "Tom Associate", role: "associate" as const },
    ];
    const chain = makeSelectChain(rows);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listUsersForOwnerSelect();

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("partner");
    expect(chain.orderBy).toHaveBeenCalled();
  });
});

describe("listPipelineEntriesForSearch", () => {
  it("returns joined rows for the given search", async () => {
    const rows = [
      {
        id: ENTRY_ID,
        stage: "identified",
        executiveId: EXEC_ID,
        executiveName: "Alice Chen",
        executiveCurrentRole: "CFO",
        ownerId: OWNER_ID,
        ownerName: "Jane Partner",
        ownerRole: "partner",
        createdAt: new Date("2024-03-01T10:00:00Z"),
        updatedAt: new Date("2024-03-01T10:00:00Z"),
      },
    ];
    const chain = makeSelectChain(rows);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID);

    expect(result).toHaveLength(1);
    expect(result[0].executiveName).toBe("Alice Chen");
    expect(result[0].stage).toBe("identified");
    expect(chain.where).toHaveBeenCalled();
  });

  it("returns empty array when search has no pipeline entries", async () => {
    const chain = makeSelectChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID);

    expect(result).toEqual([]);
  });
});

describe("createPipelineEntry", () => {
  it("inserts at identified stage and returns ok with id", async () => {
    const insertChain = makeInsertChain([{ id: ENTRY_ID }]);
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    const result = await createPipelineEntry({
      executiveId: EXEC_ID,
      searchId: SEARCH_ID,
      ownerId: OWNER_ID,
    });

    expect(result).toEqual({ ok: true, id: ENTRY_ID });
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "identified" }),
    );
  });

  it("returns duplicate_open when the same executive is already in the search (direct code)", async () => {
    const duplicateError = { code: "23505" };
    const insertChain = makeInsertChain(null, duplicateError);
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    const result = await createPipelineEntry({
      executiveId: EXEC_ID,
      searchId: SEARCH_ID,
      ownerId: OWNER_ID,
    });

    expect(result).toEqual({ ok: false, error: "duplicate_open" });
  });

  it("returns duplicate_open when Drizzle wraps the postgres error in cause", async () => {
    const wrappedError = { message: "Failed query", cause: { code: "23505" } };
    const insertChain = makeInsertChain(null, wrappedError);
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    const result = await createPipelineEntry({
      executiveId: EXEC_ID,
      searchId: SEARCH_ID,
      ownerId: OWNER_ID,
    });

    expect(result).toEqual({ ok: false, error: "duplicate_open" });
  });

  it("re-throws unexpected database errors", async () => {
    const unexpectedError = new Error("connection refused");
    const insertChain = makeInsertChain(null, unexpectedError);
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    await expect(
      createPipelineEntry({
        executiveId: EXEC_ID,
        searchId: SEARCH_ID,
        ownerId: OWNER_ID,
      }),
    ).rejects.toThrow("connection refused");
  });
});

describe("updatePipelineEntryStage", () => {
  it("updates the stage and returns ok", async () => {
    const updateChain = makeUpdateChain([{ id: ENTRY_ID }]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryStage(ENTRY_ID, "screening");

    expect(result).toEqual({ ok: true });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ stage: "screening" }),
    );
  });

  it("can advance to any stage including placed and passed", async () => {
    for (const stage of ["contacted", "partner_interview", "offer", "placed", "passed"] as const) {
      const updateChain = makeUpdateChain([{ id: ENTRY_ID }]);
      mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

      const result = await updatePipelineEntryStage(ENTRY_ID, stage);

      expect(result).toEqual({ ok: true });
    }
  });

  it("returns not_found when no entry matches the id", async () => {
    const updateChain = makeUpdateChain([]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryStage(
      "00000000-0000-4000-8000-000000000099",
      "contacted",
    );

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

describe("groupPipelineEntriesByStage", () => {
  function makeEntry(id: string, stage: PipelineEntryRow["stage"]): PipelineEntryRow {
    return {
      id,
      stage,
      executiveId: EXEC_ID,
      executiveName: "Alice Chen",
      executiveCurrentRole: "CFO",
      ownerId: OWNER_ID,
      ownerName: "Jane Partner",
      ownerRole: "partner",
      createdAt: new Date("2024-03-01T10:00:00Z"),
      updatedAt: new Date("2024-03-01T10:00:00Z"),
    };
  }

  it("returns empty array when there are no entries", () => {
    expect(groupPipelineEntriesByStage([])).toEqual([]);
  });

  it("groups entries by stage and omits stages with no entries", () => {
    const entries = [
      makeEntry("e1", "identified"),
      makeEntry("e2", "screening"),
      makeEntry("e3", "identified"),
    ];
    const groups = groupPipelineEntriesByStage(entries);
    expect(groups).toHaveLength(2);
    expect(groups[0].stage).toBe("identified");
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].stage).toBe("screening");
    expect(groups[1].entries).toHaveLength(1);
  });

  it("orders groups by the canonical PIPELINE_STAGES order, not insertion order", () => {
    const entries = [
      makeEntry("e1", "offer"),
      makeEntry("e2", "contacted"),
      makeEntry("e3", "identified"),
    ];
    const groups = groupPipelineEntriesByStage(entries);
    const stageOrder = groups.map((g) => g.stage);
    expect(stageOrder).toEqual(["identified", "contacted", "offer"]);
  });

  it("includes the human-readable label for each stage", () => {
    const entries = [makeEntry("e1", "partner_interview")];
    const groups = groupPipelineEntriesByStage(entries);
    expect(groups[0].label).toBe("Partner Interview");
  });

  it("can represent all pipeline stages when entries exist for each", () => {
    const entries = PIPELINE_STAGES.map((stage, i) => makeEntry(`e${i}`, stage));
    const groups = groupPipelineEntriesByStage(entries);
    expect(groups).toHaveLength(PIPELINE_STAGES.length);
    expect(groups.map((g) => g.stage)).toEqual([...PIPELINE_STAGES]);
  });
});

describe("updatePipelineEntryOwner", () => {
  it("updates the owner and returns ok", async () => {
    const updateChain = makeUpdateChain([{ id: ENTRY_ID }]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryOwner(ENTRY_ID, OTHER_OWNER_ID);

    expect(result).toEqual({ ok: true });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: OTHER_OWNER_ID }),
    );
  });

  it("returns not_found when no entry matches the id", async () => {
    const updateChain = makeUpdateChain([]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryOwner(
      "00000000-0000-4000-8000-000000000099",
      OTHER_OWNER_ID,
    );

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});
