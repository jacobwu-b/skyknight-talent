import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { listExecutives, getExecutive } from "./executives";
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

const EXEC_A = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Andrea Costa",
  email: "andrea@example.com",
  phone: null,
  linkedinUrl: null,
  currentRole: "Chief Revenue Officer",
  notes: null,
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
