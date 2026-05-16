# ADR-0002: Stack and infrastructure for the MVP

> Status: proposed
> Date: 2026-05-15
> Deciders: @jacobwu-b

## Context

The PRD (v1.0) explicitly defers the stack and infrastructure decisions to a companion design document. Without that decision, no implementation unit can start — every downstream unit either reads, writes, deploys, or sends from infrastructure that doesn't exist yet.

The non-functional constraints from PRD §7 narrow the field:

- **Scale:** 10k executives, 200 active Searches, 20 concurrent users. Small.
- **Availability:** Business hours, single region. No HA requirement.
- **Operations:** *Zero dedicated DevOps headcount.* Managed services only.
- **Security:** SSO mandatory in production (simulated for MVP, per spec 0001); comp access enforced at data layer; TLS everywhere.
- **Backup:** Daily point-in-time, 30-day retention.

Three integration shapes recur across the specs:

1. **Inbound email parsing** — a webhook from a provider that accepts `search@skyknightcapital.com` (spec 0006).
2. **Transactional outbound email** — duplicate-outreach alerts and the Monday digest (specs 0007, 0008).
3. **Scheduled jobs** — the Monday 6 AM PT digest send (spec 0008).

The team has no in-house DevOps engineer, so a Heroku-style "git push and forget" deploy target is load-bearing, not a nice-to-have.

## Decision

We will use the following stack:

- **Framework:** Next.js (App Router) with TypeScript. Single deployable handling UI, API routes, and scheduled jobs.
- **Database:** Postgres on a managed provider (Neon or Supabase) — both offer point-in-time backup and meet PRD §7 backup requirements out of the box.
- **Hosting:** Vercel for the Next.js app. Free or Pro tier covers the MVP scale.
- **Scheduled jobs:** Vercel Cron for the Monday digest (spec 0008).
- **Inbound email:** Postmark Inbound Streams (webhook to `/api/inbound`). Postmark's signature scheme and idempotent message IDs are straightforward and well-documented.
- **Outbound email:** Postmark Transactional. Same provider as inbound keeps the integration surface area minimal.
- **Secrets:** Vercel environment variables, mirrored to `.env.example` per CLAUDE.md §6 invariant.
- **ORM:** Drizzle (TypeScript-first, lightweight migrations).

The simulated profile picker (spec 0001) means we do **not** need an SSO integration for MVP; we explicitly defer Entra integration to post-MVP.

## Consequences

**Positive**
- Every infrastructure surface is managed; no servers to babysit.
- Single language (TypeScript) and single deployable across web, API, jobs.
- Postmark handles both inbound and outbound, keeping vendors minimal.

**Negative**
- Vercel + Neon/Supabase are commercial managed services with recurring cost; small at MVP scale but real.
- Vercel Cron has limited observability; Monday digest reliability depends on it. Mitigation in spec 0008 (manual "send now" admin button as recovery).
- Drizzle is less mature than Prisma; chosen for TS-first ergonomics and lighter footprint.

**Neutral**
- App and jobs share a deployment, which couples their release cadence — acceptable at this scale.

## Alternatives considered

### A: Rails + Heroku + SendGrid

Mature, conventional, fast to build. Rejected because the team has stronger TypeScript familiarity, and Heroku's pricing and dyno-sleep behavior have degraded since the Salesforce acquisition.

### B: Python (FastAPI) + Postgres + AWS Lambda

Strong fit for backend workloads but front-end work would need a separate React app, doubling the build surface for an MVP with a small UI. Rejected to keep the stack unified.

### C: Build inbound parsing in-app via IMAP polling

Avoids a third-party inbound vendor. Rejected — polling IMAP is fragile, hard to make idempotent, and requires running a long-lived worker, which conflicts with Vercel's serverless model.

### D: Postgres-on-Vercel (Vercel Postgres)

Considered but Neon and Supabase have richer free tiers and more mature point-in-time backup. We will revisit if pricing becomes a concern.

## References

- PRD §7 (Non-Functional Requirements), §6.5 (Email Ingestion), §6.7 (Monday Digest)
- `docs/specs/0006-email-ingestion.md`, `docs/specs/0008-monday-digest.md`
- `CLAUDE.md` §1, §6
