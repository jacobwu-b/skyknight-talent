import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["partner", "associate"]);

export const searchStatus = pgEnum("search_status", [
  "open",
  "paused",
  "filled",
]);

export const pipelineStage = pgEnum("pipeline_stage", [
  "identified",
  "contacted",
  "screening",
  "partner_interview",
  "client_interview",
  "offer",
  "placed",
  "passed",
]);

export const interactionDirection = pgEnum("interaction_direction", [
  "inbound",
  "outbound",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: userRole("role").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const executives = pgTable(
  "executives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    linkedinUrl: text("linkedin_url"),
    currentRole: text("current_role"),
    notes: text("notes"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("executives_email_unique").on(t.email),
    index("executives_updated_at_idx").on(t.updatedAt.desc()),
    index("executives_name_trgm_idx").using(
      "gin",
      sql`${t.name} gin_trgm_ops`,
    ),
    index("executives_current_role_trgm_idx").using(
      "gin",
      sql`${t.currentRole} gin_trgm_ops`,
    ),
    index("executives_tags_gin_idx").using("gin", t.tags),
  ],
);

export const searches = pgTable(
  "searches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    portfolioCompany: text("portfolio_company").notNull(),
    roleTitle: text("role_title").notNull(),
    hiringManager: text("hiring_manager").notNull(),
    status: searchStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("searches_company_status_idx").on(t.portfolioCompany, t.status),
    index("searches_created_at_idx").on(t.createdAt.desc()),
  ],
);

export const pipelineEntries = pgTable(
  "pipeline_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executiveId: uuid("executive_id")
      .notNull()
      .references(() => executives.id, { onDelete: "cascade" }),
    searchId: uuid("search_id")
      .notNull()
      .references(() => searches.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    stage: pipelineStage("stage").notNull().default("identified"),
    // Comp fields — confidential per spec 0005 / ADR-0003.
    // Redaction is enforced in the repository layer, not the schema.
    baseSalaryCents: integer("base_salary_cents"),
    targetBonusCents: integer("target_bonus_cents"),
    equityBps: integer("equity_bps"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // No duplicate open entry for the same exec+search (spec 0004).
    uniqueIndex("pipeline_entries_open_unique")
      .on(t.executiveId, t.searchId)
      .where(sql`stage NOT IN ('placed', 'passed')`),
    index("pipeline_entries_search_stage_idx").on(t.searchId, t.stage),
    index("pipeline_entries_executive_idx").on(t.executiveId),
    index("pipeline_entries_owner_idx").on(t.ownerId),
    index("pipeline_entries_updated_at_idx").on(t.updatedAt.desc()),
  ],
);

export const executiveInteractions = pgTable(
  "executive_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    executiveId: uuid("executive_id")
      .notNull()
      .references(() => executives.id, { onDelete: "cascade" }),
    pipelineEntryId: uuid("pipeline_entry_id").references(
      () => pipelineEntries.id,
      { onDelete: "cascade" },
    ),
    senderId: uuid("sender_id").references(() => users.id),
    senderRole: userRole("sender_role").notNull(),
    direction: interactionDirection("direction").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    subject: text("subject"),
    bodyExcerpt: text("body_excerpt"),
    postmarkMessageId: text("postmark_message_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("executive_interactions_postmark_message_id_unique").on(
      t.postmarkMessageId,
    ),
    index("executive_interactions_executive_occurred_at_idx").on(
      t.executiveId,
      t.occurredAt.desc(),
    ),
    index("executive_interactions_pipeline_entry_occurred_at_idx").on(
      t.pipelineEntryId,
      t.occurredAt.desc(),
    ),
    index("executive_interactions_duplicate_window_idx").on(
      t.executiveId,
      t.senderRole,
      t.occurredAt,
    ),
  ],
);

export const unmatchedInbound = pgTable(
  "unmatched_inbound",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postmarkMessageId: text("postmark_message_id").notNull(),
    fromAddress: text("from_address").notNull(),
    toAddresses: text("to_addresses").array().notNull(),
    subject: text("subject"),
    bodyExcerpt: text("body_excerpt"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    rawPayload: jsonb("raw_payload").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("unmatched_inbound_postmark_message_id_unique").on(
      t.postmarkMessageId,
    ),
    index("unmatched_inbound_created_at_idx").on(t.createdAt.desc()),
  ],
);
