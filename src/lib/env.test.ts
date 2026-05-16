import { describe, it, expect } from "vitest";
import { envSchema } from "./env-schema";

const VALID_ENV = {
  APP_URL: "https://example.com",
  DATABASE_URL: "postgres://user:pass@localhost:5432/skyknight",
  SESSION_SECRET: "a".repeat(32),
  POSTMARK_SERVER_TOKEN: "token",
  POSTMARK_INBOUND_WEBHOOK_SECRET: "secret",
  CRON_SECRET: "cron",
};

describe("envSchema", () => {
  it("parses successfully when all required vars are present", () => {
    const result = envSchema.safeParse(VALID_ENV);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.APP_URL).toBe("https://example.com");
      expect(result.data.NODE_ENV).toBe("development");
    }
  });

  it("rejects when SESSION_SECRET is missing", () => {
    const { APP_URL, DATABASE_URL, POSTMARK_SERVER_TOKEN, POSTMARK_INBOUND_WEBHOOK_SECRET, CRON_SECRET } = VALID_ENV;
    const result = envSchema.safeParse({ APP_URL, DATABASE_URL, POSTMARK_SERVER_TOKEN, POSTMARK_INBOUND_WEBHOOK_SECRET, CRON_SECRET });
    expect(result.success).toBe(false);
  });

  it("rejects when SESSION_SECRET is shorter than 32 chars", () => {
    const result = envSchema.safeParse({ ...VALID_ENV, SESSION_SECRET: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects when APP_URL is not a valid URL", () => {
    const result = envSchema.safeParse({ ...VALID_ENV, APP_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });
});
