import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  executives,
  executiveInteractions,
  interactionDirection,
  pipelineEntries,
  pipelineStage,
  searches,
  searchStatus,
  userRole,
  users,
} from "./schema";

describe("schema enums", () => {
  it("user_role has partner and associate", () => {
    expect(userRole.enumValues).toEqual(["partner", "associate"]);
  });

  it("search_status has open/paused/filled", () => {
    expect(searchStatus.enumValues).toEqual(["open", "paused", "filled"]);
  });

  it("pipeline_stage has all 8 stages in canonical order", () => {
    expect(pipelineStage.enumValues).toEqual([
      "identified",
      "contacted",
      "screening",
      "partner_interview",
      "client_interview",
      "offer",
      "placed",
      "passed",
    ]);
  });

  it("interaction_direction has inbound and outbound", () => {
    expect(interactionDirection.enumValues).toEqual(["inbound", "outbound"]);
  });
});

describe("users table", () => {
  const t = getTableConfig(users);
  it("uses the expected name", () => expect(t.name).toBe("users"));
  it("has role column typed as user_role", () => {
    const role = t.columns.find((c) => c.name === "role");
    expect(role).toBeDefined();
    expect(role?.notNull).toBe(true);
  });
});

describe("executives table", () => {
  const t = getTableConfig(executives);
  it("name=executives", () => expect(t.name).toBe("executives"));
  it("has unique index on email", () => {
    const idx = t.indexes.find((i) => i.config.name === "executives_email_unique");
    expect(idx?.config.unique).toBe(true);
  });
  it("has trigram indices on name and current_role", () => {
    const names = t.indexes.map((i) => i.config.name);
    expect(names).toContain("executives_name_trgm_idx");
    expect(names).toContain("executives_current_role_trgm_idx");
  });
});

describe("pipeline_entries table", () => {
  const t = getTableConfig(pipelineEntries);
  it("name=pipeline_entries", () => expect(t.name).toBe("pipeline_entries"));
  it("has nullable comp columns", () => {
    for (const col of ["base_salary_cents", "target_bonus_cents", "equity_bps"]) {
      const c = t.columns.find((x) => x.name === col);
      expect(c, `expected column ${col}`).toBeDefined();
      expect(c?.notNull, `${col} must be nullable`).toBe(false);
    }
  });
  it("FKs reference executives, searches, users", () => {
    const refTables = new Set(
      t.foreignKeys.flatMap((fk) =>
        fk.reference().foreignTable
          ? [getTableConfig(fk.reference().foreignTable).name]
          : [],
      ),
    );
    expect(refTables.has("executives")).toBe(true);
    expect(refTables.has("searches")).toBe(true);
    expect(refTables.has("users")).toBe(true);
  });
  it("has partial unique index for open entries (spec 0004)", () => {
    const idx = t.indexes.find((i) => i.config.name === "pipeline_entries_open_unique");
    expect(idx?.config.unique).toBe(true);
    expect(idx?.config.where).toBeDefined();
  });
});

describe("executive_interactions table", () => {
  const t = getTableConfig(executiveInteractions);
  it("name=executive_interactions", () => expect(t.name).toBe("executive_interactions"));
  it("has unique index on postmark_message_id (spec 0006 idempotency)", () => {
    const idx = t.indexes.find(
      (i) => i.config.name === "executive_interactions_postmark_message_id_unique",
    );
    expect(idx?.config.unique).toBe(true);
  });
  it("indexes (executive_id, occurred_at) for history view", () => {
    expect(
      t.indexes.find(
        (i) => i.config.name === "executive_interactions_executive_occurred_at_idx",
      ),
    ).toBeDefined();
  });
  it("indexes the 14-day duplicate-window query columns", () => {
    expect(
      t.indexes.find(
        (i) => i.config.name === "executive_interactions_duplicate_window_idx",
      ),
    ).toBeDefined();
  });
});

describe("searches table", () => {
  const t = getTableConfig(searches);
  it("name=searches", () => expect(t.name).toBe("searches"));
  it("status defaults to open", () => {
    const status = t.columns.find((c) => c.name === "status");
    expect(status?.default).toBe("open");
  });
});
