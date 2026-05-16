import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    POSTMARK_INBOUND_WEBHOOK_SECRET: "test-secret",
    INBOUND_MAILBOX_ADDRESS: "search@skyknightcapital.com",
  },
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));
vi.mock("@/lib/pipeline", () => ({
  listOpenPipelineEntryIdsForExecutive: vi.fn(),
}));

import {
  ingestInbound,
  postmarkInboundSchema,
  verifyWebhookSecret,
  truncateBody,
  recipientAddresses,
  BODY_EXCERPT_LIMIT,
} from "./inbound";
import { getDb } from "./db";
import { listOpenPipelineEntryIdsForExecutive } from "./pipeline";

const mockGetDb = vi.mocked(getDb);
const mockListOpenEntries = vi.mocked(listOpenPipelineEntryIdsForExecutive);

const EXEC_A = "00000000-0000-4000-8000-0000000000a1";
const EXEC_B = "00000000-0000-4000-8000-0000000000a2";
const ENTRY_1 = "00000000-0000-4000-8000-0000000000b1";
const ENTRY_2 = "00000000-0000-4000-8000-0000000000b2";
const INTERACTION_1 = "00000000-0000-4000-8000-0000000000c1";
const INTERACTION_2 = "00000000-0000-4000-8000-0000000000c2";
const UNMATCHED_1 = "00000000-0000-4000-8000-0000000000d1";

// Build a chainable select() mock that returns the given rows.
function selectChain(rows: unknown) {
  const p = Promise.resolve(rows);
  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => p),
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  };
  return chain;
}

function insertChain(rows: unknown, rejectError?: unknown) {
  const p = rejectError ? Promise.reject(rejectError) : Promise.resolve(rows);
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

// Wrap multiple sequential chains: select-then-insert.
function dbFor(stages: Array<Record<string, unknown>>) {
  let i = 0;
  return {
    select: vi.fn(() => stages[i++]),
    insert: vi.fn(() => stages[i++]),
  };
}

function basePayload(overrides: Partial<Record<string, unknown>> = {}) {
  return postmarkInboundSchema.parse({
    MessageID: "msg-001",
    From: "partner@skyknight.example",
    Subject: "Catching up",
    TextBody: "Hi there, quick note about the role.",
    Date: "2026-05-15T12:00:00Z",
    ToFull: [{ Email: "candidate@example.com" }],
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("postmarkInboundSchema", () => {
  it("rejects payloads missing MessageID", () => {
    const result = postmarkInboundSchema.safeParse({
      From: "x@y.com",
      ToFull: [],
    });
    expect(result.success).toBe(false);
  });

  it("defaults missing optional fields", () => {
    const result = postmarkInboundSchema.parse({
      MessageID: "id-1",
      From: "x@y.com",
    });
    expect(result.Subject).toBe("");
    expect(result.TextBody).toBe("");
    expect(result.ToFull).toEqual([]);
  });
});

describe("verifyWebhookSecret", () => {
  it("rejects empty / missing secrets", () => {
    expect(verifyWebhookSecret(null)).toBe(false);
    expect(verifyWebhookSecret("")).toBe(false);
  });

  it("accepts the configured secret", () => {
    expect(verifyWebhookSecret("test-secret")).toBe(true);
  });

  it("rejects a wrong secret of equal length", () => {
    expect(verifyWebhookSecret("xxxxxxxxxxx")).toBe(false);
  });
});

describe("truncateBody / recipientAddresses helpers", () => {
  it("truncates bodies longer than the limit and keeps short ones intact", () => {
    const long = "a".repeat(BODY_EXCERPT_LIMIT + 200);
    expect(truncateBody(long).length).toBe(BODY_EXCERPT_LIMIT);
    expect(truncateBody("short")).toBe("short");
  });

  it("excludes the tracking mailbox from recipient list and dedupes", () => {
    const payload = postmarkInboundSchema.parse({
      MessageID: "m",
      From: "a@b.com",
      ToFull: [
        { Email: "Candidate@example.com" },
        { Email: "search@skyknightcapital.com" },
      ],
      BccFull: [{ Email: "candidate@example.com" }],
    });
    expect(recipientAddresses(payload)).toEqual(["candidate@example.com"]);
  });
});

describe("ingestInbound — single match with open pipeline entries", () => {
  it("creates one Interaction per open Pipeline Entry", async () => {
    const execMatchSelect = selectChain([
      {
        id: EXEC_A,
        email: "candidate@example.com",
        updatedAt: new Date("2026-05-10"),
      },
    ]);
    const interactionInsert = insertChain([
      { id: INTERACTION_1 },
      { id: INTERACTION_2 },
    ]);
    mockGetDb.mockReturnValue(
      dbFor([execMatchSelect, interactionInsert]) as never,
    );
    mockListOpenEntries.mockResolvedValue([ENTRY_1, ENTRY_2]);

    const payload = basePayload();
    const outcome = await ingestInbound(payload, payload);

    expect(outcome).toEqual({
      kind: "matched_with_entries",
      executiveId: EXEC_A,
      interactionIds: [INTERACTION_1, INTERACTION_2],
    });
    expect(interactionInsert.values).toHaveBeenCalledWith([
      expect.objectContaining({
        executiveId: EXEC_A,
        pipelineEntryId: ENTRY_1,
        direction: "outbound",
        postmarkMessageId: "msg-001",
        notes: null,
      }),
      expect.objectContaining({
        executiveId: EXEC_A,
        pipelineEntryId: ENTRY_2,
      }),
    ]);
  });
});

describe("ingestInbound — single match, no open entries", () => {
  it("attaches one Interaction directly to the Executive", async () => {
    const execMatchSelect = selectChain([
      {
        id: EXEC_A,
        email: "candidate@example.com",
        updatedAt: new Date("2026-05-10"),
      },
    ]);
    const interactionInsert = insertChain([{ id: INTERACTION_1 }]);
    mockGetDb.mockReturnValue(
      dbFor([execMatchSelect, interactionInsert]) as never,
    );
    mockListOpenEntries.mockResolvedValue([]);

    const payload = basePayload({ MessageID: "msg-no-entries" });
    const outcome = await ingestInbound(payload, payload);

    expect(outcome).toEqual({
      kind: "matched_no_entries",
      executiveId: EXEC_A,
      interactionId: INTERACTION_1,
    });
    expect(interactionInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        executiveId: EXEC_A,
        pipelineEntryId: null,
        notes: null,
      }),
    );
  });
});

describe("ingestInbound — multiple matches (ambiguous)", () => {
  it("picks the most-recently-updated and flags ambiguity in notes", async () => {
    // Returned in desc(updatedAt) order — chosen is the first.
    const execMatchSelect = selectChain([
      {
        id: EXEC_B,
        email: "shared@example.com",
        updatedAt: new Date("2026-05-12"),
      },
      {
        id: EXEC_A,
        email: "shared@example.com",
        updatedAt: new Date("2026-05-01"),
      },
    ]);
    const interactionInsert = insertChain([{ id: INTERACTION_1 }]);
    mockGetDb.mockReturnValue(
      dbFor([execMatchSelect, interactionInsert]) as never,
    );
    mockListOpenEntries.mockResolvedValue([]);

    const payload = basePayload({
      MessageID: "msg-amb",
      ToFull: [{ Email: "shared@example.com" }],
    });
    const outcome = await ingestInbound(payload, payload);

    expect(outcome).toEqual({
      kind: "matched_ambiguous",
      executiveId: EXEC_B,
      interactionIds: [INTERACTION_1],
      candidateIds: [EXEC_B, EXEC_A],
    });
    expect(interactionInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        executiveId: EXEC_B,
        notes: expect.stringMatching(/Ambiguous/i),
      }),
    );
  });
});

