import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import {
  listSearches,
  getSearch,
  createSearch,
  updateSearch,
  isValidTransition,
} from "./searches";
import { getDb } from "./db";

const mockGetDb = vi.mocked(getDb);

function makeThenableChain(resolveValue: unknown) {
  const p = Promise.resolve(resolveValue);
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => p),
    limit: vi.fn(() => p),
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

const SEARCH_A = {
  id: "00000000-0000-4000-8000-000000000011",
  portfolioCompany: "Acme Corp",
  roleTitle: "Chief Revenue Officer",
  hiringManager: "Jane Smith",
  status: "open" as const,
  createdAt: new Date("2024-03-01T10:00:00Z"),
  updatedAt: new Date("2024-03-01T10:00:00Z"),
};

const SEARCH_B = {
  id: "00000000-0000-4000-8000-000000000012",
  portfolioCompany: "Beta Inc",
  roleTitle: "VP of Engineering",
  hiringManager: "Bob Jones",
  status: "paused" as const,
  createdAt: new Date("2024-02-15T10:00:00Z"),
  updatedAt: new Date("2024-02-20T10:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isValidTransition", () => {
  it("allows open → paused", () => {
    expect(isValidTransition("open", "paused")).toBe(true);
  });

  it("allows open → filled", () => {
    expect(isValidTransition("open", "filled")).toBe(true);
  });

  it("allows paused → open", () => {
    expect(isValidTransition("paused", "open")).toBe(true);
  });

  it("allows paused → filled", () => {
    expect(isValidTransition("paused", "filled")).toBe(true);
  });

  it("rejects filled → open", () => {
    expect(isValidTransition("filled", "open")).toBe(false);
  });

  it("rejects filled → paused", () => {
    expect(isValidTransition("filled", "paused")).toBe(false);
  });

  it("rejects a status transitioning to itself", () => {
    expect(isValidTransition("open", "open")).toBe(false);
  });
});

describe("listSearches", () => {
  it("returns searches ordered by portfolio company then createdAt desc", async () => {
    const chain = makeThenableChain([SEARCH_A, SEARCH_B]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearches();

    expect(result).toHaveLength(2);
    expect(result[0].portfolioCompany).toBe("Acme Corp");
    expect(chain.orderBy).toHaveBeenCalled();
  });

  it("returns empty array when no searches exist", async () => {
    const chain = makeThenableChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await listSearches();

    expect(result).toEqual([]);
  });
});

describe("getSearch", () => {
  it("returns the search when found by id", async () => {
    const chain = makeThenableChain([SEARCH_A]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await getSearch(SEARCH_A.id);

    expect(result).toEqual(SEARCH_A);
  });

  it("returns null when no search matches the id", async () => {
    const chain = makeThenableChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => chain) } as never);

    const result = await getSearch("00000000-0000-4000-8000-000000000099");

    expect(result).toBeNull();
  });
});

describe("createSearch", () => {
  it("inserts and returns ok with id on success", async () => {
    const insertChain = makeInsertChain([{ id: SEARCH_A.id }]);
    mockGetDb.mockReturnValue({ insert: vi.fn(() => insertChain) } as never);

    const result = await createSearch({
      portfolioCompany: "Acme Corp",
      roleTitle: "Chief Revenue Officer",
      hiringManager: "Jane Smith",
    });

    expect(result).toEqual({ ok: true, id: SEARCH_A.id });
  });

  it("passes all fields to the insert", async () => {
    const insertChain = makeInsertChain([{ id: SEARCH_A.id }]);
    const mockInsert = vi.fn(() => insertChain);
    mockGetDb.mockReturnValue({ insert: mockInsert } as never);

    await createSearch({
      portfolioCompany: "Acme Corp",
      roleTitle: "Chief Revenue Officer",
      hiringManager: "Jane Smith",
    });

    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioCompany: "Acme Corp",
        roleTitle: "Chief Revenue Officer",
        hiringManager: "Jane Smith",
      }),
    );
  });
});

describe("updateSearch", () => {
  it("returns ok when role title and hiring manager are updated on an open search", async () => {
    const selectChain = makeThenableChain([{ status: "open" }]);
    const updateChain = makeUpdateChain([{ id: SEARCH_A.id }]);
    mockGetDb.mockReturnValue({
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    } as never);

    const result = await updateSearch(SEARCH_A.id, {
      roleTitle: "President",
      hiringManager: "New Manager",
    });

    expect(result).toEqual({ ok: true });
  });

  it("returns not_found when no row matches the id", async () => {
    const updateChain = makeUpdateChain([]);
    mockGetDb.mockReturnValue({ update: vi.fn(() => updateChain) } as never);

    const result = await updateSearch("00000000-0000-4000-8000-000000000099", {
      roleTitle: "President",
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns not_found when search does not exist during status update", async () => {
    const selectChain = makeThenableChain([]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => selectChain) } as never);

    const result = await updateSearch("00000000-0000-4000-8000-000000000099", {
      status: "paused",
    });

    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("allows valid transition open → paused", async () => {
    const selectChain = makeThenableChain([{ status: "open" }]);
    const updateChain = makeUpdateChain([{ id: SEARCH_A.id }]);
    mockGetDb.mockReturnValue({
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    } as never);

    const result = await updateSearch(SEARCH_A.id, { status: "paused" });

    expect(result).toEqual({ ok: true });
  });

  it("allows valid transition paused → open", async () => {
    const selectChain = makeThenableChain([{ status: "paused" }]);
    const updateChain = makeUpdateChain([{ id: SEARCH_B.id }]);
    mockGetDb.mockReturnValue({
      select: vi.fn(() => selectChain),
      update: vi.fn(() => updateChain),
    } as never);

    const result = await updateSearch(SEARCH_B.id, { status: "open" });

    expect(result).toEqual({ ok: true });
  });

  it("rejects invalid transition filled → open", async () => {
    const selectChain = makeThenableChain([{ status: "filled" }]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => selectChain) } as never);

    const result = await updateSearch(SEARCH_A.id, { status: "open" });

    expect(result).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("rejects invalid transition filled → paused", async () => {
    const selectChain = makeThenableChain([{ status: "filled" }]);
    mockGetDb.mockReturnValue({ select: vi.fn(() => selectChain) } as never);

    const result = await updateSearch(SEARCH_A.id, { status: "paused" });

    expect(result).toEqual({ ok: false, error: "invalid_transition" });
  });
});
