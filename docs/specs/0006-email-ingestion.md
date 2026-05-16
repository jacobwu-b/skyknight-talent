# Email ingestion (BCC workflow)

> Status: approved
> Owner: @jacobwu-b
> Last updated: 2026-05-15

## Problem

Partners live in Outlook and have rejected interfaces that require them to log activity manually. To capture outreach without behavior change, the system must accept BCC'd emails at `search@skyknightcapital.com`, match the recipient to an Executive, and write an Interaction. Without this, the Monday digest cannot show "last contact" and Partners will continue to drop pipeline visibility.

## Goals

- A Partner BCC'ing the tracking address produces an Interaction row tied to the matched Executive.
- Inbound mail with no matching Executive goes to a queue an Associate can triage — never silently dropped, never auto-creates an Executive.
- The webhook is resilient to duplicate deliveries (provider retries).

## Non-goals

- Parsing email bodies for content, sentiment, or attendees beyond the To/From/Subject envelope.
- Replying to or threading with candidates from the app.
- Archiving full email bodies — only the first ~500 characters are stored (PRD §6.5).
- Outbound email from the app (handled in 0007 and 0008).

## Users / actors

- **Inbound:** an external email provider (Postmark, SendGrid Inbound Parse, AWS SES — chosen in the stack ADR) POSTing to a webhook.
- **Triage:** an Associate reviewing the Unmatched Inbound queue.

## Acceptance criteria

- [ ] Webhook endpoint accepts the provider's inbound payload, verifies a signature/secret, and returns 200 on success.
- [ ] On a verified inbound: extract `from`, `to[]`, `timestamp`, `subject`, and first ~500 characters of body.
- [ ] If a single Executive matches `to` by email, create an Interaction attached to every *open* Pipeline Entry for that Executive (stage ≠ `placed`, `passed`). If no open Pipeline Entries exist, attach the Interaction to the Executive directly with no pipeline link.
- [ ] If multiple Executives match (shared email — unusual), pick the most-recently-updated and flag the Interaction with a `notes` field indicating the ambiguity.
- [ ] If no Executive matches, create a row in the Unmatched Inbound queue with the same parsed fields and the raw payload reference.
- [ ] An Associate UI lists unmatched inbound rows; Associate can either assign to an existing Executive (which creates an Interaction post-hoc) or dismiss with a reason. **No path auto-creates a new Executive from inbound mail.**
- [ ] Idempotency: a webhook delivery with the same provider message-ID does not create duplicate Interactions on retry.

## Approach

- Webhook route handles signature verification, parsing, and dispatch.
- Matcher is a single function: `match_executive_by_email(to_addresses[]) -> Executive | null | Ambiguous`.
- Unmatched rows live in their own `unmatched_inbound` table with the raw payload (or a reference to provider storage) for re-processing.

## Out of scope

- Reply-to-the-mailbox handling. PRD §10 question 2 resolved: bounces and replies sent *to* `search@skyknightcapital.com` get an auto-reply ("this is a tracking address, please contact the partner directly") — implemented as a mailbox-side rule, not in the app.

## Open questions

- *(none — provider selection happens in the stack ADR.)*

## Risks

- Provider-specific quirks (HTML vs text, attachment behavior, header casing). Mitigation: parse against fixture payloads from the chosen provider; do not over-generalize.
- Comp-bearing emails accidentally landing in the body excerpt. Mitigation: the 500-char excerpt is treated as a non-comp field and visible to Associates; flag in spec 0005 eval task that comp must never travel through this path.

## References

- PRD §6.5 (Email Ingestion)
- `docs/decisions/0004-inbound-email-ingestion.md`
