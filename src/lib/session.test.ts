import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken, COOKIE_NAME } from "./session";

const SECRET = "a".repeat(32);
const PROFILE_ID = "00000000-0000-4000-8000-000000000001";

describe("createSessionToken", () => {
  it("returns a dot-separated base64url string", async () => {
    const token = await createSessionToken(PROFILE_ID, SECRET);
    const parts = token.split(".");
    expect(parts.length).toBe(2);
    expect(parts[0]).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(parts[1]).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces distinct tokens for different profileIds", async () => {
    const t1 = await createSessionToken("id-one", SECRET);
    const t2 = await createSessionToken("id-two", SECRET);
    expect(t1).not.toBe(t2);
  });

  it("produces distinct tokens for different secrets", async () => {
    const t1 = await createSessionToken(PROFILE_ID, "a".repeat(32));
    const t2 = await createSessionToken(PROFILE_ID, "b".repeat(32));
    expect(t1).not.toBe(t2);
  });
});

describe("verifySessionToken", () => {
  it("returns the profileId for a valid token", async () => {
    const token = await createSessionToken(PROFILE_ID, SECRET);
    const result = await verifySessionToken(token, SECRET);
    expect(result).toBe(PROFILE_ID);
  });

  it("returns null when the signature is tampered with", async () => {
    const token = await createSessionToken(PROFILE_ID, SECRET);
    const tampered = token.slice(0, -4) + "XXXX";
    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("returns null when the payload is tampered with", async () => {
    const token = await createSessionToken(PROFILE_ID, SECRET);
    const [, sig] = token.split(".");
    // Replace payload with a different profileId, keeping original sig
    const fakePayload = btoa(JSON.stringify({ v: 1, pid: "evil-id" }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const tampered = `${fakePayload}.${sig}`;
    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("returns null for a token signed with the wrong secret", async () => {
    const token = await createSessionToken(PROFILE_ID, "a".repeat(32));
    expect(await verifySessionToken(token, "b".repeat(32))).toBeNull();
  });

  it("returns null for a malformed token with no separator", async () => {
    expect(await verifySessionToken("notavalidtoken", SECRET)).toBeNull();
  });

  it("returns null for an empty string", async () => {
    expect(await verifySessionToken("", SECRET)).toBeNull();
  });

  it("returns null when the payload decodes to wrong version", async () => {
    const badPayload = btoa(JSON.stringify({ v: 2, pid: PROFILE_ID }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    // Sign it with the correct secret so signature is valid
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(badPayload),
    );
    const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
    const token = `${badPayload}.${sigStr}`;
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });
});

describe("COOKIE_NAME", () => {
  it("is a non-empty string", () => {
    expect(typeof COOKIE_NAME).toBe("string");
    expect(COOKIE_NAME.length).toBeGreaterThan(0);
  });
});
