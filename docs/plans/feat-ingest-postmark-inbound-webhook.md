# Plan: feat/ingest-postmark-inbound-webhook

> Tier: Significant
> Spec: docs/specs/0006-email-ingestion.md
> ADR: docs/decisions/0004-inbound-email-ingestion.md
> Linear: J-67
> Author: @jacobwu-b
> Status: proposed

## Branch

`feat/ingest-postmark-inbound-webhook`

## What

Accept Postmark Inbound webhook deliveries at `/api/inbound`, verify the signature, match the recipient to an Executive, and write an Interaction (attaching to every open Pipeline Entry, or to the Executive directly when none exist). Unmatched mail lands in a new `unmatched_inbound` triage queue; duplicate deliveries are no-ops.

## Files

- `src/lib/db/schema.ts` — add `unmatched_inbound` table (raw payload jsonb, parsed fields, dedup on `MessageID`).
- `db/migrations/0002_*.sql` + `.down.sql` — generated migration for the new table.
- `src/lib/inbound.ts` — Postmark payload Zod schema, signature verification, parser, matcher, dispatch (the testable core).
- `src/lib/inbound.test.ts` — unit tests covering all five branches + idempotency.
- `src/app/api/inbound/route.ts` — POST handler: signature check, parse, dispatch, response codes.
- `src/app/api/inbound/route.test.ts` — auth/parsing surface + happy path.
- `src/lib/inbound.fixtures.ts` — minimal Postmark payload fixture factory.

## Approach

- One-shot endpoint: read raw body for signature verification, parse JSON, dispatch. All persistence lives in `src/lib/inbound.ts` so the route stays a thin shell.
- Matcher takes the `To[]` envelope (excluding the tracking mailbox itself), looks up Executives by email case-insensitively. Single match → attach to all open pipeline entries (stage NOT IN `placed`/`passed`) for that exec, or attach directly to the exec if none open. Multiple matches → most-recently-updated, with `notes` flagging ambiguity. No match → `unmatched_inbound` row.
- Idempotency: rely on the existing `executive_interactions_postmark_message_id_unique` index *plus* a unique index on `unmatched_inbound.postmark_message_id`. Catch `23505` on insert and treat as a no-op success.
- Body excerpt is truncated to 500 chars before any storage; never logged.
- Signature: Postmark Inbound exposes a basic-auth pattern; ADR specifies a shared secret. Use a constant-time compare against `POSTMARK_INBOUND_WEBHOOK_SECRET` from a custom header (`X-Postmark-Webhook-Secret`) — keeps the surface simple and matches the env var already declared in `env-schema.ts`.

## Tests

- `src/lib/inbound.test.ts`:
  - invalid signature → reject
  - payload missing `MessageID` → reject as malformed
  - single-exec match with open pipeline entries → interactions on every open entry
  - single-exec match with no open entries → one interaction directly on the exec
  - multiple exec matches → most-recently-updated wins, `notes` flags ambiguity
  - no match → `unmatched_inbound` row with raw payload preserved
  - duplicate `MessageID` → no duplicate interaction inserted
- `src/app/api/inbound/route.test.ts`:
  - bad signature → 401
  - malformed body → 400
  - happy path → 200

## Manual steps

- Apply migration `0002_*` in each environment via `pnpm db:migrate`.
- Configure Postmark Inbound stream to POST to `/api/inbound` with header `X-Postmark-Webhook-Secret: $POSTMARK_INBOUND_WEBHOOK_SECRET` (Postmark supports custom headers per inbound stream).

---

## Significant-tier additions

### Blast radius

- New schema object (`unmatched_inbound`) — additive, no existing data touched.
- New public route `/api/inbound` — unauthenticated by session (provider-shared-secret only). No other route depends on it.
- Reads from `executives`, `pipeline_entries`; writes to `executive_interactions`, `unmatched_inbound`. No reads/writes of comp fields.
- Runtime: Vercel serverless. No state outside Postgres.

### Risks / open questions

- Postmark `To` payload shape: ADR-0004 references `From`/`To`/`Cc`/`Bcc`. Postmark Inbound puts BCC recipients into `BccFull` only when present in the envelope; otherwise `ToFull` is the truth. Matcher walks both, excluding the tracking mailbox.
- Body excerpt could contain comp numbers (Partner forwarding an offer letter). Spec acknowledges this; the excerpt remains a non-comp field per spec 0005. Eval task to be filed under J-68 / J-69.
- Signature scheme choice: shared-secret header instead of Postmark's basic auth. Either is acceptable per ADR; secret header is simpler and the env var is already declared.

### ADR

`docs/decisions/0004-inbound-email-ingestion.md` — already approved.
