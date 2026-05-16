# DealCloud export

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

SkyKnight maintains DealCloud as a downstream system of record for compliance reasons but does not want to integrate with its API or live-sync to it. Ops runs a quarterly export to DealCloud manually and needs the new app to produce a CSV in a DealCloud-compatible shape.

## Goals

- Any authenticated user can trigger a CSV download of all open Pipeline Entries.
- The CSV is flat (one row per Pipeline Entry) and column-ordered for DealCloud's importer.
- The export respects the comp access boundary — an Associate-triggered export omits comp columns.

## Non-goals

- Live API integration with DealCloud.
- Scheduled exports.
- Filtering / parameterization beyond "all open Pipeline Entries."
- Importing *from* DealCloud back into the app.

## Users / actors

- Authenticated Partner or Associate.

## Acceptance criteria

- [ ] A button (or menu item) in the web UI labeled "Export to DealCloud (CSV)" triggers a streaming download.
- [ ] The CSV includes one row per Pipeline Entry where `stage ∉ {placed, passed}`.
- [ ] Columns: executive name, executive email, portfolio company, role title, search status, pipeline stage, owner name, last contact date, and (Partner only) base salary, target bonus, equity percentage.
- [ ] When triggered by an Associate, the comp columns are absent from the file header and every row — not blank, not zero, *absent*. Same enforcement path as spec 0005.
- [ ] CSV is well-formed: RFC 4180 quoting, UTF-8, `\r\n` line endings, header row first.

## Approach

- A server route streams CSV rows to the response with the correct MIME type.
- Underlying query goes through the same comp-guarded repository from spec 0005.

## Out of scope

- A DealCloud column schema sign-off — Ops will validate against an actual DealCloud import sandbox at rollout.
- Exporting historical (closed) Pipeline Entries.

## Open questions

- Final DealCloud column header names. Resolved during spec authoring: use snake_case English column names; Ops can post-process if DealCloud requires exact-match headers.

## Risks

- A future column-rename in the underlying schema silently breaks DealCloud import. Mitigation: a snapshot test of the CSV header row makes any change visible at PR review.

## References

- PRD §6.8 (DealCloud Export)
- Spec 0005 (Comp Access Control)
