import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import {
  listAllExecutives,
  listUsersForOwnerSelect,
  listPipelineEntriesForSearch,
  listSearchEntriesForExecutive,
  createPipelineEntry,
  updatePipelineEntryStage,
  updatePipelineEntryOwner,
  updatePipelineEntryComp,
  groupPipelineEntriesByStage,
  PIPELINE_STAGES,
} from "./pipeline";
import type {
  PipelineEntryRow,
  PartnerPipelineEntryRow,
  PartnerExecutivePipelineEntryRow,
} from "./pipeline";
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

const BASE_ROW = {
  id: ENTRY_ID,
  stage: "identified" as const,
  executiveId: EXEC_ID,
  executiveName: "Alice Chen",
  executiveCurrentRole: "CFO",
  ownerId: OWNER_ID,
  ownerName: "Jane Partner",
  ownerRole: "partner" as const,
  createdAt: new Date("2024-03-01T10:00:00Z"),
  updatedAt: new Date("2024-03-01T10:00:00Z"),
  baseSalaryCents: 35000000,
  targetBonusCents: 5000000,
  equityBps: 150,
};

describe("listPipelineEntriesForSearch", () => {
  it("returns joined rows for the given search (partner)", async () => {
    const chain = makeSelectChain([BASE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID, "partner");

    expect(result).toHaveLength(1);
    expect(result[0].executiveName).toBe("Alice Chen");
    expect(result[0].stage).toBe("identified");
    expect(chain.where).toHaveBeenCalled();
  });

  it("partner response includes all three comp fields with their values", async () => {
    const chain = makeSelectChain([BASE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID, "partner");
    const entry = result[0] as PartnerPipelineEntryRow;

    expect(entry.baseSalaryCents).toBe(35000000);
    expect(entry.targetBonusCents).toBe(5000000);
    expect(entry.equityBps).toBe(150);
  });

  it("associate response omits comp keys entirely — not nulled", async () => {
    const chain = makeSelectChain([BASE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID, "associate");
    const entry = result[0];

    expect("baseSalaryCents" in entry).toBe(false);
    expect("targetBonusCents" in entry).toBe(false);
    expect("equityBps" in entry).toBe(false);
  });

  it("associate response contains no trace of known comp fixture values in serialised form", async () => {
    const chain = makeSelectChain([BASE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID, "associate");
    const serialised = JSON.stringify(result);

    expect(serialised).not.toContain("35000000");
    expect(serialised).not.toContain("5000000");
    expect(serialised).not.toContain("150");
  });

  it("returns empty array when search has no pipeline entries", async () => {
    const chain = makeSelectChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listPipelineEntriesForSearch(SEARCH_ID, "partner");

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

describe("updatePipelineEntryComp", () => {
  it("updates all three comp fields and returns ok", async () => {
    const updateChain = makeUpdateChain([{ id: ENTRY_ID }]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryComp(ENTRY_ID, {
      baseSalaryCents: 35000000,
      targetBonusCents: 5000000,
      equityBps: 150,
    });

    expect(result).toEqual({ ok: true });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        baseSalaryCents: 35000000,
        targetBonusCents: 5000000,
        equityBps: 150,
      }),
    );
  });

  it("allows partial updates (only some comp fields provided)", async () => {
    const updateChain = makeUpdateChain([{ id: ENTRY_ID }]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryComp(ENTRY_ID, {
      baseSalaryCents: 40000000,
    });

    expect(result).toEqual({ ok: true });
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ baseSalaryCents: 40000000 }),
    );
  });

  it("allows nulling comp fields to clear previously set values", async () => {
    const updateChain = makeUpdateChain([{ id: ENTRY_ID }]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryComp(ENTRY_ID, {
      baseSalaryCents: null,
      targetBonusCents: null,
      equityBps: null,
    });

    expect(result).toEqual({ ok: true });
  });

  it("returns not_found when no entry matches the id", async () => {
    const updateChain = makeUpdateChain([]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updatePipelineEntryComp(
      "00000000-0000-4000-8000-000000000099",
      { baseSalaryCents: 35000000 },
    );

    expect(result).toEqual({ ok: false, error: "not_found" });
  });
});

const SEARCH_ID_2 = "00000000-0000-4000-8000-000000000006";

const EXEC_PIPELINE_ROW = {
  id: ENTRY_ID,
  searchId: SEARCH_ID,
  portfolioCompany: "Acme Ventures",
  roleTitle: "CFO",
  stage: "screening" as const,
  ownerId: OWNER_ID,
  ownerName: "Jane Partner",
  ownerRole: "partner" as const,
  createdAt: new Date("2024-03-01T10:00:00Z"),
  updatedAt: new Date("2024-03-15T10:00:00Z"),
  baseSalaryCents: 35000000,
  targetBonusCents: 5000000,
  equityBps: 150,
};

describe("listSearchEntriesForExecutive", () => {
  it("returns pipeline entries across searches for the given executive (partner)", async () => {
    const chain = makeSelectChain([EXEC_PIPELINE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearchEntriesForExecutive(EXEC_ID, "partner");

    expect(result).toHaveLength(1);
    expect(result[0].portfolioCompany).toBe("Acme Ventures");
    expect(result[0].roleTitle).toBe("CFO");
    expect(result[0].stage).toBe("screening");
    expect(chain.where).toHaveBeenCalled();
  });

  it("partner response includes all three comp fields with their values", async () => {
    const chain = makeSelectChain([EXEC_PIPELINE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearchEntriesForExecutive(EXEC_ID, "partner");
    const entry = result[0] as PartnerExecutivePipelineEntryRow;

    expect(entry.baseSalaryCents).toBe(35000000);
    expect(entry.targetBonusCents).toBe(5000000);
    expect(entry.equityBps).toBe(150);
  });

  it("associate response omits comp keys entirely — not nulled", async () => {
    const chain = makeSelectChain([EXEC_PIPELINE_ROW]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearchEntriesForExecutive(EXEC_ID, "associate");
    const entry = result[0];

    expect("baseSalaryCents" in entry).toBe(false);
    expect("targetBonusCents" in entry).toBe(false);
    expect("equityBps" in entry).toBe(false);
  });

  it("associate response contains no trace of known comp fixture values in serialised form", async () => {
    const secondRow = {
      ...EXEC_PIPELINE_ROW,
      id: "00000000-0000-4000-8000-000000000010",
      searchId: SEARCH_ID_2,
      portfolioCompany: "Beta Capital",
      baseSalaryCents: 42000000,
      targetBonusCents: 7000000,
      equityBps: 200,
    };
    const chain = makeSelectChain([EXEC_PIPELINE_ROW, secondRow]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearchEntriesForExecutive(EXEC_ID, "associate");
    const serialised = JSON.stringify(result);

    expect(serialised).not.toContain("35000000");
    expect(serialised).not.toContain("42000000");
    expect(serialised).not.toContain("5000000");
    expect(serialised).not.toContain("7000000");
    expect(serialised).not.toContain("150");
    expect(serialised).not.toContain("200");
  });

  it("returns empty array when executive has no pipeline entries", async () => {
    const chain = makeSelectChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearchEntriesForExecutive(EXEC_ID, "partner");

    expect(result).toEqual([]);
  });

  it("returns entries from multiple searches for the same executive", async () => {
    const secondRow = {
      ...EXEC_PIPELINE_ROW,
      id: "00000000-0000-4000-8000-000000000010",
      searchId: SEARCH_ID_2,
      portfolioCompany: "Beta Capital",
    };
    const chain = makeSelectChain([EXEC_PIPELINE_ROW, secondRow]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearchEntriesForExecutive(EXEC_ID, "partner");

    expect(result).toHaveLength(2);
    expect(result[0].portfolioCompany).toBe("Acme Ventures");
    expect(result[1].portfolioCompany).toBe("Beta Capital");
  });
});
