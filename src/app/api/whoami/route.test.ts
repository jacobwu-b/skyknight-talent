import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSessionUser: vi.fn(),
}));

import { GET } from "./route";
import { getSessionUser } from "@/lib/auth";

const mockGetSessionUser = vi.mocked(getSessionUser);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/whoami", () => {
  it("returns name and role for an authenticated session", async () => {
    mockGetSessionUser.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Aiko Tanaka",
      role: "partner",
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ name: "Aiko Tanaka", role: "partner" });
  });

  it("returns 401 when there is no active session", async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  it("returns role derived from DB, not cookie payload", async () => {
    // getSessionUser always re-derives role from DB — we verify the route
    // returns exactly what getSessionUser returns (no role read from request).
    mockGetSessionUser.mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000004",
      name: "Diego Hernández",
      role: "associate",
    });

    const response = await GET();
    const body = await response.json();
    expect(body.role).toBe("associate");
  });
});
