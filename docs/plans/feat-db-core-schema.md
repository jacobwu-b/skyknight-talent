# Plan: feat/db-core-schema

> Tier: Significant
> Spec: cross-cuts docs/specs/0001–0010 (no single spec)
> Issue: J-58
> Author: @jacobwu
> Status: approved

## Branch

`feat/db-core-schema`

## What

Introduce Drizzle schema + migration tooling for the five MVP core objects (User, Executive, Search, PipelineEntry, Interaction), plus a dev seed script.

## Files

- `package.json` — add `drizzle-orm`, `postgres`, dev `drizzle-kit`.
- `drizzle.config.ts` — drizzle-kit config; reads `DATABASE_URL` from env.
- `src/lib/db/schema.ts` — Drizzle tables, enums, indices, FKs.
- `src/lib/db/index.ts` — postgres-js client + drizzle instance.
- `db/migrations/0000_init.sql` — generated up migration.
- `db/migrations/0000_init.down.sql` — hand-written down migration.
- `db/migrations/meta/` — drizzle journal/snapshots.
- `scripts/migrate.ts` — apply pending up migrations.
- `scripts/rollback.ts` — apply latest down migration.
- `scripts/seed.ts` — populate dev data (6 profiles + executives/searches/pipeline/interactions).
- `src/lib/db/schema.test.ts` — schema-shape assertions (compile-time + runtime spot checks).
- `.env.example` — no new vars (DATABASE_URL already present).
- `README.md` — short "Database" section pointing at scripts.

## Approach

- Define one `schema.ts` module exporting all tables + pg enums. Keep it flat — no relations API splits across files for MVP.
- Use `pgEnum` for `user_role`, `search_status`, `pipeline_stage`, `interaction_direction`.
- Comp columns on `pipeline_entries` are plain nullable integers (`base_salary_cents`, `target_bonus_cents`, `equity_bps`). Redaction lives in a future repository layer (ADR-0003), not the schema.
- Partial unique constraint: `(executive_id, search_id) WHERE stage NOT IN ('placed','passed')` — enforces "no duplicate open entry" per spec 0004.
- Indices follow spec access patterns: executives global search (trigram on name + current_role), interactions reverse-chrono per executive, pipeline by (search, stage), duplicate-outreach 14-day window on (executive, sender_role, occurred_at).
- Postmark message-id UNIQUE for interaction idempotency (spec 0006).
- Generate migration with `drizzle-kit generate`; commit SQL + journal. Hand-write `.down.sql` siblings (drizzle has no native down).
- Seed script uses postgres-js directly with deterministic UUIDs so reruns are stable.

## Tests

- `src/lib/db/schema.test.ts` — asserts: enum value sets, presence of expected columns/types, FK targets, that the schema module loads without throwing.
- Rollback test is manual (no Postgres in default CI). Verified locally via `pnpm db:migrate && pnpm db:rollback && pnpm db:migrate`. Documented in PR.

## Manual steps

- `pnpm install` to pick up new deps.
- Local Postgres + `DATABASE_URL` to run `pnpm db:migrate` and `pnpm db:seed`.
- Supabase project provisioning is out of scope (future infra unit).

---

## Significant-tier additions

### Blast radius

- New runtime dependencies: `drizzle-orm`, `postgres`.
- New dev dependency: `drizzle-kit`.
- New top-level `db/` directory for migrations.
- New `pnpm` scripts: `db:generate`, `db:migrate`, `db:rollback`, `db:seed`.
- No consumers yet — schema is loaded but not queried by any route in this PR.

### Risks / open questions

- Migration rollback is uncovered by automated CI (no Postgres service). Mitigation: manual local test + checked-in down SQL; revisit when CI gets a Postgres lane.
- Comp redaction is not enforced by the schema. Mitigation: ADR-0003 + repository layer + lint guard in U3.1; flagged in PR.
- Trigram search requires the `pg_trgm` extension. Migration enables it via `CREATE EXTENSION IF NOT EXISTS pg_trgm` — Supabase supports it.

### ADR

Not needed. ADR-0002 (stack) and ADR-0003 (comp boundary) cover the architectural decisions; schema shape is implementation-level follow-through.
