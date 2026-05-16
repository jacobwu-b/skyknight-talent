# Duplicate outreach alerts

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

The most common failure mode SkyKnight reports is two Partners contacting the same executive about overlapping searches with no coordination, damaging the firm's reputation with senior talent. Spec 0006 captures outreach as Interactions; this spec uses that data to alert Partners *as they BCC*, and to surface the same information in the Monday digest.

## Goals

- A Partner BCC'ing an executive who has been contacted by another Partner in the last 14 days receives an automated, informative email reply.
- The alert is informational — outreach itself is never blocked.
- The Monday digest (spec 0008) includes a top-of-email callout summarizing the week's duplicates.

## Non-goals

- Detecting duplicates across Searches at the same firm with the same Partner — that's coordination, not duplication.
- Real-time UI notifications inside the app.
- Reversing or "un-sending" duplicate outreach.

## Users / actors

- **Detector:** the system, on every new Interaction created via the ingestion webhook (spec 0006).
- **Recipient:** the Partner who just BCC'd the tracking address.

## Acceptance criteria

- [ ] On every new Interaction whose sender role is `partner`, the system checks for any *other* Interaction with the same Executive in the last 14 days where the sender was a *different* Partner.
- [ ] If at least one match is found, the system sends an automated email to the new Interaction's sender containing: the other Partner's name, the date of the other Interaction, and the Search context (which Search(es) the executive is in pipeline for).
- [ ] The alert email is sent from the same outbound address used by the Monday digest, with a clear subject like "Heads up: [Other Partner] also contacted [Executive] recently."
- [ ] The alert never blocks or modifies the original outreach.
- [ ] Each detected duplicate is recorded on a `duplicate_alerts` row (with both Interaction IDs and the partners involved) so the digest builder (spec 0008) can render the weekly callout.
- [ ] The 14-day window is a single configurable constant in code — not hardcoded in 3 places.

## Approach

- Detector runs synchronously after the ingestion webhook writes the Interaction (or async via a job — provider-dependent).
- Records both the alert and a reference to both Interactions.
- Outbound email goes via the same transactional-email provider as the digest.

## Out of scope

- Detecting duplicates from manually-entered Interactions in MVP — only ingestion-driven. (Manual entry is a thin path; PRD §6.5 calls out "populated automatically from BCC'd email or manually added", but the alert is most valuable on the auto path.)
- Calibrating the 14-day window against historical data — PRD §10 question 3. Resolved during spec authoring: keep 14 days as the configurable constant.

## Open questions

- *(none)*

## Risks

- Email floods if a single executive receives many Partner contacts in 14 days. Mitigation: dedupe alerts per (recipient_partner, contacted_executive) pair within a 24-hour window — at most one alert per day per pair.

## References

- PRD §6.6 (Duplicate Outreach Visibility), §6.7 (Monday Digest)