describe("ingestInbound — no match", () => {
  it("writes an unmatched_inbound row with the raw payload preserved", async () => {
    const execMatchSelect = selectChain([]);
    const unmatchedInsert = insertChain([{ id: UNMATCHED_1 }]);
    mockGetDb.mockReturnValue(
      dbFor([execMatchSelect, unmatchedInsert]) as never,
    );

    const raw = { MessageID: "msg-um", From: "a@b.com", ToFull: [] };
    const payload = basePayload({
      MessageID: "msg-um",
      ToFull: [{ Email: "stranger@example.com" }],
    });
    const outcome = await ingestInbound(payload, raw);

    expect(outcome).toEqual({ kind: "unmatched", unmatchedId: UNMATCHED_1 });
    expect(unmatchedInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        postmarkMessageId: "msg-um",
        rawPayload: raw,
        toAddresses: ["stranger@example.com"],
      }),
    );
  });
});

describe("ingestInbound — idempotency", () => {
  it("treats a duplicate MessageID (Postgres 23505) as a no-op success", async () => {
    const execMatchSelect = selectChain([
      {
        id: EXEC_A,
        email: "candidate@example.com",
        updatedAt: new Date("2026-05-10"),
      },
    ]);
    const dup = Object.assign(new Error("dup"), { code: "23505" });
    const interactionInsert = insertChain(null, dup);
    mockGetDb.mockReturnValue(
      dbFor([execMatchSelect, interactionInsert]) as never,
    );
    mockListOpenEntries.mockResolvedValue([ENTRY_1]);

    const payload = basePayload({ MessageID: "msg-dup" });
    const outcome = await ingestInbound(payload, payload);

    expect(outcome).toEqual({ kind: "duplicate", messageId: "msg-dup" });
  });

  it("dedupes unmatched inbound on duplicate MessageID", async () => {
    const execMatchSelect = selectChain([]);
    const dup = Object.assign(new Error("dup"), { code: "23505" });
    const unmatchedInsert = insertChain(null, dup);
    mockGetDb.mockReturnValue(
      dbFor([execMatchSelect, unmatchedInsert]) as never,
    );

    const payload = basePayload({
      MessageID: "msg-um-dup",
      ToFull: [{ Email: "stranger@example.com" }],
    });
    const outcome = await ingestInbound(payload, payload);

    expect(outcome).toEqual({ kind: "duplicate", messageId: "msg-um-dup" });
  });
});
