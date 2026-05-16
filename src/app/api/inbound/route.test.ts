import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    POSTMARK_INBOUND_WEBHOOK_SECRET: "test-secret",
    INBOUND_MAILBOX_ADDRESS: "search@skyknightcapital.com",
  },
}));
vi.mock("@/lib/inbound", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/inbound")>("@/lib/inbound");
  return {
    ...actual,
    ingestInbound: vi.fn(),
  };
});

import { POST } from "./route";
import { ingestInbound } from "@/lib/inbound";

const mockIngest = vi.mocked(ingestInbound);
const SECRET = "test-secret";

function makeRequest(
  body: unknown,
  opts: { secret?: string | null; rawBody?: string } = {},
) {
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.secret !== null) {
    headers.set("x-postmark-webhook-secret", opts.secret ?? SECRET);
  }
  return new Request("http://localhost/api/inbound", {
    method: "POST",
    headers,
    body: opts.rawBody ?? JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/inbound", () => {
  it("returns 401 when the webhook secret header is missing or wrong", async () => {
    const res1 = await POST(makeRequest({}, { secret: null }));
    expect(res1.status).toBe(401);

    const res2 = await POST(makeRequest({}, { secret: "wrong-secret-value" }));
    expect(res2.status).toBe(401);

    expect(mockIngest).not.toHaveBeenCalled();
  });

  it("returns 400 when the JSON body is malformed", async () => {
    const res = await POST(makeRequest(null, { rawBody: "not-json{" }));
    expect(res.status).toBe(400);
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it("returns 400 when the payload fails schema validation", async () => {
    const res = await POST(makeRequest({ From: "a@b.com" })); // missing MessageID
    expect(res.status).toBe(400);
    expect(mockIngest).not.toHaveBeenCalled();
  });

  it("dispatches a valid payload and returns 200 with the outcome", async () => {
    mockIngest.mockResolvedValue({
      kind: "matched_no_entries",
      executiveId: "exec-1",
      interactionId: "int-1",
    });

    const res = await POST(
      makeRequest({
        MessageID: "msg-x",
        From: "partner@example.com",
        Subject: "Hello",
        TextBody: "Body",
        ToFull: [{ Email: "candidate@example.com" }],
      }),
    );
    expect(res.status).toBe(200);
    expect(mockIngest).toHaveBeenCalledTimes(1);
    const body = await res.json();
    expect(body).toEqual({
      outcome: {
        kind: "matched_no_entries",
        executiveId: "exec-1",
        interactionId: "int-1",
      },
    });
  });
});
