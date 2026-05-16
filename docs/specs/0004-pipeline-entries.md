# Pipeline Entries

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

A Pipeline Entry is the atomic record of "this executive is being considered for this Search at this stage." Today this is reconstructed every Sunday from emails and pivot tables. The MVP makes it the explicit, queryable join between Executive and Search — without it, the Monday digest (spec 0008) and duplicate-outreach alerts (spec 0007) have nothing to operate on.

## Goals

- Adding an Executive to a Search produces exactly one Pipeline Entry at stage Identified.
- Any user can advance a Pipeline Entry through a fixed stage set.
- Every Pipeline Entry has exactly one owner — a Partner or Associate.
- The same Executive can have many open Pipeline Entries across different Searches.

## Non-goals

- Custom or configurable pipeline stages.
- Bulk moves across multiple entries.
- Comp expectations — those live on the Pipeline Entry but are gated by spec 0005 and authored there.

## Users / actors

- Authenticated Partner or Associate.

## Acceptance criteria

- [ ] Fields stored per Pipeline Entry: `executive_id`, `search_id`, `stage`, `owner_id` (FK to users), timestamps. Comp columns are added by spec 0005, not here.
- [ ] Stage set is exactly: `identified`, `contacted`, `screening`, `partner_interview`, `client_interview`, `offer`, `placed`, `passed`. Stored as an enum or constrained string.
- [ ] From a Search detail page, a user can add an existing Executive → creates a Pipeline Entry at stage `identified`. The same (executive, search) pair cannot be added twice while one entry is still open (i.e. not `placed` or `passed`).
- [ ] A user can advance a Pipeline Entry to any other stage from a dropdown — no fixed-order enforcement in MVP (Partners sometimes skip stages).
- [ ] A user can reassign the `owner_id` to any Partner or Associate.
- [ ] A Pipeline Entry's "last contact" is derived from the most recent Interaction (per spec 0006); no separate field stored.

## Approach

- Standard CRUD against a `pipeline_entries` table.
- Search detail view (spec 0003) groups entries by stage; this spec owns the row-level operations.

## Out of scope

- Comp fields (spec 0005).
- Interaction creation (spec 0006).
- Owner-change notifications.

## Open questions

- *(none — open question on Passed visibility resolved: Passed entries remain visible behind a default filter; never hard-deleted.)*

## Risks

- Stage skips create reporting gaps (a candidate jumps Identified → Offer). Accepted in MVP; surfaced in digest as-is.

## References

- PRD §5, §6.3 (Pipeline Entry Management)
