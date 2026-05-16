import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import {
  listExecutives,
  getExecutive,
  createExecutive,
  updateExecutive,
  searchExecutives,
} from "./executives";
import { getDb } from "./db";

const mockGetDb = vi.mocked(getDb);

function makeThenableChain(resolveValue: unknown) {
  const p = Promise.resolve(resolveValue);
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => p),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

function makeInsertChain(resolveValue: unknown) {
  const p = Promise.resolve(resolveValue);
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

const EXEC_A = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Andrea Costa",
  email: "andrea@example.com",
  phone: null,
  linkedinUrl: null,
  currentRole: "Chief Revenue Officer",
  notes: null,
  tags: [],
  createdAt: new Date("2024-01-15T10:00:00Z"),
  updatedAt: new Date("2024-03-01T12:00:00Z"),
};

const EXEC_B = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Ben Okafor",
  email: "ben@example.com",
  phone: "+1-555-0102",
  linkedinUrl: "https://linkedin.com/in/benokafor",
  currentRole: "VP of Engineering",
  notes: "Referred by Aiko",
  tags: ["fintech", "series-b"],
  createdAt: new Date("2024-02-01T09:00:00Z"),
  updatedAt: new Date("2024-02-28T18:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listExecutives", () => {
  it("returns executives sorted by updatedAt desc with total count", async () => {
    const listChain = makeThenableChain([EXEC_A, EXEC_B]);
    const countChain = makeThenableChain([{ total: 2 }]);
    let callCount = 0;
    mockGetDb.mockReturnValue({
      select: vi.fn(() => (++callCount === 1 ? listChain : countChain)),
    } as never);

    const result = await listExecutives(1, 20);

    expect(result.total).toBe(2);
    expect(result.executives).toHaveLength(2);
    expect(result.executives[0].name).toBe("Andrea Costa");
    expect(result.executives[1].name).toBe("Ben Okafor");
  });

  it("applies offset for page 2", async () => {
    const listChain = makeThenableChain([]);
    const countChain = makeThenableChain([{ total: 0 }]);
    let callCount = 0;
    mockGetDb.mockReturnValue({
      select: vi.fn(() => (++callCount === 1 ? listChain : countChain)),
    } as never);

    await listExecutives(2, 10);

    expect(listChain.offset).toHaveBeenCalledWith(10);
  });

  it("returns empty array and zero total when no executives exist", async () => {
    const listChain = makeThenableChain([]);
    const countChain = makeThenableChain([{ total: 0 }]);
    let callCount = 0;
    mockGetDb.mockReturnValue({
      select: vi.fn(() => (++callCount === 1 ? listChain : countChain)),
    } as never);

    const result = await listExecutives(1, 20);

    expect(result.executives).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("getExecutive", () => {
  it("returns the executive when found by id", async () => {
    const chain = makeThenableChain([EXEC_A]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await getExecutive(EXEC_A.id);

    expect(result).toEqual(EXEC_A);
  });

  it("returns null when no executive matches the id", async () => {
    const chain = makeThenableChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await getExecutive("00000000-0000-4000-8000-000000000099");

    expect(result).toBeNull();
  });

  it("queries by the provided id", async () => {
    const chain = makeThenableChain([EXEC_B]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    await getExecutive(EXEC_B.id);

    expect(chain.where).toHaveBeenCalled();
  });
});

describe("createExecutive", () => {
  it("inserts and returns ok with id on success", async () => {
    const insertChain = makeInsertChain([{ id: EXEC_A.id }]);
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    const result = await createExecutive({
      name: "Andrea Costa",
      email: "andrea@example.com",
      currentRole: "Chief Revenue Officer",
    });

    expect(result).toEqual({ ok: true, id: EXEC_A.id });
  });

  it("returns duplicate_email error with existing record id when email is taken", async () => {
    const duplicateError = { code: "23505" };
    const insertChain: Record<string, unknown> = {
      insert: vi.fn(() => insertChain),
      values: vi.fn(() => insertChain),
      returning: vi.fn(() => Promise.reject(duplicateError)),
    };
    const selectChain = makeThenableChain([{ id: EXEC_A.id }]);
    mockGetDb.mockReturnValue({
      insert: vi.fn(() => insertChain),
      select: vi.fn(() => selectChain),
    } as never);

    const result = await createExecutive({
      name: "Andrea Duplicate",
      email: "andrea@example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "duplicate_email",
      existingId: EXEC_A.id,
    });
  });

  it("re-throws unexpected errors", async () => {
    const unexpectedError = new Error("connection lost");
    const insertChain: Record<string, unknown> = {
      insert: vi.fn(() => insertChain),
      values: vi.fn(() => insertChain),
      returning: vi.fn(() => Promise.reject(unexpectedError)),
    };
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    await expect(
      createExecutive({ name: "X", email: "x@example.com" }),
    ).rejects.toThrow("connection lost");
  });

  it("stores tags on the executive record", async () => {
    const insertChain = makeInsertChain([{ id: EXEC_B.id }]);
    const mockInsert = vi.fn(() => insertChain);
    mockGetDb.mockReturnValue({ insert: mockInsert } as never);

    await createExecutive({
      name: "Ben Okafor",
      email: "ben@example.com",
      tags: ["fintech", "series-b"],
    });

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({ tags: ["fintech", "series-b"] }),
    );
  });
});

describe("updateExecutive", () => {
  it("returns ok when the executive exists and is updated", async () => {
    const updateChain = makeUpdateChain([{ id: EXEC_A.id }]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updateExecutive(EXEC_A.id, {
      currentRole: "President",
    });

    expect(result).toEqual({ ok: true });
  });

  it("returns not_found when no row matches the id", async () => {
    const updateChain = makeUpdateChain([]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updateExecutive(
      "00000000-0000-4000-8000-000000000099",
      { currentRole: "President" },
    );

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns duplicate_email with existingId when new email is already taken", async () => {
    const duplicateError = { code: "23505" };
    const updateChain: Record<string, unknown> = {
      update: vi.fn(() => updateChain),
      set: vi.fn(() => updateChain),
      where: vi.fn(() => updateChain),
      returning: vi.fn(() => Promise.reject(duplicateError)),
    };
    const selectChain = makeThenableChain([{ id: EXEC_B.id }]);
    mockGetDb.mockReturnValue({
      update: vi.fn(() => updateChain),
      select: vi.fn(() => selectChain),
    } as never);

    const result = await updateExecutive(EXEC_A.id, {
      email: "ben@example.com",
    });

    expect(result).toEqual({
      ok: false,
      error: "duplicate_email",
      existingId: EXEC_B.id,
    });
  });
});

describe("searchExecutives", () => {
  it("returns empty array for blank query without hitting the database", async () => {
    mockGetDb.mockReturnValue({} as never);

    const result = await searchExecutives("   ");

    expect(result).toEqual([]);
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("returns matching executives for a non-empty query", async () => {
    const chain = makeThenableChain([EXEC_A]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await searchExecutives("andrea");

    expect(result).toEqual([EXEC_A]);
  });

  it("applies a where clause for name, current_role, and tags", async () => {
    const chain = makeThenableChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    await searchExecutives("fintech");

    expect(chain.where).toHaveBeenCalled();
  });

  it("limits results to 50", async () => {
    const chain = makeThenableChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    await searchExecutives("ceo");

    expect(chain.limit).toHaveBeenCalledWith(50);
  });
});
