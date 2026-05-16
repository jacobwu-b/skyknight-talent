# Interaction history

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

An executive in SkyKnight's network is typically considered for several Searches over time. Today there is no single view that answers "everything we know about our history with this person." The new app captures Interactions (spec 0006) and Pipeline Entries (spec 0004) — this spec stitches them into a single chronological view on the Executive detail page.

## Goals

- A user opening an Executive can see, in one place, every Search the executive has been in and every Interaction logged with them.
- The view respects comp access — Associates see Pipeline Entries without comp values.

## Non-goals

- Editing Interactions or Pipeline Entries from this view (each has its own edit surface).
- Filtering / search within the history (MVP scope — punt to v1.1).
- Showing Interactions for *other* executives that share a Pipeline Entry context.

## Users / actors

- Authenticated Partner or Associate viewing an Executive detail page.

## Acceptance criteria

- [ ] The Executive detail page renders an "Interaction history" section (tab or scroll target) listing every Interaction for this executive in reverse-chronological order.
- [ ] Each Interaction row shows: timestamp, direction (inbound/outbound — derived from sender), the sending Partner or Associate, subject line, and a one-line excerpt.
- [ ] The same view shows a "Searches" list: every Pipeline Entry for this executive across all Searches, with portfolio company, role title, stage, owner, and (Partner only) comp values.
- [ ] When viewed by an Associate, comp values are absent from every Pipeline Entry row — same enforcement path as spec 0005.
- [ ] Empty state ("no interactions yet") is rendered when appropriate.

## Approach

- A composite query loads Interactions and Pipeline Entries for the executive in one round-trip.
- Comp redaction is applied by the data layer per spec 0005.

## Out of scope

- A unified Interaction-and-stage timeline merging both event types (kept as two adjacent sections in MVP).

## Open questions

- *(none)*

## Risks

- Performance on executives with many Interactions. Mitigation: cap initial render at 50 Interactions with a "load more" affordance — acceptable for MVP scale (PRD §7: 10k executives, low per-executive volume expected).

## References

- PRD §6.1 (Executive Management)
- Spec 0005 (Comp Access Control)
- Spec 0006 (Email Ingestion)
