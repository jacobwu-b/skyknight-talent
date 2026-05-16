# ADR-0003: Comp access boundary mechanism

> Status: proposed
> Date: 2026-05-15
> Deciders: @jacobwu-b

## Context

PRD §6.4 declares compensation access control a *hard requirement*: Associates must be physically unable to see Base Salary, Target Bonus, or Equity Percentage on any Pipeline Entry, via any read path. PRD §8 lists "zero comp leakage" as a non-target — i.e. the MVP is failed if a single leak occurs.

Spec 0005 captures the behavior. This ADR settles *where* the enforcement lives, because the wrong layer choice is the single largest risk of a leak (a future endpoint forgets to apply the filter).

Two enforcement layers are plausible:

- **Database layer** (Postgres row/column policies, or views): the database refuses to return comp columns to a non-Partner principal.
- **Repository layer** (a single TypeScript module that wraps all Pipeline Entry reads and strips comp keys when the role is `associate`).

The stack (ADR-0002) is Next.js + Drizzle + Postgres on Neon/Supabase. The DB connection is shared across the app and uses a single application role — there is no per-user DB principal mapping.

## Decision

We will enforce comp access at the **repository layer**, implemented as a single module (`PipelineEntryRepository` or equivalent) that:

1. Is the *only* code path that returns Pipeline Entry data anywhere in the application — UI loaders, API routes, the digest builder, the CSV exporter, and the executive-history view all call into it.
2. Takes the requesting user's role as an explicit argument; never reads it from request-local state.
3. When the role is `associate`, omits the comp keys from returned objects entirely (does not return `null` — *omits the keys*, per spec 0005).

A lint or test guard enforces that direct queries against `pipeline_entries` outside the repository module fail CI. The eval task in `evals/tasks/` enumerates every read endpoint and asserts no comp value appears in an Associate response.

## Consequences

**Positive**
- The boundary is one file and one function — auditable in a single PR review.
- Works equally well with Neon and Supabase since it doesn't depend on per-row DB policies.
- The eval task can statically enumerate every read surface because they all funnel through one entry point.

**Negative**
- Defense in depth is weaker than DB-layer enforcement — a bug in the repository code leaks comp. Mitigation: the eval task is the regression net; CLAUDE.md §6 documents the convention.
- The lint/test guard against direct `pipeline_entries` queries adds CI surface area.

**Neutral**
- Future migration to per-user DB principals (e.g. when we add real SSO) can layer DB policies *on top of* the repository without rewriting callers.

## Alternatives considered

### A: Postgres column-level grants via per-user DB roles

Stronger guarantee, but requires per-user DB principals — incompatible with our shared-connection serverless setup on Vercel. Rejected.

### B: Postgres row-level security with a `current_role` session var

Workable on Supabase, but adds significant cognitive load (RLS debugging is painful) and ties the enforcement to one DB vendor. Rejected for MVP; can layer on later.

### C: Filter in route handlers

The naive approach: every route handler checks the role and strips comp keys. Rejected — N handlers means N places to forget, which is the failure mode we're trying to eliminate.

## References

- PRD §6.4, §8 (success metric 4)
- `docs/specs/0005-comp-access-control.md`
- `docs/decisions/0002-stack-and-infra.md`
