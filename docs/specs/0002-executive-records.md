# Executive records

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

Today, the SkyKnight Deal Team manages ~3,000 executive contacts in shared Excel files. There is no canonical record per person — the same executive may appear in three workbooks with conflicting role, email, and tag data. The new app needs a single Executive record that persists across Searches and serves as the join target for Pipeline Entries and Interactions.

## Goals

- One row per executive in the system; new entries can be added by any authenticated user.
- Every user can find an executive in under five seconds via global search.
- Editing a record updates it in place; history is captured implicitly by Interactions (per spec 0010), not by versioning the record itself.

## Non-goals

- LinkedIn enrichment or third-party data import.
- Merge / deduplication tooling beyond basic search before create.
- Bulk import from Excel — handled separately at rollout time via a one-off script, not part of this spec.

## Users / actors

- Authenticated Partner or Associate.

## Acceptance criteria

- [ ] Fields stored per executive: `name`, `email`, `phone`, `linkedin_url`, `current_role`, `notes`, `tags[]`. `email` is unique and required; all others optional.
- [ ] A list view shows all executives, paginated, sorted by most recently updated.
- [ ] A detail view shows every field plus tabs/sections for "Searches" (per 0004) and "Interaction history" (per 0010).
- [ ] A create form persists a new executive; submitting an already-used email returns a clear error pointing the user at the existing record.
- [ ] An edit form updates fields in place.
- [ ] Global search matches `name`, `current_role`, or any entry in `tags[]` with case-insensitive partial match and returns results within 1 second at MVP scale (10k records).

## Approach

- Standard CRUD against the `executives` table. Tags are stored as a text array or normalized join table — schema spec resolves.
- Global search is a single query — full-text or trigram index per the stack ADR.

## Out of scope

- Comp expectations. Those live on Pipeline Entries (spec 0004, gated by 0005).
- Soft-delete of executives — deletion is not exposed in MVP UI.

## Open questions

- *(none)*

## Risks

- Duplicate executives created by sloppy data entry. Mitigation: search-before-create UX on the create form.

## References

- PRD §5 (Core Objects), §6.1 (Executive Management)
