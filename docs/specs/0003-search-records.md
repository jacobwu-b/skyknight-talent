# Search records

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

A "Search" is the unit of work in SkyKnight's executive search practice: one C-suite role at one portfolio company. Today, the team tracks active searches in a verbal-and-spreadsheet hybrid that none of the partners trusts. The app needs a first-class Search object so Pipeline Entries (spec 0004) and the Monday digest (spec 0008) have something concrete to attach to.

## Goals

- Any authenticated user can create a Search and see all Searches.
- A Search has an unambiguous status: Open, Filled, or Paused.
- A Search detail page is the entry point for adding candidates and walking them through stages.

## Non-goals

- Configurable pipeline stages — stages are fixed (per spec 0004).
- Hiring manager objects with their own records — `hiring_manager` is a free-text field on the Search in MVP.
- Search assignment / staffing of internal Partners or Associates to the Search itself (per-candidate ownership lives on the Pipeline Entry).

## Users / actors

- Authenticated Partner (typical) or Associate.

## Acceptance criteria

- [ ] Fields stored per Search: `portfolio_company`, `role_title`, `hiring_manager` (text), `status` (`open` | `filled` | `paused`), timestamps.
- [ ] A create form persists a new Search with status defaulting to `open`.
- [ ] A list view groups Searches by portfolio company and shows status.
- [ ] A detail view shows the Search header plus Pipeline Entries grouped by stage (per spec 0004).
- [ ] An edit form lets any user change `role_title`, `hiring_manager`, and `status`.
- [ ] Status transitions are validated: `open` ↔ `paused`, and either → `filled`. Once `filled`, the Search becomes read-only in the UI but is not deleted.

## Approach

- Standard CRUD against a `searches` table.
- Detail view composes data from spec 0004 (Pipeline Entries grouped by stage).

## Out of scope

- Closing a Search with a "winner" Pipeline Entry — the Pipeline Entry's `placed` stage is the source of truth; no cross-link required in MVP.
- A wins / placements report — see PRD §10 open question, deferred.

## Open questions

- *(none — open questions resolved: Filled searches remain visible read-only; archival is post-MVP.)*

## Risks

- Duplicate Searches for the same role. Mitigation: list view sorted by portfolio company surfaces these visually; no automated dedupe.

## References

- PRD §5 (Core Objects), §6.2 (Search Management)
