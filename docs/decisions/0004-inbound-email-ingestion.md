# ADR-0004: Inbound email ingestion via Postmark

> Status: proposed
> Date: 2026-05-15
> Deciders: @jacobwu-b

## Context

Spec 0006 requires the system to accept BCC'd emails at `search@skyknightcapital.com` and turn them into Interaction rows. Partners must change zero behavior — they keep emailing from Outlook and BCC the tracking address.

The mechanism options are:

- A vendor "inbound parse" webhook (Postmark, SendGrid, Mailgun, AWS SES).
- A self-hosted IMAP poller.
- A serverless function reading from a managed mailbox (Microsoft Graph against the SkyKnight tenant).

Constraints from spec 0006 and PRD §7:

- Webhook deliveries must be idempotent (provider retries).
- Signature verification is required.
- No long-lived workers — the app is serverless (per ADR-0002).
- Zero DevOps headcount.

ADR-0002 selected Postmark for *outbound* transactional email already.

## Decision

We will use **Postmark Inbound Streams** for email ingestion.

- A dedicated inbound stream forwards `search@skyknightcapital.com` to a Postmark-managed address.
- Postmark POSTs parsed JSON to `/api/inbound` on the Next.js app.
- The webhook handler verifies the Postmark signature, extracts `From`, `To`, `Cc`, `Bcc`, `Subject`, `TextBody` (truncated to ~500 chars), and `MessageID`.
- Idempotency is enforced by storing `MessageID` on the Interaction row and treating duplicate `MessageID` arrivals as no-ops.
- Mail received with no matching Executive goes to the `unmatched_inbound` table for Associate triage (spec 0006).

We will *not* attempt richer parsing (thread reconstruction, attachment storage, body deduplication) in MVP — explicit non-goals in PRD §3 and spec 0006.

## Consequences

**Positive**
- Same vendor as outbound (ADR-0002): one account, one set of credentials, one set of webhooks.
- Postmark's signature scheme and message-ID guarantees are documented and stable.
- No long-running infrastructure — fits the serverless model.

**Negative**
- Vendor lock-in. Migration to SES or Mailgun later requires re-mapping payload fields.
- Cost scales with inbound volume; trivial at MVP scale.

**Neutral**
- The BCC mailbox itself (`search@skyknightcapital.com`) is administered by SkyKnight IT, not us. PRD §10 open question 2 on bounces/replies is resolved by a mailbox-side auto-responder rule, not in-app handling.

## Alternatives considered

### A: SendGrid Inbound Parse

Comparable functionality. Rejected because we're already on Postmark for outbound; adding a second vendor doubles credential surface area.

### B: Microsoft Graph subscription to the SkyKnight tenant mailbox

Tightest integration with the existing Microsoft 365 setup, but requires admin consent in the SkyKnight Entra tenant, push subscriptions that need renewal, and a notification endpoint that survives Vercel cold starts. The operational overhead is wrong for an MVP with zero DevOps headcount.

### C: IMAP polling from a Vercel cron job

Long-known fragile pattern. Rejected for the reasons in ADR-0002.

## References

- PRD §6.5 (Email Ingestion), §3 (Non-Goals — AI/NLP parsing excluded)
- `docs/specs/0006-email-ingestion.md`
- `docs/decisions/0002-stack-and-infra.md`
